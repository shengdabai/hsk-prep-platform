import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const repo = getRepository();
  const exam = await repo.getMockExamById(id);
  if (!exam) {
    return NextResponse.json({ error: "模考不存在。" }, { status: 404 });
  }
  const items = await repo.getPublishedItemsForSet(exam.id);
  return NextResponse.json({
    exam: {
      ...exam,
      items: items.map((item) => ({
        id: item.id,
        levelCode: item.levelCode,
        sectionCode: item.sectionCode,
        questionTypeCode: item.questionTypeCode,
        title: item.title,
        stem: item.stem,
        prompt: item.prompt,
        // 答题加载阶段不下发 explanation(含"正确答案是…"会泄题);解析仅在提交后接口返回。
        reviewStatus: item.reviewStatus,
        publishStatus: item.publishStatus,
        sourceType: item.sourceType,
        copyrightCleared: item.copyrightCleared,
        options: item.options,
        tags: item.tags,
      })),
    },
  });
}
