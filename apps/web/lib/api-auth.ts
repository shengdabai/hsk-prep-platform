import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";
import type { AppUser, UserRole } from "@hsk/shared";

import { sessionCookie } from "@/lib/auth-cookies";
import { verifySessionToken } from "@/lib/session";

// 路由处理器(API)使用:验签 + 现取用户。失败返回 JSON 响应而非 redirect。

export async function getApiUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  const payload = verifySessionToken(token);
  if (!payload) {
    return null;
  }
  return getRepository().getUserById(payload.uid);
}

export function unauthorized(message = "请先登录。") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "权限不足。") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function hasRole(user: AppUser, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

// 守卫:返回 { user } 或 { response }。路由侧:
//   const guard = await requireApiUser(); if ("response" in guard) return guard.response;
export async function requireApiUser(): Promise<
  { user: AppUser } | { response: NextResponse }
> {
  const user = await getApiUser();
  if (!user) {
    return { response: unauthorized() };
  }
  return { user };
}

export async function requireApiRole(
  roles: UserRole[],
): Promise<{ user: AppUser } | { response: NextResponse }> {
  const user = await getApiUser();
  if (!user) {
    return { response: unauthorized() };
  }
  if (!hasRole(user, roles)) {
    return { response: forbidden() };
  }
  return { user };
}
