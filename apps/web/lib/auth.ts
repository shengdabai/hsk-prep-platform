import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getRepository } from "@hsk/db";
import type { AppUser, UserRole } from "@hsk/shared";

import { demoUserCookie } from "@/lib/auth-cookies";

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(demoUserCookie)?.value;
  if (!userId) {
    return null;
  }
  return getRepository().getUserById(userId);
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
