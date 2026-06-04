import { getRepository } from "@hsk/db";
import { QUESTION_TYPE_META } from "@hsk/shared";
import type { AnswerFormat, ContentItem, SharedOptionPool } from "@hsk/shared";

/**
 * Fields safe to send while a session is still active (no answer leakage).
 * correctOptionId and explanation are intentionally excluded.
 */
export type ActiveDisplayItem = {
  id: string;
  levelCode: string;
  sectionCode: string;
  questionTypeCode: string;
  title: string;
  stem: string;
  prompt: string;
  reviewStatus: string;
  publishStatus: string;
  sourceType: string;
  copyrightCleared: boolean;
  options: Array<{ id: string; label: string; text: string; imageUrl?: string | null }>;
  tags: string[];
  // render helpers derived from QUESTION_TYPE_META
  answerFormat: AnswerFormat;
  needsAudio: boolean;
  needsImage: boolean;
  // media / context (optional, null when not yet generated)
  audioUrl: string | null;
  imageUrl: string | null;
  context: string | null;
  part: number | null;
  // 共享选项池(A-F 六选共享)。无该字段的题不受影响,走原独立选项渲染。
  // 不含任何答案信息(correctOptionId 仍只在提交后下发),作答中下发安全。
  sharedOptionPool: SharedOptionPool | null;
};

/**
 * Adds correctOptionId and explanation — only safe to include after submission.
 */
export type SubmittedDisplayItem = ActiveDisplayItem & {
  correctOptionId: string;
  explanation: string;
};

/**
 * C5 单一来源:`components/question-view.tsx` 消费的 `DisplayQuestion` 形状应与本
 * 模块派生,而非各自手写。该组件不在数据层文件域内、未在本轮改动;此处显式标注其
 * 应满足的结构契约 —— `DisplayQuestion` ⊇ ActiveDisplayItem 的渲染字段子集,且
 * submitted 字段(correctOptionId/explanation)对应 SubmittedDisplayItem。新增/重命名
 * 渲染字段时,以本模块的 ActiveDisplayItem/SubmittedDisplayItem 为权威,组件侧随之对齐。
 *
 * SubmittedDisplayItem 即提交后会话页传入 SessionRunner→QuestionView 的完整形状;
 * ActiveDisplayItem 是作答中的安全子集。两者均由本文件单点定义。
 */
export type SessionDisplayItem = ActiveDisplayItem | SubmittedDisplayItem;

/** 单个作答选项的渲染形状(与 ActiveDisplayItem.options 元素一致)。 */
export type DisplayOption = ActiveDisplayItem["options"][number];

/**
 * C5 单一来源:`components/question-view.tsx`(及 `session-runner.tsx`)消费的
 * `DisplayQuestion` 形状由此单点定义,组件侧只 re-export,不再各自手写,避免漂移。
 *
 * 它是 SubmittedDisplayItem 渲染字段的等价投影:作答中 explanation/correctOptionId
 * 为 null(剥离答案),提交后填入。字段口径与 ActiveDisplayItem/SubmittedDisplayItem
 * 对齐;新增/重命名渲染字段时以本文件为权威。
 */
export type DisplayQuestion = {
  id: string;
  title: string;
  stem: string;
  prompt: string;
  sectionCode: string;
  questionTypeCode: string;
  answerFormat: AnswerFormat;
  needsAudio: boolean;
  needsImage: boolean;
  audioUrl?: string | null;
  imageUrl?: string | null;
  context?: string | null;
  part?: number | null;
  options: DisplayOption[];
  // 共享选项池(A-F 六选共享)。存在时该题 options 即完整池;否则走原渲染。
  sharedOptionPool?: SharedOptionPool | null;
  // submitted-only fields
  explanation?: string | null;
  correctOptionId?: string | null;
};

/** Used by the session page: returns active items (no answer leak). */
export async function getSanitizedSetItems(setIdOrSlug: string): Promise<ActiveDisplayItem[]> {
  const items = await getRepository().getPublishedItemsForSet(setIdOrSlug);
  return items.map((item) => getActiveDisplayItem(item));
}

/**
 * 会话页专用:从该会话的持久化快照渲染,与 answer/submit API 的数据源一致
 * (HIGH-1)。会话进行中题库被编辑/重新发布时,页面仍展示冻结的快照题集,
 * 不再与评分用的快照漂移。无快照(旧会话)回退到实时已发布题集。
 *
 * submitted=true 时返回 SubmittedDisplayItem(含 correctOptionId/explanation),
 * 供已提交会话页展示正解与解析;否则返回剥离答案的 ActiveDisplayItem。
 */
export async function getSessionViewItems(
  sessionId: string,
  setIdOrSlug: string,
  submitted: boolean,
): Promise<ActiveDisplayItem[] | SubmittedDisplayItem[]> {
  const repo = getRepository();
  const items =
    (await repo.getSessionSnapshot(sessionId)) ??
    (await repo.getPublishedItemsForSet(setIdOrSlug));
  return submitted
    ? items.map((item) => getSubmittedDisplayItem(item))
    : items.map((item) => getActiveDisplayItem(item));
}

/** Active session view — strips correctOptionId and explanation. */
export function getActiveDisplayItem(item: ContentItem): ActiveDisplayItem {
  const meta = QUESTION_TYPE_META[item.questionTypeCode];
  return {
    id: item.id,
    levelCode: item.levelCode,
    sectionCode: item.sectionCode,
    questionTypeCode: item.questionTypeCode,
    title: item.title,
    stem: item.stem,
    prompt: item.prompt,
    reviewStatus: item.reviewStatus,
    publishStatus: item.publishStatus,
    sourceType: item.sourceType,
    copyrightCleared: item.copyrightCleared,
    options: item.options,
    tags: item.tags,
    // render helpers
    answerFormat: (meta?.answerFormat ?? "mc4") as AnswerFormat,
    needsAudio: meta?.needsAudio ?? false,
    needsImage: meta?.needsImage ?? false,
    // media / context
    audioUrl: item.audioUrl ?? null,
    imageUrl: item.imageUrl ?? null,
    context: item.context ?? null,
    part: item.part ?? null,
    sharedOptionPool: item.sharedOptionPool ?? null,
  };
}

/** Submitted session view — adds correctOptionId and explanation. */
export function getSubmittedDisplayItem(item: ContentItem): SubmittedDisplayItem {
  return {
    ...getActiveDisplayItem(item),
    correctOptionId: item.correctOptionId,
    explanation: item.explanation,
  };
}
