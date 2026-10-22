import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { createSessionToken, verifySessionToken } from "./session";

// 测试用密钥(≥16 字符)。DEV_FALLBACK_SECRET 写在源码里,等同公开,测试中用它模拟攻击者伪造令牌。
const TEST_SECRET = "test-session-secret-0123456789abcdef";
const OTHER_SECRET = "another-session-secret-0123456789ab";
const DEV_FALLBACK_SECRET = "dev-insecure-session-secret-change-in-production-32b";
// 差 1 位不满足 ≥16 的长度要求;MIN_SECRET 是刚好满足的最短长度。
const SHORT_SECRET = "a".repeat(15);
const MIN_SECRET = "b".repeat(16);

type EnvPatch = Record<string, string | undefined>;
const env = process.env as Record<string, string | undefined>;

// 临时改写环境变量,结束后还原。session.ts 的 getSecret 每次调用都读 process.env,所以可在运行期切换。
function withEnv<T>(patch: EnvPatch, fn: () => T): T {
  const previous: EnvPatch = {};
  for (const key of Object.keys(patch)) {
    previous[key] = env[key];
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete env[key];
      } else {
        env[key] = value;
      }
    }
  }
}

function forgeToken(payload: unknown, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

const signed = { SESSION_SECRET: TEST_SECRET, NODE_ENV: "test" };

test("round trip returns uid, role and a future exp", () => {
  withEnv(signed, () => {
    const before = nowSeconds();
    const token = createSessionToken("user-1", "learner");
    const payload = verifySessionToken(token);
    assert.ok(payload);
    assert.equal(payload.uid, "user-1");
    assert.equal(payload.role, "learner");
    assert.ok(payload.exp >= before + 60 * 60 * 24 * 7);
  });
});

test("token is base64url(payload).base64url(hmac)", () => {
  withEnv(signed, () => {
    const token = createSessionToken("user-1", "admin", 60);
    assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
    const [body] = token.split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    assert.deepEqual(Object.keys(payload).sort(), ["exp", "role", "uid"]);
  });
});

test("respects a custom ttl", () => {
  withEnv(signed, () => {
    const token = createSessionToken("user-1", "learner", 120);
    const payload = verifySessionToken(token);
    assert.ok(payload);
    assert.ok(payload.exp - nowSeconds() <= 120);
    assert.ok(payload.exp - nowSeconds() > 110);
  });
});

test("rejects empty, missing and malformed tokens", () => {
  withEnv(signed, () => {
    assert.equal(verifySessionToken(null), null);
    assert.equal(verifySessionToken(undefined), null);
    assert.equal(verifySessionToken(""), null);
    assert.equal(verifySessionToken("no-dot-here"), null);
    assert.equal(verifySessionToken(".onlysig"), null);
  });
});

test("rejects a tampered payload that keeps the original signature", () => {
  withEnv(signed, () => {
    const token = createSessionToken("user-1", "learner");
    const sig = token.slice(token.lastIndexOf(".") + 1);
    const forgedBody = Buffer.from(
      JSON.stringify({ uid: "user-1", role: "admin", exp: nowSeconds() + 3600 }),
    ).toString("base64url");
    assert.equal(verifySessionToken(`${forgedBody}.${sig}`), null);
  });
});

test("rejects a tampered signature", () => {
  withEnv(signed, () => {
    const token = createSessionToken("user-1", "learner");
    const flipped = token.endsWith("A") ? `${token.slice(0, -1)}B` : `${token.slice(0, -1)}A`;
    assert.equal(verifySessionToken(flipped), null);
  });
});

test("rejects a signature of the wrong length without throwing", () => {
  withEnv(signed, () => {
    const token = createSessionToken("user-1", "learner");
    assert.equal(verifySessionToken(token.slice(0, -4)), null);
    assert.equal(verifySessionToken(`${token}AAAA`), null);
  });
});

test("rejects a token signed with a different secret", () => {
  const token = withEnv({ SESSION_SECRET: OTHER_SECRET, NODE_ENV: "test" }, () =>
    createSessionToken("user-1", "learner"),
  );
  withEnv(signed, () => {
    assert.equal(verifySessionToken(token), null);
  });
});

test("rejects an expired token", () => {
  withEnv(signed, () => {
    const token = createSessionToken("user-1", "learner", -10);
    assert.equal(verifySessionToken(token), null);
  });
});

test("rejects a correctly signed payload that has no role", () => {
  withEnv(signed, () => {
    const token = forgeToken({ uid: "user-1", exp: nowSeconds() + 3600 }, TEST_SECRET);
    assert.equal(verifySessionToken(token), null);
  });
});

test("rejects a correctly signed payload with a missing uid or a non-numeric exp", () => {
  withEnv(signed, () => {
    const noUid = forgeToken({ role: "learner", exp: nowSeconds() + 3600 }, TEST_SECRET);
    assert.equal(verifySessionToken(noUid), null);
    const badExp = forgeToken({ uid: "user-1", role: "learner", exp: "soon" }, TEST_SECRET);
    assert.equal(verifySessionToken(badExp), null);
  });
});

test("rejects a correctly signed body that is not valid JSON", () => {
  withEnv(signed, () => {
    const body = Buffer.from("not json").toString("base64url");
    const sig = createHmac("sha256", TEST_SECRET).update(body).digest("base64url");
    assert.equal(verifySessionToken(`${body}.${sig}`), null);
  });
});

test("outside production, a missing or short SESSION_SECRET falls back to the dev secret", () => {
  for (const secret of [undefined, SHORT_SECRET]) {
    withEnv({ SESSION_SECRET: secret, NODE_ENV: "development" }, () => {
      const token = createSessionToken("dev-user", "learner");
      assert.equal(verifySessionToken(token)?.uid, "dev-user");
      const sig = token.slice(token.lastIndexOf(".") + 1);
      const body = token.slice(0, token.lastIndexOf("."));
      assert.equal(sig, createHmac("sha256", DEV_FALLBACK_SECRET).update(body).digest("base64url"));
    });
  }
});

test("in production, signing without a usable SESSION_SECRET throws", () => {
  for (const secret of [undefined, "", SHORT_SECRET]) {
    withEnv({ SESSION_SECRET: secret, NODE_ENV: "production" }, () => {
      assert.throws(() => createSessionToken("user-1", "learner"), /SESSION_SECRET/);
    });
  }
});

test("in production, verifying without a usable SESSION_SECRET throws instead of using the dev secret", () => {
  const forged = forgeToken(
    { uid: "attacker", role: "admin", exp: nowSeconds() + 3600 },
    DEV_FALLBACK_SECRET,
  );
  for (const secret of [undefined, SHORT_SECRET]) {
    withEnv({ SESSION_SECRET: secret, NODE_ENV: "production" }, () => {
      assert.throws(() => verifySessionToken(forged), /SESSION_SECRET/);
    });
  }
});

test("in production with a valid SESSION_SECRET, tokens round trip and dev-secret forgeries are rejected", () => {
  withEnv({ SESSION_SECRET: TEST_SECRET, NODE_ENV: "production" }, () => {
    const token = createSessionToken("user-1", "reviewer");
    assert.deepEqual(
      { uid: verifySessionToken(token)?.uid, role: verifySessionToken(token)?.role },
      { uid: "user-1", role: "reviewer" },
    );
    const forged = forgeToken(
      { uid: "attacker", role: "admin", exp: nowSeconds() + 3600 },
      DEV_FALLBACK_SECRET,
    );
    assert.equal(verifySessionToken(forged), null);
  });
});

test("a SESSION_SECRET of exactly 16 characters is accepted, even in production", () => {
  withEnv({ SESSION_SECRET: MIN_SECRET, NODE_ENV: "production" }, () => {
    const token = createSessionToken("user-1", "learner");
    assert.equal(verifySessionToken(token)?.uid, "user-1");
  });
});
