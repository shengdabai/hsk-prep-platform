import type { UserRole } from "@hsk/shared";

import type { SessionPayload } from "@/lib/session";

// Edge runtime(proxy/middleware)专用的验签器:用 Web Crypto 复刻 session.ts 的 HMAC-SHA256,
// 因为 Edge runtime 没有 node:crypto。两者必须产出一致的 base64url 签名。
// 必须与 session.ts 的 DEV_FALLBACK_SECRET 完全一致。
const DEV_FALLBACK_SECRET = "dev-insecure-session-secret-change-in-production-32b";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }
  return DEV_FALLBACK_SECRET;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToString(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

async function edgeSign(body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return bytesToBase64Url(new Uint8Array(sig));
}

export async function verifySessionTokenEdge(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }
  const dot = token.lastIndexOf(".");
  if (dot <= 0) {
    return null;
  }
  const body = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = await edgeSign(body);
  if (providedSig !== expectedSig) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlToString(body)) as SessionPayload;
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

export type { UserRole };
