import { NextResponse } from "next/server";

import { legacyRoleCookie, legacyUserCookie, sessionCookie } from "@/lib/auth-cookies";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const expired = { httpOnly: true, sameSite: "lax" as const, path: "/", expires: new Date(0) };
  response.cookies.set(sessionCookie, "", expired);
  response.cookies.set(legacyUserCookie, "", expired);
  response.cookies.set(legacyRoleCookie, "", expired);
  return response;
}
