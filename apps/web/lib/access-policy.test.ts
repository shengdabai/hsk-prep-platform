import assert from "node:assert/strict";
import test from "node:test";

import type { Subscription } from "@hsk/shared";

import { examAccess, mayPatchItem } from "./access-policy";
import { formatRemaining, isPastDeadline, sessionDeadlineMs } from "./session-deadline";

const paid = { status: "active", plan: "pro" } as Subscription;
const lapsed = { status: "canceled", plan: "pro" } as Subscription;

test("a reviewer can review but cannot publish", () => {
  assert.equal(mayPatchItem("reviewer", { publishStatus: undefined }), true);
  assert.equal(mayPatchItem("reviewer", {}), true);
  assert.equal(mayPatchItem("reviewer", { publishStatus: "published" }), false);
  assert.equal(mayPatchItem("reviewer", { publishStatus: "draft" }), false);
  assert.equal(mayPatchItem("admin", { publishStatus: "published" }), true);
});

test("a free exam is open to everyone", () => {
  assert.equal(examAccess("free", false, null), "allow");
  assert.equal(examAccess("free", true, null), "allow");
});

test("a paid exam needs sign-in and an active paid plan", () => {
  assert.equal(examAccess("pro", false, paid), "sign_in");
  assert.equal(examAccess("pro", true, null), "upgrade");
  assert.equal(examAccess("pro", true, lapsed), "upgrade");
  assert.equal(examAccess("pro", true, paid), "allow");
  assert.equal(examAccess("institution", true, null), "upgrade");
});

const START = "2026-11-02T10:00:00.000Z";
const at = (seconds: number) => Date.parse(START) + seconds * 1000;

test("answers are accepted until the time limit plus a short grace period", () => {
  assert.equal(isPastDeadline(START, 60, at(3600)), false);
  assert.equal(isPastDeadline(START, 60, at(3630)), false);
  assert.equal(isPastDeadline(START, 60, at(3631)), true);
});

test("a session with no usable time limit has no deadline", () => {
  assert.equal(sessionDeadlineMs(START, 0), null);
  assert.equal(sessionDeadlineMs(START, Number.NaN), null);
  assert.equal(sessionDeadlineMs("not a date", 60), null);
  assert.equal(isPastDeadline("not a date", 60, at(99999)), false);
  assert.equal(isPastDeadline(START, 0, at(99999)), false);
});

test("the countdown reads as minutes and seconds and never goes below zero", () => {
  assert.equal(formatRemaining(61_000), "01:01");
  assert.equal(formatRemaining(500), "00:01");
  assert.equal(formatRemaining(-5000), "00:00");
  assert.equal(formatRemaining(7_200_000), "120:00");
});
