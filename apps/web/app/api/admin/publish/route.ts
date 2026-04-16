import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";
import type { PublishStatus } from "@hsk/shared";

export async function POST(request: Request) {
  const body = (await request.json()) as { itemId?: string; publishStatus?: PublishStatus };
  if (!body.itemId || !body.publishStatus) {
    return NextResponse.json({ error: "缺少 itemId 或 publishStatus。" }, { status: 400 });
  }
  const item = await getRepository().publishItem(body.itemId, body.publishStatus);
  if (!item) {
    return NextResponse.json({ error: "题目不存在。" }, { status: 404 });
  }
  return NextResponse.json({ item });
}

