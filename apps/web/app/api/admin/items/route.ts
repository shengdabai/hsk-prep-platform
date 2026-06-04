import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";

import { requireApiRole } from "@/lib/api-auth";

export async function GET() {
  const guard = await requireApiRole(["reviewer", "admin"]);
  if ("response" in guard) {
    return guard.response;
  }
  return NextResponse.json({ items: await getRepository().listAdminItems() });
}
