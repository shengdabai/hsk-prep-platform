import { createHmac, timingSafeEqual } from "node:crypto";

import type { UserRole } from "@hsk/shared";

// HMAC 签名会话令牌:替代原来可伪造的明文 userId cookie。
// 令牌格式:base64url(payloadJson).base64url(hmac)。
// payload 放 uid + role + exp。role 经签名防篡改,仅供中间件(proxy)做快速门禁;
// 页面与 API 仍从 repository 现取 role 作权威判定,令牌 role 只是缓存提示。

const DEV_FALLBACK_SECRET = "dev-insecure-session-secret-change-in-production-32b";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 天

export type SessionPayload = {
  uid: string;
  role: UserRole;
  exp: number; // epoch 秒
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET 未设置或过短(需 ≥16 字符)。生产环境必须配置,拒绝以不安全默认值启动。",
    );
  }
  return DEV_FALLBACK_SECRET;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createSessionToken(
  uid: string,
  role: UserRole,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string {
  const payload: SessionPayload = {
    uid,
    role,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) {
    return null;
  }
  const dot = token.lastIndexOf(".");
  if (dot <= 0) {
    return null;
  }
  const body = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = sign(body);

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (typeof payload.role !== "string") {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
