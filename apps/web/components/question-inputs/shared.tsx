"use client";

import type { DisplayQuestion } from "../../lib/view-models";

// C5 单一来源:DisplayQuestion / DisplayOption 由 lib/view-models 单点定义,
// 此处仅 re-export 供各输入子组件与 question-view 复用,避免类型漂移。
export type { DisplayOption, DisplayQuestion } from "../../lib/view-models";

// ─── Helper ────────────────────────────────────────────────────────────────────
export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * 提交后选项的正误状态(不只靠颜色:返回图标 + 文字 + 屏读 label)。
 * - correct: 该项是正确答案
 * - wrong: 用户选了且错了
 * - none: 普通态
 */
export type OptionStatus = "correct" | "wrong" | "none";

export function optionStatus(
  submitted: boolean,
  active: boolean,
  isCorrectOption: boolean,
): OptionStatus {
  if (!submitted) return "none";
  if (isCorrectOption) return "correct";
  if (active) return "wrong";
  return "none";
}

/** 提交后给选项加 aria-label 后缀,屏读器据此读出正误(不只靠颜色)。 */
export function statusAriaSuffix(status: OptionStatus): string {
  if (status === "correct") return "(正确答案)";
  if (status === "wrong") return "(你的答案,错误)";
  return "";
}

/** 提交后正误小徽标:图标 + 文字,色盲/读屏用户也能区分。 */
export function StatusBadge({ status }: { status: OptionStatus }) {
  if (status === "correct") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        <span aria-hidden="true">✓</span>正确
      </span>
    );
  }
  if (status === "wrong") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        <span aria-hidden="true">✗</span>错误
      </span>
    );
  }
  return null;
}

// 各输入子组件共享的 props 基底(answerFormat 分发型题型)。
export type BaseInputProps = {
  questionId: string;
  options: DisplayQuestion["options"];
  answer: string | undefined;
  submitted: boolean;
  correctOptionId?: string | null;
  onAnswer: (id: string, val: string) => void;
};
