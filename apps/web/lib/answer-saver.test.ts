import assert from "node:assert/strict";
import test from "node:test";

import { answersToRestore, createAnswerSaver, type SaveResult } from "./answer-saver";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const tick = () => new Promise((r) => setTimeout(r, 5));

test("flush waits for a save that is still on its way", async () => {
  const slow = deferred<SaveResult>();
  const saver = createAnswerSaver(() => slow.promise, () => {});
  void saver.save("q1", "A");

  let flushed = false;
  const flush = saver.flush().then((left) => {
    flushed = true;
    return left;
  });
  await tick();
  assert.equal(flushed, false);

  slow.resolve("saved");
  assert.equal(await flush, 0);
});

test("flush retries a failed save and reports what stays unsaved", async () => {
  const sent: string[] = [];
  let reply: SaveResult = "retry";
  const saver = createAnswerSaver(async (itemId, value) => {
    sent.push(`${itemId}=${value}`);
    return reply;
  }, () => {});

  await saver.save("q1", "A");
  assert.equal(await saver.flush(), 1);

  reply = "saved";
  assert.equal(await saver.flush(), 0);
  assert.deepEqual(sent, ["q1=A", "q1=A", "q1=A"]);
});

test("a save that throws counts as unsaved", async () => {
  const saver = createAnswerSaver(() => Promise.reject(new Error("offline")), () => {});
  await saver.save("q1", "A");
  assert.equal(await saver.flush(), 1);
});

test("the newest choice is written last, even when the first save is slow", async () => {
  const first = deferred<SaveResult>();
  const written: string[] = [];
  const saver = createAnswerSaver(async (_itemId, value) => {
    if (value === "A") await first.promise;
    written.push(value);
    return "saved";
  }, () => {});

  void saver.save("q1", "A");
  await tick(); // A has left.
  void saver.save("q1", "B");
  await tick();
  assert.deepEqual(written, []); // B waits for A, so A cannot land after B.

  first.resolve("saved");
  assert.equal(await saver.flush(), 0);
  assert.deepEqual(written, ["A", "B"]);
});

test("a choice replaced before it left is never sent", async () => {
  const first = deferred<SaveResult>();
  const sent: string[] = [];
  const saver = createAnswerSaver((_itemId, value) => {
    sent.push(value);
    return value === "A" ? first.promise : Promise.resolve<SaveResult>("saved");
  }, () => {});

  void saver.save("q1", "A");
  await tick(); // A has left.
  void saver.save("q1", "B");
  void saver.save("q1", "C");
  await tick();
  first.resolve("saved");
  await saver.flush();

  assert.deepEqual(sent, ["A", "C"]);
});

test("an old failure does not bring back an answer the user changed", async () => {
  const first = deferred<SaveResult>();
  const sent: string[] = [];
  const saver = createAnswerSaver((_itemId, value) => {
    sent.push(value);
    return value === "A" ? first.promise : Promise.resolve<SaveResult>("saved");
  }, () => {});

  void saver.save("q1", "A");
  await tick(); // A has left.
  void saver.save("q1", "B");
  await tick();
  first.resolve("retry");

  assert.equal(await saver.flush(), 0);
  assert.deepEqual(sent, ["A", "B"]);
});

test("different questions do not wait for each other", async () => {
  const hung = deferred<SaveResult>();
  const sent: string[] = [];
  const saver = createAnswerSaver((itemId) => {
    sent.push(itemId);
    return itemId === "q1" ? hung.promise : Promise.resolve<SaveResult>("saved");
  }, () => {});

  void saver.save("q1", "A");
  await saver.save("q2", "B");
  assert.deepEqual(sent, ["q1", "q2"]);
  hung.resolve("saved");
  await saver.flush();
});

test("settle stops waiting for a request that never ends", async () => {
  const saver = createAnswerSaver(() => new Promise<SaveResult>(() => {}), () => {});
  void saver.save("q1", "A");

  const started = Date.now();
  assert.equal(await saver.settle(30), 1);
  assert.ok(Date.now() - started < 1000);
  assert.equal(saver.unconfirmed(), 1);
});

test("a refused answer is not retried and stays unconfirmed", async () => {
  const sent: string[] = [];
  const saver = createAnswerSaver(async (_itemId, value) => {
    sent.push(value);
    return "refused";
  }, () => {});

  await saver.save("q1", "A");
  assert.equal(await saver.flush(), 0);
  assert.equal(await saver.settle(30), 0);
  assert.deepEqual(sent, ["A"]);
  assert.equal(saver.open(), 0);
  assert.equal(saver.unconfirmed(), 1);
});

test("answers restored after a reload are sent by flush", async () => {
  const sent: string[] = [];
  const saver = createAnswerSaver(async (itemId, value) => {
    sent.push(`${itemId}=${value}`);
    return "saved";
  }, () => {}, { q1: "B" });

  assert.equal(saver.unconfirmed(), 1);
  assert.equal(await saver.flush(), 0);
  assert.equal(saver.unconfirmed(), 0);
  assert.deepEqual(sent, ["q1=B"]);
});

test("only answers the server lacks need restoring", () => {
  assert.deepEqual(
    answersToRestore({ q1: "A", q2: "B", q3: "C" }, { q1: "A", q2: "X" }),
    { q2: "B", q3: "C" },
  );
  assert.deepEqual(answersToRestore({}, { q1: "A" }), {});
});

test("the unsaved list reaches the page as it changes", async () => {
  const seen: Array<Record<string, string>> = [];
  let reply: SaveResult = "retry";
  const saver = createAnswerSaver(async () => reply, (unsaved) => seen.push(unsaved));

  await saver.save("q1", "A");
  reply = "saved";
  await saver.flush();

  assert.deepEqual(seen, [{ q1: "A" }, {}]);
});
