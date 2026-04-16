import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { demoRoleCookie, demoUserCookie } from "@/lib/auth-cookies";

const adminPaths = ["/admin"];
const learnerPaths = ["/account", "/mistakes", "/session", "/report"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userId = request.cookies.get(demoUserCookie)?.value;
  const role = request.cookies.get(demoRoleCookie)?.value;

  if (learnerPaths.some((path) => pathname.startsWith(path)) && !userId) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url));
  }

  if (adminPaths.some((path) => pathname.startsWith(path))) {
    if (!userId) {
      return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url));
    }
    if (role !== "admin" && role !== "reviewer") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account", "/mistakes", "/session/:path*", "/report/:path*"],
};
