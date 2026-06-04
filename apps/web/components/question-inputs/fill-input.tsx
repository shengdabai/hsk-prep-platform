"use client";

import { McInput } from "./mc-input";
import type { DisplayQuestion } from "./shared";

/** fill: 选词填空复用 MC UI;无选项的听后填空(L_LONG_FILL)用文本输入框 */
export function FillInput({
  questionId,
  options,
  answer,
  submitted,
  correctOptionId,
  onAnswer,
}: {
  questionId: string;
  options: DisplayQuestion["options"];
  answer: string | undefined;
  submitted: boolean;
  correctOptionId?: string | null;
  onAnswer: (id: string, val: string) => void;
}) {
  // 无选项填空(如听后填空):答案为自由文本,按 answerText 判分,渲染单行文本输入。
  if (!options || options.length === 0) {
    return (
      <input
        type="text"
        disabled={submitted}
        value={answer ?? ""}
        onChange={(e) => onAnswer(questionId, e.target.value)}
        placeholder="请输入听到的答案"
        className="w-full rounded-2xl border border-stone-200 bg-white px-5 py-4 text-lg text-stone-900 placeholder:text-stone-400 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 disabled:bg-stone-50 disabled:opacity-70"
      />
    );
  }
  return (
    <McInput
      questionId={questionId}
      options={options}
      answer={answer}
      submitted={submitted}
      correctOptionId={correctOptionId}
      onAnswer={onAnswer}
    />
  );
}
