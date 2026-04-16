import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";

import { demoUserCookie } from "@/lib/auth-cookies";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get(demoUserCookie)?.value;

  if (!userId) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const body = (await request.json()) as {
    setIdOrSlug?: string;
    mode?: "mock_exam" | "practice_set";
  };

  if (!body.setIdOrSlug || !body.mode) {
    return NextResponse.json({ error: "缺少 setIdOrSlug 或 mode。" }, { status: 400 });
  }

  const session = await getRepository().createSession({
    userId,
    setIdOrSlug: body.setIdOrSlug,
    mode: body.mode,
  });

  return NextResponse.json({ sessionId: session.id });
}
