import type { Repository } from "@hsk/db";
import type { ContentItem, ExamReport, ExamSession } from "@hsk/shared";

// ─────────────────────────────────────────────────────────────────────────────
// B2 评分快照(Exam session item snapshot)— DB 持久化版(终审 H3)
//
// 问题:会话创建后,submit 评分与 GET 渲染都实时调用 repo.getPublishedItemsForSet()
// 重新取题。若题目在会话进行中被编辑/重新发布(改正确答案、下架),历史报告会随之
// 改变 —— 同一份答卷在不同时间会得到不同分数。
//
// 修复:在「会话创建时」把本套卷的题目(含 correctOptionId / answerText)冻结成快照,
// 与 sessionId 绑定。submit 从快照评分,GET 从快照渲染,自此与题库后续变更解耦。
//
// 持久化(H3):快照不再存进程内存(globalThis Map)—— 那在 Vercel serverless 下
// 跨实例/冷启动即丢,会话创建与提交落在不同 lambda 时快照机制形同未实现。改为经
// repository 持久化:
//   - mock 后端:仍内存实现(globalThis store 内的 snapshots Map),demo 可用;
//   - supabase 后端:写 exam_session_items.snapshot_json(006 迁移),跨实例可读回。
// 本模块只是把 API 层的快照编排薄薄地转发到 repository,判分算法不动。
// ─────────────────────────────────────────────────────────────────────────────

/** 会话创建时调用:冻结本套卷题目为该会话的评分快照(经 repository 持久化)。 */
export async function captureSnapshot(
  repo: Repository,
  sessionId: string,
  items: ContentItem[],
): Promise<void> {
  await repo.saveSessionSnapshot(sessionId, items);
}

/** 取该会话的快照题目;无快照(旧会话 / 从未冻结)返回 null。 */
export async function getSnapshotItems(
  repo: Repository,
  sessionId: string,
): Promise<ContentItem[] | null> {
  return repo.getSessionSnapshot(sessionId);
}

/**
 * 查已提交会话对应的既有报告(H2 幂等用)。
 * 找不到返回 null。
 */
export async function findExistingReport(
  repo: Repository,
  sessionId: string,
): Promise<ExamReport | null> {
  return repo.findReportBySession(sessionId);
}

/**
 * 从快照评分并提交(经 repository),与 repo.submitSession 同口径。
 * submitSession 内部已优先用持久化快照评分(无快照回退实时题集),并对 H2 做
 * 幂等去竞态(每会话至多一份报告,DB 唯一约束兜底)。
 *
 * 返回 report;会话不存在时返回 null。
 */
export async function submitFromSnapshot(
  repo: Repository,
  session: ExamSession,
): Promise<ExamReport | null> {
  return repo.submitSession(session.id);
}
