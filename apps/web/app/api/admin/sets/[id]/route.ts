import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";
import type { PracticeSet } from "@hsk/shared";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<PracticeSet>;
  const set = await getRepository().patchPracticeSet(id, body);
  if (!set) {
    return NextResponse.json({ error: "套卷不存在。" }, { status: 404 });
  }
  return NextResponse.json({ set });
}

