import { NextResponse } from "next/server";

import { getRepository } from "@hsk/db";

import { forbidden, requireApiUser } from "@/lib/api-auth";
import { getSnapshotItems } from "../../_snapshot";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiUser();
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  const { id } = await params;
  let body: { itemId?: string; optionId?: string };
  try {
    body = (await request.json()) as { itemId?: string; optionId?: string };
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  if (!body.itemId || !body.optionId) {
    return NextResponse.json({ error: "缺少 itemId 或 optionId。" }, { status: 400 });
  }

  const repo = getRepository();
  const session = await repo.getSession(id);
  if (!session) {
    return NextResponse.json({ error: "会话不存在。" }, { status: 404 });
  }
  if (session.userId !== user.id) {
    return forbidden("无权操作该会话。");
  }
  if (session.status === "submitted") {
    return NextResponse.json({ error: "会话已提交,无法继续作答。" }, { status: 409 });
  }

  // B4 IDOR:itemId 必须属于本会话的卷(快照,旧会话回退到实时已发布题集),
  // 否则拒绝 —— 防止把答案写到不属于该卷的题目上。
  const sessionItems =
    (await getSnapshotItems(repo, session.id)) ??
    (await repo.getPublishedItemsForSet(session.setId));
  if (!sessionItems.some((item) => item.id === body.itemId)) {
    return NextResponse.json(
      { error: "该题目不属于本会话的试卷。" },
      { status: 400 },
    );
  }

  await repo.saveAnswer({
    sessionId: id,
    itemId: body.itemId,
    optionId: body.optionId,
  });

  return NextResponse.json({ ok: true });
}
