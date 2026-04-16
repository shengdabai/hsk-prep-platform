import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";

import { demoUserCookie } from "@/lib/auth-cookies";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(demoUserCookie)?.value;
  if (!userId) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  return NextResponse.json({ mistakes: await getRepository().getMistakes(userId) });
}
