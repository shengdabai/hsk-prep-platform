import { getRepository } from "@hsk/db";
import { canAccessSet } from "@hsk/shared";

import { requireApiUser } from "@/lib/api-auth";
import { fail, ok, withApiHandler } from "@/lib/api-response";
import { safeJson } from "@/lib/auth-validation";
import { createSessionSchema } from "@/lib/api-validation";
import { captureSnapshot } from "./_snapshot";

export const POST = withApiHandler(async (request: Request) => {
  const guard = await requireApiUser();
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  const parsed = createSessionSchema.safeParse(await safeJson(request));
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message ?? "请求参数不合法。");
  }
  const { setIdOrSlug, mode } = parsed.data;

  const repo = getRepository();
  const set =
    mode === "mock_exam"
      ? await repo.getMockExamById(setIdOrSlug)
      : await repo.getPracticeSetById(setIdOrSlug);

  if (!set) {
    return fail(404, "套卷不存在。");
  }

  // 付费门槛:非 free 套卷需 active 订阅。
  const subscription = await repo.getSubscription(user.id);
  if (!canAccessSet(set.access, subscription)) {
    return fail(403, "该内容需要订阅后才能开始,请前往价格页升级。");
  }

  const session = await repo.createSession({
    userId: user.id,
    setIdOrSlug,
    mode,
  });

  // B2 评分快照:在会话创建时固化本套卷题目(含正确答案),使后续评分/渲染与
  // 题库的编辑/重新发布解耦,历史报告不再随题目变更而改变。
  // H3:快照经 repository 持久化(mock 内存 / supabase exam_session_items),
  // serverless 跨实例/冷启动可读回。
  const snapshotItems = await repo.getPublishedItemsForSet(session.setId);
  await captureSnapshot(repo, session.id, snapshotItems);

  return ok({ sessionId: session.id });
});
