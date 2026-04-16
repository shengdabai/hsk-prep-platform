import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";

export async function GET() {
  return NextResponse.json({ items: await getRepository().listAdminItems() });
}

