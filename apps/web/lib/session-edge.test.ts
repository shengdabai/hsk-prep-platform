import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { createSessionToken } from "./session";
import { verifySessionTokenEdge } from "./session-edge";

// 测试用密钥(≥16 字符)。DEV_FALLBACK_SECRET 写在源码里,等同公开,测试中用它模拟攻击者伪造令牌。
const TEST_SECRET = "test-session-secret-0123456789abcdef";
const OTHER_SECRET = "another-session-secret-0123456789ab";
const DEV_FALLBACK_SECRET = "dev-insecure-session-secret-change-in-production-32b";
// 差 1 位不满足 ≥16 的长度要求;MIN_SECRET 是刚好满足的最短长度。
const SHORT_SECRET = "a".repeat(15);
const MIN_SECRET = "b".repeat(16);

type EnvPatch = Record<string, string | undefined>;
const env = process.env as Record<string, string | undefined>;

// 临时改写环境变量,结束后还原。getSecret 每次调用都读 process.env,所以可在运行期切换。
async function withEnv<T>(patch: EnvPatch, fn: () => T | Promise<T>): Promise<T> {
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
    return await fn();
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

test("accepts a token minted by the Node signer (Node and Edge signatures agree)", async () => {
  await withEnv(signed, async () => {
    const token = createSessionToken("user-1", "learner");
    const payload = await verifySessionTokenEdge(token);
    assert.ok(payload);
    assert.equal(payload.uid, "user-1");
    assert.equal(payload.role, "learner");
    assert.ok(payload.exp > nowSeconds());
  });
});

test("accepts an independently HMAC-signed token", async () => {
  await withEnv(signed, async () => {
    const token = forgeToken({ uid: "u-2", role: "admin", exp: nowSeconds() + 3600 }, TEST_SECRET);
    const payload = await verifySessionTokenEdge(token);
    assert.equal(payload?.uid, "u-2");
    assert.equal(payload?.role, "admin");
  });
});

test("Node and Edge fall back to the same dev secret outside production", async () => {
  await withEnv({ SESSION_SECRET: undefined, NODE_ENV: "development" }, async () => {
    const token = createSessionToken("dev-user", "learner");
    assert.equal((await verifySessionTokenEdge(token))?.uid, "dev-user");
  });
  await withEnv({ SESSION_SECRET: SHORT_SECRET, NODE_ENV: "test" }, async () => {
    const token = createSessionToken("dev-user", "learner");
    assert.equal((await verifySessionTokenEdge(token))?.uid, "dev-user");
  });
});

test("rejects empty, missing and malformed tokens", async () => {
  await withEnv(signed, async () => {
    assert.equal(await verifySessionTokenEdge(null), null);
    assert.equal(await verifySessionTokenEdge(undefined), null);
    assert.equal(await verifySessionTokenEdge(""), null);
    assert.equal(await verifySessionTokenEdge("no-dot-here"), null);
    assert.equal(await verifySessionTokenEdge(".onlysig"), null);
  });
});

test("rejects a tampered payload that keeps the original signature", async () => {
  await withEnv(signed, async () => {
    const token = createSessionToken("user-1", "learner");
    const sig = token.slice(token.lastIndexOf(".") + 1);
    const forgedBody = Buffer.from(
      JSON.stringify({ uid: "user-1", role: "admin", exp: nowSeconds() + 3600 }),
    ).toString("base64url");
    assert.equal(await verifySessionTokenEdge(`${forgedBody}.${sig}`), null);
  });
});

test("rejects a tampered signature, including one of the wrong length", async () => {
  await withEnv(signed, async () => {
    const token = createSessionToken("user-1", "learner");
    const flipped = token.endsWith("A") ? `${token.slice(0, -1)}B` : `${token.slice(0, -1)}A`;
    assert.equal(await verifySessionTokenEdge(flipped), null);
    assert.equal(await verifySessionTokenEdge(token.slice(0, -4)), null);
    assert.equal(await verifySessionTokenEdge(`${token}AAAA`), null);
  });
});

test("rejects a token signed with a different secret", async () => {
  const token = await withEnv({ SESSION_SECRET: OTHER_SECRET, NODE_ENV: "test" }, () =>
    createSessionToken("user-1", "learner"),
  );
  await withEnv(signed, async () => {
    assert.equal(await verifySessionTokenEdge(token), null);
  });
});

test("rejects an expired token", async () => {
  await withEnv(signed, async () => {
    const token = createSessionToken("user-1", "learner", -10);
    assert.equal(await verifySessionTokenEdge(token), null);
  });
});

test("rejects a correctly signed payload that has no role", async () => {
  await withEnv(signed, async () => {
    const token = forgeToken({ uid: "user-1", exp: nowSeconds() + 3600 }, TEST_SECRET);
    assert.equal(await verifySessionTokenEdge(token), null);
  });
});

test("rejects a correctly signed payload with a missing uid or a non-numeric exp", async () => {
  await withEnv(signed, async () => {
    const noUid = forgeToken({ role: "learner", exp: nowSeconds() + 3600 }, TEST_SECRET);
    assert.equal(await verifySessionTokenEdge(noUid), null);
    const badExp = forgeToken({ uid: "user-1", role: "learner", exp: "soon" }, TEST_SECRET);
    assert.equal(await verifySessionTokenEdge(badExp), null);
  });
});

test("rejects correctly signed bodies that are not valid base64 or not valid JSON", async () => {
  await withEnv(signed, async () => {
    const badBase64 = "***not-base64***";
    const badBase64Sig = createHmac("sha256", TEST_SECRET).update(badBase64).digest("base64url");
    assert.equal(await verifySessionTokenEdge(`${badBase64}.${badBase64Sig}`), null);

    const notJson = Buffer.from("not json").toString("base64url");
    const notJsonSig = createHmac("sha256", TEST_SECRET).update(notJson).digest("base64url");
    assert.equal(await verifySessionTokenEdge(`${notJson}.${notJsonSig}`), null);
  });
});

test("in production without a usable SESSION_SECRET, a token forged with the public dev secret is rejected", async () => {
  const forged = forgeToken(
    { uid: "attacker", role: "admin", exp: nowSeconds() + 3600 },
    DEV_FALLBACK_SECRET,
  );
  for (const secret of [undefined, "", SHORT_SECRET]) {
    await withEnv({ SESSION_SECRET: secret, NODE_ENV: "production" }, async () => {
      assert.equal(await verifySessionTokenEdge(forged), null);
    });
  }
});

test("in production without a usable SESSION_SECRET, even a token minted under the dev secret is rejected", async () => {
  const devToken = await withEnv({ SESSION_SECRET: undefined, NODE_ENV: "development" }, () =>
    createSessionToken("dev-user", "admin"),
  );
  await withEnv({ SESSION_SECRET: undefined, NODE_ENV: "production" }, async () => {
    assert.equal(await verifySessionTokenEdge(devToken), null);
  });
});

test("in production with a valid SESSION_SECRET, tokens verify and dev-secret forgeries are rejected", async () => {
  await withEnv({ SESSION_SECRET: TEST_SECRET, NODE_ENV: "production" }, async () => {
    const token = createSessionToken("user-1", "reviewer");
    const payload = await verifySessionTokenEdge(token);
    assert.equal(payload?.uid, "user-1");
    assert.equal(payload?.role, "reviewer");

    const forged = forgeToken(
      { uid: "attacker", role: "admin", exp: nowSeconds() + 3600 },
      DEV_FALLBACK_SECRET,
    );
    assert.equal(await verifySessionTokenEdge(forged), null);
  });
});

test("a SESSION_SECRET of exactly 16 characters is accepted, even in production", async () => {
  await withEnv({ SESSION_SECRET: MIN_SECRET, NODE_ENV: "production" }, async () => {
    const token = createSessionToken("user-1", "learner");
    assert.equal((await verifySessionTokenEdge(token))?.uid, "user-1");
  });
});
