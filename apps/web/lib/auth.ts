import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getRepository } from "@hsk/db";
import type { AppUser, Subscription, UserRole } from "@hsk/shared";

import { sessionCookie } from "@/lib/auth-cookies";
import { verifySessionToken } from "@/lib/session";

// 服务端组件 / 页面使用:读取并验签会话 cookie,再从 repository 现取用户(role 不信任令牌)。
export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  const payload = verifySessionToken(token);
  if (!payload) {
    return null;
  }
  return getRepository().getUserById(payload.uid);
}

export async function getCurrentSubscription(): Promise<Subscription | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  return getRepository().getSubscription(user.id);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/");
  }
  return user;
}
