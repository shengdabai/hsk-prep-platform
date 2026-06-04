import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";

import { forbidden, requireApiUser } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiUser();
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  const { id } = await params;
  const report = await getRepository().getReport(id);
  if (!report) {
    return NextResponse.json({ error: "报告不存在。" }, { status: 404 });
  }
  // 资源归属校验:只能查看自己的报告。
  if (report.userId !== user.id) {
    return forbidden("无权访问该报告。");
  }
  return NextResponse.json({ report });
}
