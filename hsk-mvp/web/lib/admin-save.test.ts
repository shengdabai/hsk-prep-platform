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
