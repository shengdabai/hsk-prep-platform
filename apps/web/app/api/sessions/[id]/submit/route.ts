import { getRepository } from "@hsk/db";

import { forbidden, requireApiUser } from "@/lib/api-auth";
import { fail, ok, withApiHandler } from "@/lib/api-response";
import { findExistingReport, submitFromSnapshot } from "../../_snapshot";

export const POST = withApiHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireApiUser();
    if ("response" in guard) {
      return guard.response;
    }
    const { user } = guard;

    const { id } = await params;
    const repo = getRepository();
    const session = await repo.getSession(id);
    if (!session) {
      return fail(404, "会话不存在。");
    }
    if (session.userId !== user.id) {
      return forbidden("无权提交该会话。");
    }

    // H2 幂等:会话已提交则不重复评分,返回既有报告 id(200)。报告按 sessionId 反查
    // (DB 唯一约束兜底);极少数「已置 submitted 但报告尚未落库」的窗口返回 409。
    if (session.status === "submitted") {
      const existing = await findExistingReport(repo, id);
      if (existing) {
        return ok({ reportId: existing.id });
      }
      return fail(409, "会话已提交,无法重复提交。");
    }

    // B2 + H2 + H3:经 repository 提交。submitSession 内部优先用持久化快照评分(H3),
    // 并依赖唯一约束做幂等去竞态(H2):两并发 submit 时后到者回退读既有报告,
    // 而非生成第二份。无需在 API 层再做非原子的 check-then-write。
    const report = await submitFromSnapshot(repo, session);
    if (!report) {
      return fail(404, "提交失败,会话不存在。");
    }

    return ok({ reportId: report.id });
  },
);
