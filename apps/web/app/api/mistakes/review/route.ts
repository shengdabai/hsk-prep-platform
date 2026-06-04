import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";
import type { ReviewGrade } from "@hsk/shared";

import { requireApiUser } from "@/lib/api-auth";

const VALID_GRADES: ReviewGrade[] = ["again", "hard", "good", "easy"];

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误。" }, { status: 400 });
  }

  const { itemId, grade } = body as { itemId?: unknown; grade?: unknown };

  if (typeof itemId !== "string" || !itemId) {
    return NextResponse.json({ error: "缺少 itemId。" }, { status: 400 });
  }
  if (typeof grade !== "string" || !VALID_GRADES.includes(grade as ReviewGrade)) {
    return NextResponse.json(
      { error: `grade 必须是 ${VALID_GRADES.join(" / ")} 之一。` },
      { status: 400 },
    );
  }

  const repo = getRepository();

  // 归属校验:reviewMistake 内部已按 userId + itemId 查找,不存在则返回 null。
  const updated = await repo.reviewMistake(user.id, itemId, grade as ReviewGrade);

  if (!updated) {
    return NextResponse.json(
      { error: "未找到该错题，或它不属于当前用户。" },
      { status: 404 },
    );
  }

  return NextResponse.json({ mistake: updated });
}
