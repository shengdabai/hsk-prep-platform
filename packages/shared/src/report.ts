import { gradeResponse } from "./grading";
import type {
  ContentItem,
  ReportDimensionBucket,
  ReportDimensions,
} from "./types";

// 多维报告聚合(纯函数)。供 mock 与 supabase 两套 repository 共用,保证行为一致。
// 输入:本套卷参与计分的 items(published) + 用户答案(itemId → optionId)。
// 输出:按 sectionCode / questionTypeCode / tag 三个维度的 {correct,total} 分桶。
//   - bySection / byQuestionType:每题计入其唯一的 section / questionType 桶。
//   - byTag:一题可有多个 tag,计入它所属的每一个 tag 桶(无 tag 的题不计入任何 tag 桶)。
// 桶按 key 升序稳定排序,便于快照/对比。

type Counter = { correct: number; total: number };

function bumpCounter(map: Map<string, Counter>, key: string, isCorrect: boolean): void {
  const existing = map.get(key) ?? { correct: 0, total: 0 };
  existing.total += 1;
  if (isCorrect) {
    existing.correct += 1;
  }
  map.set(key, existing);
}

function toSortedBuckets(map: Map<string, Counter>): ReportDimensionBucket[] {
  return [...map.entries()]
    .map(([key, c]) => ({ key, correct: c.correct, total: c.total }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function computeReportDimensions(
  items: ContentItem[],
  answers: Record<string, string>,
): ReportDimensions {
  const bySection = new Map<string, Counter>();
  const byQuestionType = new Map<string, Counter>();
  const byTag = new Map<string, Counter>();

  for (const item of items) {
    const outcome = gradeResponse(item, answers[item.id]);
    // 主观题(write_*/speak)无法自动判分,不计入任何维度桶。
    if (outcome === "ungraded") {
      continue;
    }
    const isCorrect = outcome === "correct";
    bumpCounter(bySection, item.sectionCode, isCorrect);
    bumpCounter(byQuestionType, item.questionTypeCode, isCorrect);
    for (const tag of item.tags ?? []) {
      bumpCounter(byTag, tag, isCorrect);
    }
  }

  return {
    bySection: toSortedBuckets(bySection),
    byQuestionType: toSortedBuckets(byQuestionType),
    byTag: toSortedBuckets(byTag),
  };
}
