import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const repo = getRepository();
  const session = await repo.getSession(id);
  if (!session) {
    return NextResponse.json({ error: "会话不存在。" }, { status: 404 });
  }
  const items = await repo.getPublishedItemsForSet(session.setId);
  return NextResponse.json({
    session,
    items: items.map((item) => ({
      id: item.id,
      levelCode: item.levelCode,
      sectionCode: item.sectionCode,
      questionTypeCode: item.questionTypeCode,
      title: item.title,
      stem: item.stem,
      prompt: item.prompt,
      explanation: item.explanation,
      reviewStatus: item.reviewStatus,
      publishStatus: item.publishStatus,
      sourceType: item.sourceType,
      copyrightCleared: item.copyrightCleared,
      options: item.options,
      tags: item.tags,
    })),
  });
}
