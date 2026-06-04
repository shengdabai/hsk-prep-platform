import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";
import { canAccessSet } from "@hsk/shared";

import { requireApiUser } from "@/lib/api-auth";
import { captureSnapshot } from "./_snapshot";

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  const body = (await request.json()) as {
    setIdOrSlug?: string;
    mode?: "mock_exam" | "practice_set";
  };

  if (!body.setIdOrSlug || !body.mode) {
    return NextResponse.json({ error: "缺少 setIdOrSlug 或 mode。" }, { status: 400 });
  }

  const repo = getRepository();
  const set =
    body.mode === "mock_exam"
      ? await repo.getMockExamById(body.setIdOrSlug)
      : await repo.getPracticeSetById(body.setIdOrSlug);

  if (!set) {
    return NextResponse.json({ error: "套卷不存在。" }, { status: 404 });
  }

  // 付费门槛:非 free 套卷需 active 订阅。
  const subscription = await repo.getSubscription(user.id);
  if (!canAccessSet(set.access, subscription)) {
    return NextResponse.json(
      { error: "该内容需要订阅后才能开始,请前往价格页升级。" },
      { status: 403 },
    );
  }

  const session = await repo.createSession({
    userId: user.id,
    setIdOrSlug: body.setIdOrSlug,
    mode: body.mode,
  });

  // B2 评分快照:在会话创建时固化本套卷题目(含正确答案),使后续评分/渲染与
  // 题库的编辑/重新发布解耦,历史报告不再随题目变更而改变。
  // H3:快照经 repository 持久化(mock 内存 / supabase exam_session_items),
  // serverless 跨实例/冷启动可读回。
  const snapshotItems = await repo.getPublishedItemsForSet(session.setId);
  await captureSnapshot(repo, session.id, snapshotItems);

  return NextResponse.json({ sessionId: session.id });
}
