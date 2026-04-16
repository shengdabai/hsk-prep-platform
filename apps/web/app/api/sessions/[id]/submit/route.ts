import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const report = await getRepository().submitSession(id);

  if (!report) {
    return NextResponse.json({ error: "提交失败，会话不存在。" }, { status: 404 });
  }

  return NextResponse.json({ reportId: report.id });
}

