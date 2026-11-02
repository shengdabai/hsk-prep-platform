import assert from "node:assert/strict";
import test from "node:test";

import { createAnswerSaver } from "./answer-saver";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

test("flush waits for a save that is still on its way", async () => {
  const slow = deferred<boolean>();
  const saver = createAnswerSaver(() => slow.promise, () => {});
  void saver.save("q1", "A");

  let flushed = false;
  const flush = saver.flush().then((left) => {
    flushed = true;
    return left;
  });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(flushed, false);

  slow.resolve(true);
  assert.equal(await flush, 0);
});

test("flush retries a failed save and reports what stays unsaved", async () => {
  const sent: string[] = [];
  let working = false;
  const saver = createAnswerSaver(async (itemId, value) => {
    sent.push(`${itemId}=${value}`);
    return working;
  }, () => {});

  await saver.save("q1", "A");
  assert.equal(await saver.flush(), 1);

  working = true;
  assert.equal(await saver.flush(), 0);
  assert.deepEqual(sent, ["q1=A", "q1=A", "q1=A"]);
});

test("a save that throws counts as unsaved", async () => {
  const saver = createAnswerSaver(() => Promise.reject(new Error("offline")), () => {});
  await saver.save("q1", "A");
  assert.equal(await saver.flush(), 1);
});

test("an old failure does not bring back an answer the user changed", async () => {
  const first = deferred<boolean>();
  const replies = [first.promise, Promise.resolve(true)];
  const sent: string[] = [];
  const saver = createAnswerSaver((_itemId, value) => {
    sent.push(value);
    return replies.shift() ?? Promise.resolve(true);
  }, () => {});

  void saver.save("q1", "A");
  await saver.save("q1", "B");
  first.resolve(false);

  assert.equal(await saver.flush(), 0);
  assert.deepEqual(sent, ["A", "B"]);
});

test("the unsaved list reaches the page as it changes", async () => {
  const seen: Array<Record<string, string>> = [];
  let working = false;
  const saver = createAnswerSaver(async () => working, (unsaved) => seen.push(unsaved));

  await saver.save("q1", "A");
  working = true;
  await saver.flush();

  assert.deepEqual(seen, [{ q1: "A" }, {}]);
});
