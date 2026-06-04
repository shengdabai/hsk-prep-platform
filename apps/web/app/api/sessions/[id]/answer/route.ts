import { getRepository } from "@hsk/db";

import { forbidden, requireApiUser } from "@/lib/api-auth";
import { fail, ok, withApiHandler } from "@/lib/api-response";
import { safeJson } from "@/lib/auth-validation";
import { saveAnswerSchema } from "@/lib/api-validation";
import { getSnapshotItems } from "../../_snapshot";

export const POST = withApiHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireApiUser();
    if ("response" in guard) {
      return guard.response;
    }
    const { user } = guard;

    const { id } = await params;
    const parsed = saveAnswerSchema.safeParse(await safeJson(request));
    if (!parsed.success) {
      return fail(400, parsed.error.issues[0]?.message ?? "请求参数不合法。");
    }
    const { itemId, optionId } = parsed.data;

    const repo = getRepository();
    const session = await repo.getSession(id);
    if (!session) {
      return fail(404, "会话不存在。");
    }
    if (session.userId !== user.id) {
      return forbidden("无权操作该会话。");
    }
    if (session.status === "submitted") {
      return fail(409, "会话已提交,无法继续作答。");
    }

    // B4 IDOR:itemId 必须属于本会话的卷(快照,旧会话回退到实时已发布题集),
    // 否则拒绝 —— 防止把答案写到不属于该卷的题目上。
    const sessionItems =
      (await getSnapshotItems(repo, session.id)) ??
      (await repo.getPublishedItemsForSet(session.setId));
    if (!sessionItems.some((item) => item.id === itemId)) {
      return fail(400, "该题目不属于本会话的试卷。");
    }

    await repo.saveAnswer({
      sessionId: id,
      itemId,
      optionId,
    });

    return ok({ ok: true });
  },
);
