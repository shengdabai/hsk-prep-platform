import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";
import type { PublishStatus, ReviewStatus } from "@hsk/shared";

import { requireApiRole } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(["reviewer", "admin"]);
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  const { id } = await params;
  const patch = (await request.json()) as {
    reviewStatus?: ReviewStatus;
    publishStatus?: PublishStatus;
  };
  const repo = getRepository();
  const item = await repo.patchAdminItem(id, patch);
  if (!item) {
    return NextResponse.json({ error: "题目不存在。" }, { status: 404 });
  }
  await repo.addAuditLog({
    actorId: user.id,
    targetTable: "content_items",
    targetId: id,
    action: "patch_item",
    payload: patch,
  });
  return NextResponse.json({ item });
}
