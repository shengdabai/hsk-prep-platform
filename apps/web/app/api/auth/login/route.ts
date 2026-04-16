import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";

import { demoRoleCookie, demoUserCookie } from "@/lib/auth-cookies";

export async function POST(request: Request) {
  const payload = (await request.json()) as { email?: string; password?: string };

  if (!payload.email || !payload.password) {
    return NextResponse.json({ error: "邮箱和密码不能为空。" }, { status: 400 });
  }

  const repo = getRepository();
  const user = await repo.findUserByEmail(payload.email);
  if (!user) {
    return NextResponse.json({ error: "账户不存在。可先注册或使用 demo 账户。" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(demoUserCookie, user.id, { httpOnly: true, sameSite: "lax", path: "/" });
  response.cookies.set(demoRoleCookie, user.role, { httpOnly: true, sameSite: "lax", path: "/" });
  return response;
}
