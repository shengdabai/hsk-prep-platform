import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { itemId?: string; optionId?: string };

  if (!body.itemId || !body.optionId) {
    return NextResponse.json({ error: "缺少 itemId 或 optionId。" }, { status: 400 });
  }

  const session = await getRepository().saveAnswer({
    sessionId: id,
    itemId: body.itemId,
    optionId: body.optionId,
  });

  if (!session) {
    return NextResponse.json({ error: "会话不存在。" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

