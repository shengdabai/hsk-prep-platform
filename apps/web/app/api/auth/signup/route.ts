import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";
import type { AppUser } from "@hsk/shared";

import { demoRoleCookie, demoUserCookie } from "@/lib/auth-cookies";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    email?: string;
    password?: string;
    fullName?: string;
  };

  if (!payload.email || !payload.password || !payload.fullName) {
    return NextResponse.json({ error: "请填写完整注册信息。" }, { status: 400 });
  }

  const repo = getRepository();
  const existing = await repo.findUserByEmail(payload.email);
  if (existing) {
    return NextResponse.json({ error: "邮箱已存在。" }, { status: 409 });
  }

  const user: AppUser = {
    id: randomUUID(),
    email: payload.email,
    fullName: payload.fullName,
    role: "learner",
    plan: "free",
  };
  await repo.upsertUser(user);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(demoUserCookie, user.id, { httpOnly: true, sameSite: "lax", path: "/" });
  response.cookies.set(demoRoleCookie, user.role, { httpOnly: true, sameSite: "lax", path: "/" });
  return response;
}
