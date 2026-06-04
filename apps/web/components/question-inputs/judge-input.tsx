"use client";

import { cx, optionStatus, statusAriaSuffix, StatusBadge } from "./shared";
import type { DisplayQuestion } from "./shared";

/** Judge (TF / 对错判断) */
export function JudgeInput({
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
  // 用题目自带的两个选项(如 一致/不一致、对/错);option.id 即 'A'/'B',
  // 与 correctOptionId 对齐,保证判分正确。无选项时回退到默认对/错(id=A/B)。
  const choices =
    options.length >= 2
      ? options.slice(0, 2)
      : [
          { id: "A", label: "A", text: "正确" },
          { id: "B", label: "B", text: "错误" },
        ];
  const glyphs = ["✓", "✗"];
  return (
    <div className="flex gap-4" role="radiogroup" aria-label="判断对错">
      {choices.map((c, i) => {
        const active = answer === c.id;
        const isCorrect = submitted && correctOptionId === c.id;
        const isWrong = submitted && active && correctOptionId !== c.id;
        const status = optionStatus(submitted, active, correctOptionId === c.id);
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${c.text}${statusAriaSuffix(status)}`}
            disabled={submitted}
            onClick={() => onAnswer(questionId, c.id)}
            className={cx(
              "relative flex h-20 w-28 flex-col items-center justify-center rounded-2xl border text-xl transition",
              active && !submitted && "border-[var(--brand)] bg-[#fff5ec]",
              !active && !submitted && "border-stone-200 bg-white hover:border-stone-400",
              isCorrect && "border-green-500 bg-green-50",
              isWrong && "border-red-400 bg-red-50",
              submitted && !active && !isCorrect && "border-stone-200 bg-stone-50 opacity-60",
            )}
          >
            <span aria-hidden="true">{glyphs[i] ?? c.label}</span>
            <span className="mt-1 text-sm text-stone-600">{c.text}</span>
            {status !== "none" ? (
              <span className="absolute -top-2 right-2">
                <StatusBadge status={status} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
