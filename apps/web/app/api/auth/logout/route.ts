import { NextResponse } from "next/server";

import { demoRoleCookie, demoUserCookie } from "@/lib/auth-cookies";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(demoUserCookie, "", { httpOnly: true, sameSite: "lax", path: "/", expires: new Date(0) });
  response.cookies.set(demoRoleCookie, "", { httpOnly: true, sameSite: "lax", path: "/", expires: new Date(0) });
  return response;
}
