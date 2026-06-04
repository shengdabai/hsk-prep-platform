import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";

import { forbidden, requireApiUser } from "@/lib/api-auth";
import { getActiveDisplayItem, getSubmittedDisplayItem } from "@/lib/view-models";
import { getSnapshotItems } from "../_snapshot";

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
  const repo = getRepository();
  const session = await repo.getSession(id);
  if (!session) {
    return NextResponse.json({ error: "会话不存在。" }, { status: 404 });
  }
  // 资源归属校验:只能访问自己的会话。
  if (session.userId !== user.id) {
    return forbidden("无权访问该会话。");
  }

  // B2 评分快照:优先用会话创建时固化的题目快照渲染,使做题中/已提交视图与题库
  // 后续编辑/重新发布解耦(无快照的旧会话回退到实时已发布题集)。
  const items =
    (await getSnapshotItems(repo, session.id)) ??
    (await repo.getPublishedItemsForSet(session.setId));
  const submitted = session.status === "submitted";
  // 与做题页同源(view-models):透传 imageUrl/audioUrl/context/answerFormat 等渲染字段;
  // active 会话由 getActiveDisplayItem 剥离 correctOptionId/explanation,提交后才用 submitted 版补回。
  return NextResponse.json({
    session,
    items: items.map((item) =>
      submitted ? getSubmittedDisplayItem(item) : getActiveDisplayItem(item),
    ),
  });
}
