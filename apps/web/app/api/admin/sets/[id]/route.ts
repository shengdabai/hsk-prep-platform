import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";
import type { PracticeSet } from "@hsk/shared";

import { requireApiRole } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(["admin"]);
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  const { id } = await params;
  const body = (await request.json()) as Partial<PracticeSet>;
  const repo = getRepository();
  const set = await repo.patchPracticeSet(id, body);
  if (!set) {
    return NextResponse.json({ error: "套卷不存在。" }, { status: 404 });
  }
  await repo.addAuditLog({
    actorId: user.id,
    targetTable: "practice_sets",
    targetId: id,
    action: "patch_set",
    payload: body as Record<string, unknown>,
  });
  return NextResponse.json({ set });
}
