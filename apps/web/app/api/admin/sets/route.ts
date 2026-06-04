import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";
import type { PracticeSet } from "@hsk/shared";

import { requireApiRole } from "@/lib/api-auth";

export async function POST(request: Request) {
  const guard = await requireApiRole(["admin"]);
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  const body = (await request.json()) as Omit<PracticeSet, "id"> & { id?: string };
  const repo = getRepository();
  const set = await repo.createPracticeSet({
    ...body,
    id: body.id ?? randomUUID(),
  });
  await repo.addAuditLog({
    actorId: user.id,
    targetTable: "practice_sets",
    targetId: set.id,
    action: "create_set",
    payload: { slug: set.slug },
  });
  return NextResponse.json({ set });
}
