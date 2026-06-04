import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { sessionCookie } from "@/lib/auth-cookies";
import { verifySessionTokenEdge } from "@/lib/session-edge";

const adminPaths = ["/admin"];
const learnerPaths = ["/account", "/mistakes", "/session", "/report"];

// 快速门禁(纵深防御第一层):验签会话令牌。无效/越权先在边缘拦截。
// 权威 role 判定仍由各页面的 requireRole 与 API 守卫从 repository 现取完成。
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(sessionCookie)?.value;
  const session = await verifySessionTokenEdge(token);

  const needsLearner = learnerPaths.some((path) => pathname.startsWith(path));
  const needsAdmin = adminPaths.some((path) => pathname.startsWith(path));

  if ((needsLearner || needsAdmin) && !session) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url),
    );
  }

  if (needsAdmin && session && session.role !== "admin" && session.role !== "reviewer") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account", "/mistakes", "/session/:path*", "/report/:path*"],
};
