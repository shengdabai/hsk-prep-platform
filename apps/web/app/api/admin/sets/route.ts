import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";
import type { PracticeSet } from "@hsk/shared";

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<PracticeSet, "id"> & { id?: string };
  const set = await getRepository().createPracticeSet({
    ...body,
    id: body.id ?? randomUUID(),
  });
  return NextResponse.json({ set });
}

