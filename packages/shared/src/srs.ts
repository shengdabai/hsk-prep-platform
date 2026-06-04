import type { MistakeEntry, ReviewGrade } from "./types";

// SM-2 间隔重复算法(SuperMemo 2)的纯函数实现。
// 参考标准 SM-2:
//   - quality(q) 取值 0..5;本平台四档评分映射为:
//       again → 2(未答对,会重置 repetitions),hard → 3,good → 4,easy → 5
//   - easeFactor(EF) 更新公式:EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
//     并夹在下限 1.3(EF 不设上限,SM-2 原文亦无上限)。
//   - q < 3 视为"未通过",repetitions 归零,interval 重置为 1 天。
//   - q >= 3 视为"通过":
//       repetitions === 0 → interval = 1
//       repetitions === 1 → interval = 6
//       repetitions >= 2  → interval = round(prevInterval * EF')
// 所有时间用 ISO 字符串(new Date().toISOString())表达。

// SRS 默认初始值(错题首次入库时使用)。
export const SRS_DEFAULT_EASE_FACTOR = 2.5;
export const SRS_MIN_EASE_FACTOR = 1.3;

// 四档评分 → SM-2 quality(0..5)。
const GRADE_QUALITY: Record<ReviewGrade, number> = {
  again: 2,
  hard: 3,
  good: 4,
  easy: 5,
};

// SRS 调度可读写的最小字段子集(MistakeEntry 的 SRS 部分)。
export type SrsState = {
  easeFactor?: number;
  intervalDays?: number;
  repetitions?: number;
  dueAt?: string;
  lastReviewedAt?: string;
};

// 计算结果:始终返回完整的 SRS 字段(供调用方写回 MistakeEntry)。
export type SrsSchedule = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueAt: string;
  lastReviewedAt: string;
};

function clampEaseFactor(ef: number): number {
  return ef < SRS_MIN_EASE_FACTOR ? SRS_MIN_EASE_FACTOR : ef;
}

// 在 from 时间基础上加 days 天,返回 ISO 字符串。
function addDaysIso(fromIso: string, days: number): string {
  const base = new Date(fromIso);
  const ms = base.getTime();
  // 非法日期回退到当前时间,保证函数纯粹且不抛。
  const safeMs = Number.isNaN(ms) ? Date.now() : ms;
  return new Date(safeMs + days * 24 * 60 * 60 * 1000).toISOString();
}

// SM-2 核心:根据上一状态与本次评分,计算下一次复习计划。
// prev 可只提供部分字段(全 optional),缺失时用 SRS 默认值兜底,
// 因此可安全用于"首次复习"(prev 来自仅初始化过 dueAt/easeFactor 的错题)。
// nowIso 默认取当前时间,显式传入便于测试与确定性调度。
export function scheduleSrs(
  prev: SrsState | null | undefined,
  grade: ReviewGrade,
  nowIso: string = new Date().toISOString(),
): SrsSchedule {
  const quality = GRADE_QUALITY[grade];
  const prevEase = prev?.easeFactor ?? SRS_DEFAULT_EASE_FACTOR;
  const prevReps = prev?.repetitions ?? 0;
  const prevInterval = prev?.intervalDays ?? 0;

  // EF 更新(SM-2 原公式)。
  const nextEase = clampEaseFactor(
    prevEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  let repetitions: number;
  let intervalDays: number;

  if (quality < 3) {
    // 未通过:重置学习进度,1 天后再来。
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions = prevReps + 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      // 已有间隔为 0(异常/首学)时退回 6 天基准,避免乘出 0。
      const baseInterval = prevInterval > 0 ? prevInterval : 6;
      intervalDays = Math.round(baseInterval * nextEase);
    }
  }

  return {
    easeFactor: nextEase,
    intervalDays,
    repetitions,
    dueAt: addDaysIso(nowIso, intervalDays),
    lastReviewedAt: nowIso,
  };
}

// 错题首次入库时的 SRS 初始化(dueAt = 今日,easeFactor = 2.5,尚未复习)。
// createdAtIso 既作为 dueAt(今日可复习)也作为时间锚点。
export function initialSrsState(createdAtIso: string): SrsSchedule {
  return {
    easeFactor: SRS_DEFAULT_EASE_FACTOR,
    intervalDays: 0,
    repetitions: 0,
    dueAt: createdAtIso,
    lastReviewedAt: createdAtIso,
  };
}

// 判断一条错题是否到期(dueAt <= now)。无 dueAt 的旧数据视为已到期(立即可复习)。
export function isMistakeDue(
  entry: Pick<MistakeEntry, "dueAt">,
  nowIso: string = new Date().toISOString(),
): boolean {
  if (!entry.dueAt) {
    return true;
  }
  const due = new Date(entry.dueAt).getTime();
  if (Number.isNaN(due)) {
    return true;
  }
  return due <= new Date(nowIso).getTime();
}
