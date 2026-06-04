import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";

import { requireApiUser } from "@/lib/api-auth";

export async function GET() {
  const guard = await requireApiUser();
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  return NextResponse.json({ mistakes: await getRepository().getMistakes(user.id) });
}
