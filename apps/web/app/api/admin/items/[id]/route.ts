import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";
import type { PublishStatus, ReviewStatus } from "@hsk/shared";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const patch = (await request.json()) as {
    reviewStatus?: ReviewStatus;
    publishStatus?: PublishStatus;
  };
  const item = await getRepository().patchAdminItem(id, patch);
  if (!item) {
    return NextResponse.json({ error: "题目不存在。" }, { status: 404 });
  }
  return NextResponse.json({ item });
}

