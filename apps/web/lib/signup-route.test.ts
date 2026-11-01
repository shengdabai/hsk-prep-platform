import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

import { getRepository } from "@hsk/db";

import { POST } from "../app/api/auth/signup/route";
import { sessionCookie } from "./auth-cookies";

// No Supabase env in tests, so the route and this file share the in-memory repository.
const repo = getRepository();

function signup(email: string, ip: string) {
  return POST(
    new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ email, password: "fixture-pass-1", fullName: "Fixture" }), // gitleaks:allow (test fixture, not a secret)
    }),
  );
}

// The old two-step write (profile, then password) could leave a profile without a credential.
function forbidTwoStepWrite(t: TestContext) {
  for (const name of ["upsertUser", "setPasswordHash"] as const) {
    t.mock.method(repo, name, async () => {
      throw new Error(`signup must not call ${name}`);
    });
  }
}

test("signup stores profile and credential with one createUserWithPassword call", async (t) => {
  forbidTwoStepWrite(t);
  const create = t.mock.method(repo, "createUserWithPassword");
  const email = "signup-route-ok@example.invalid";

  const response = await signup(email, "203.0.113.10");

  assert.equal(response.status, 200);
  assert.equal(create.mock.callCount(), 1);
  assert.match(response.headers.get("set-cookie") ?? "", new RegExp(`${sessionCookie}=`));
  const user = await repo.findUserByEmail(email);
  assert.ok(user);
  assert.ok(await repo.getPasswordHash(user.id));
});

test("an insert conflict after the email pre-check answers 409 and issues no session", async (t) => {
  forbidTwoStepWrite(t);
  t.mock.method(repo, "createUserWithPassword", async () => null);
  const email = "signup-route-race@example.invalid";

  const response = await signup(email, "203.0.113.11");

  assert.equal(response.status, 409);
  assert.doesNotMatch(response.headers.get("set-cookie") ?? "", new RegExp(`${sessionCookie}=`));
  assert.equal(await repo.findUserByEmail(email), null);
});
