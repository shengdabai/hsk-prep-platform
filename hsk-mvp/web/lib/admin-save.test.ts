import assert from "node:assert/strict";
import test from "node:test";

import { MAX_SAVE_ITEMS, planSave, sanitizeQuestion } from "./admin-save";

// Shape the generator prompt asks DeepSeek for (lib/ai-generate.ts), with fixture text.
const generated = {
  id: "AI_GEN_FIXTURE", title: "Fixture title", level: "HSK1", section: "阅读", part: 1, kind: "fill_blank",
  prompt: "Fixture prompt", context: null, visualHint: null,
  options: [{ id: "A", label: "A", text: "one" }, { id: "B", label: "B", text: "two" }],
  answer: "A", explanation: "Fixture explanation", estimatedSeconds: 30, vocabFocus: ["fixture"],
  sourceType: "original", reviewStatus: "pending", publishStatus: "draft", copyrightStatus: "cleared",
  tags: ["hsk1", "ai-generated"],
};

test("a generated item is kept and forced to pending review and draft", () => {
  const saved = sanitizeQuestion({ ...generated, reviewStatus: "approved", publishStatus: "published", injected: "<script>" });
  assert.ok(saved);
  assert.equal(saved.reviewStatus, "pending");
  assert.equal(saved.publishStatus, "draft");
  assert.equal("injected" in saved, false);
  assert.equal("context" in saved, false); // null optional fields are dropped, not stored
});

test("matching answers are an ordering; other kinds must name an option", () => {
  assert.ok(sanitizeQuestion({ ...generated, kind: "matching", answer: "2,1" }));
  assert.equal(sanitizeQuestion({ ...generated, answer: "Z" }), null);
  assert.equal(sanitizeQuestion({ ...generated, kind: "matching", answer: "A" }), null);
});

test("malformed items are rejected", () => {
  for (const bad of [null, [], "x", { ...generated, level: "HSK2" }, { ...generated, part: 5 },
    { ...generated, options: [{ id: "A", label: "A" }] }, { ...generated, options: [] },
    { ...generated, estimatedSeconds: Number.NaN }, { ...generated, tags: [1] },
    { ...generated, prompt: "x".repeat(2001) }, { ...generated, copyrightStatus: "unknown" }]) {
    assert.equal(sanitizeQuestion(bad), null);
  }
});

test("a save request with nothing valid is an error, never a fall-through", () => {
  for (const input of [undefined, null, [], {}, "x", [{ id: "only-id" }]]) {
    assert.equal(planSave(input).ok, false);
  }
  assert.equal(planSave(Array.from({ length: MAX_SAVE_ITEMS + 1 }, () => generated)).ok, false);
  const plan = planSave([generated, { id: "broken" }]);
  assert.ok(plan.ok);
  assert.equal(plan.items.length, 1);
  assert.equal(plan.skipped, 1);
});

test("a matching answer must be a permutation of 1..n for n options", () => {
  const options = [1, 2, 3].map((n) => ({ id: String(n), label: String(n), text: `item ${n}` }));
  const matching = { ...generated, kind: "matching", options };
  assert.equal(sanitizeQuestion({ ...matching, answer: "3, 1, 2" })?.answer, "3,1,2");
  for (const answer of ["1,2", "1,1,2", "0,1,2", "99,99,99", "1,2,4", "1,2,3,4"]) {
    assert.equal(sanitizeQuestion({ ...matching, answer }), null, answer);
  }
});

test("duplicate option ids are rejected", () => {
  assert.equal(sanitizeQuestion({ ...generated, options: [{ id: "A", label: "A", text: "x" }, { id: "A", label: "B", text: "y" }] }), null);
});

test("ids already in the bank or repeated in the batch are skipped", () => {
  const plan = planSave([generated, { ...generated }, { ...generated, id: "AI_GEN_NEW" }], new Set(["AI_GEN_OLD"]));
  assert.ok(plan.ok);
  assert.deepEqual(plan.items.map((q) => q.id), ["AI_GEN_FIXTURE", "AI_GEN_NEW"]);
  assert.equal(plan.skipped, 1);
  assert.equal(planSave([generated], new Set([generated.id])).ok, false);
});

test("every shape the generator prompt describes is accepted", () => {
  const opts = (ids: string[], text = (id: string) => `option ${id}`) => ids.map((id) => ({ id, label: id, text: text(id) }));
  const samples = [
    { kind: "image_true_false", options: opts(["A", "B"], (id) => (id === "A" ? "√" : "×")), answer: "B" },
    { kind: "single_choice", options: opts(["A", "B", "C"]), answer: "C" },
    { kind: "fill_blank", options: opts(["A", "B", "C", "D"]), answer: "D" },
    { kind: "matching", options: opts(["1", "2", "3", "4", "5"]), answer: "3,1,4,2,5" },
  ];
  for (const sample of samples) assert.ok(sanitizeQuestion({ ...generated, ...sample }), sample.kind);
});
