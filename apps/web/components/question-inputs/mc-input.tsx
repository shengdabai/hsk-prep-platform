"use client";

import { cx, optionStatus, statusAriaSuffix, StatusBadge } from "./shared";
import type { DisplayQuestion } from "./shared";

/** MC3 / MC4 text options */
export function McInput({
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
  return (
    <div className="grid gap-3" role="radiogroup" aria-label="选择答案">
      {options.map((opt) => {
        const active = answer === opt.id;
        const isCorrect = submitted && correctOptionId === opt.id;
        const isWrong = submitted && active && correctOptionId !== opt.id;
        const status = optionStatus(submitted, active, correctOptionId === opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`选项 ${opt.label}:${opt.text}${statusAriaSuffix(status)}`}
            disabled={submitted}
            onClick={() => onAnswer(questionId, opt.id)}
            className={cx(
              "rounded-[1.5rem] border px-5 py-4 text-left transition",
              active && !submitted && "border-[var(--brand)] bg-[#fff5ec]",
              !active && !submitted && "border-stone-900/10 bg-white hover:border-stone-900/25",
              isCorrect && "border-green-500 bg-green-50",
              isWrong && "border-red-400 bg-red-50",
              submitted && !active && !isCorrect && "border-stone-200 bg-stone-50 opacity-60",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.2em] text-stone-500">{opt.label}</div>
              {status !== "none" ? <StatusBadge status={status} /> : null}
            </div>
            <div className="mt-2 text-lg text-stone-900">{opt.text}</div>
          </button>
        );
      })}
    </div>
  );
}
