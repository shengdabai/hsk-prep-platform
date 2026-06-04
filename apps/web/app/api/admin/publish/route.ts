import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";
import type { PublishStatus } from "@hsk/shared";

import { requireApiRole } from "@/lib/api-auth";

export async function POST(request: Request) {
  // 发布 / 下架仅限 admin。
  const guard = await requireApiRole(["admin"]);
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  const body = (await request.json()) as { itemId?: string; publishStatus?: PublishStatus };
  if (!body.itemId || !body.publishStatus) {
    return NextResponse.json({ error: "缺少 itemId 或 publishStatus。" }, { status: 400 });
  }
  const repo = getRepository();
  const item = await repo.publishItem(body.itemId, body.publishStatus);
  if (!item) {
    return NextResponse.json({ error: "题目不存在。" }, { status: 404 });
  }
  await repo.addAuditLog({
    actorId: user.id,
    targetTable: "content_items",
    targetId: body.itemId,
    action: "publish",
    payload: { publishStatus: body.publishStatus },
  });
  return NextResponse.json({ item });
}
