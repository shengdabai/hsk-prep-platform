import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getRepository, hashPassword } from "@hsk/db";
import type { AppUser } from "@hsk/shared";

import { legacyRoleCookie, legacyUserCookie, sessionCookie } from "@/lib/auth-cookies";
import { firstIssueMessage, safeJson, signupSchema } from "@/lib/auth-validation";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { createSessionToken } from "@/lib/session";

const SESSION_TTL = 60 * 60 * 24 * 7;
const RATE_LIMIT = { limit: 5, windowMs: 60_000 }; // 5 次 / 分钟

export async function POST(request: Request) {
  // 按 IP 限流,缓解注册接口被脚本批量调用。
  const ipGate = rateLimit(`signup:ip:${clientIp(request)}`, RATE_LIMIT);
  if (!ipGate.ok) {
    return tooManyRequests(ipGate.retryAfterSeconds);
  }

  const parsed = signupSchema.safeParse(await safeJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }
  const { email, password, fullName } = parsed.data;

  // 同一邮箱再加一道按邮箱的限流,防止针对单账户的枚举/刷注册。
  const emailGate = rateLimit(`signup:email:${email}`, RATE_LIMIT);
  if (!emailGate.ok) {
    return tooManyRequests(emailGate.retryAfterSeconds);
  }

  const repo = getRepository();
  const existing = await repo.findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "邮箱已存在。" }, { status: 409 });
  }

  // 自建 id 体系:此处生成的 id 同时用于 upsertUser、setPasswordHash 与后续
  // 订阅 / profiles 记录,三者一致,无随机 UUID 与持久化记录不匹配的问题。
  const user: AppUser = {
    id: randomUUID(),
    email,
    fullName,
    role: "learner",
    plan: "free",
  };
  await repo.upsertUser(user);
  await repo.setPasswordHash(user.id, hashPassword(password));

  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, createSessionToken(user.id, user.role, SESSION_TTL), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
  response.cookies.set(legacyUserCookie, "", { path: "/", expires: new Date(0) });
  response.cookies.set(legacyRoleCookie, "", { path: "/", expires: new Date(0) });
  return response;
}
