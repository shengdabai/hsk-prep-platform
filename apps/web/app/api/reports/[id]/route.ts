import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const report = await getRepository().getReport(id);
  if (!report) {
    return NextResponse.json({ error: "报告不存在。" }, { status: 404 });
  }
  return NextResponse.json({ report });
}

