import { NextResponse } from "next/server";

import { getRepository, verifyPassword } from "@hsk/db";

import { legacyRoleCookie, legacyUserCookie, sessionCookie } from "@/lib/auth-cookies";
import { firstIssueMessage, loginSchema, safeJson } from "@/lib/auth-validation";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { createSessionToken } from "@/lib/session";

const SESSION_TTL = 60 * 60 * 24 * 7;
const RATE_LIMIT = { limit: 5, windowMs: 60_000 }; // 5 次 / 分钟

export async function POST(request: Request) {
  // 按 IP 限流,缓解凭证爆破。
  const ipGate = rateLimit(`login:ip:${clientIp(request)}`, RATE_LIMIT);
  if (!ipGate.ok) {
    return tooManyRequests(ipGate.retryAfterSeconds);
  }

  const parsed = loginSchema.safeParse(await safeJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }
  const { email, password } = parsed.data;

  // 再按目标邮箱限流,缓解针对单账户的密码喷洒。
  const emailGate = rateLimit(`login:email:${email}`, RATE_LIMIT);
  if (!emailGate.ok) {
    return tooManyRequests(emailGate.retryAfterSeconds);
  }

  const repo = getRepository();
  const user = await repo.findUserByEmail(email);
  // 统一的失败信息:不区分"账户不存在"与"密码错误",避免账户枚举。
  const invalid = NextResponse.json({ error: "邮箱或密码不正确。" }, { status: 401 });
  if (!user) {
    return invalid;
  }

  const hash = await repo.getPasswordHash(user.id);
  if (!verifyPassword(password, hash)) {
    return invalid;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, createSessionToken(user.id, user.role, SESSION_TTL), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
  // 清理可能残留的旧明文 cookie。
  response.cookies.set(legacyUserCookie, "", { path: "/", expires: new Date(0) });
  response.cookies.set(legacyRoleCookie, "", { path: "/", expires: new Date(0) });
  return response;
}
