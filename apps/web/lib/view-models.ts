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

/** Used by the session page: returns active items (no answer leak). */
export async function getSanitizedSetItems(setIdOrSlug: string): Promise<ActiveDisplayItem[]> {
  const items = await getRepository().getPublishedItemsForSet(setIdOrSlug);
  return items.map((item) => getActiveDisplayItem(item));
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

/**
 * Legacy alias kept for callers that have not been migrated yet.
 * Behaves like getActiveDisplayItem (no answer leak).
 * @deprecated Use getActiveDisplayItem or getSubmittedDisplayItem explicitly.
 */
export function getDisplayItem(item: ContentItem): ActiveDisplayItem {
  return getActiveDisplayItem(item);
}
