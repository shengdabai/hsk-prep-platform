"use client";

import Image from "next/image";
import { cx, optionStatus, statusAriaSuffix, StatusBadge } from "./shared";
import type { DisplayQuestion } from "./shared";

/** mc_image: image options */
export function McImageInput({
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="选择对应的图片">
      {options.map((opt) => {
        const active = answer === opt.id;
        const isCorrect = submitted && correctOptionId === opt.id;
        const isWrong = submitted && active && correctOptionId !== opt.id;
        const status = optionStatus(submitted, active, correctOptionId === opt.id);
        // 选项图承载题意,优先用 text 作为内容描述 alt;无 text 退回字母标号。
        const altText = opt.text ? `选项 ${opt.label}:${opt.text}` : `选项 ${opt.label} 图片`;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${altText}${statusAriaSuffix(status)}`}
            disabled={submitted}
            onClick={() => onAnswer(questionId, opt.id)}
            className={cx(
              "relative flex flex-col overflow-hidden rounded-2xl border transition",
              active && !submitted && "border-[var(--brand)] ring-2 ring-[var(--brand)]/30",
              !active && !submitted && "border-stone-200 hover:border-stone-400",
              isCorrect && "border-green-500 ring-2 ring-green-300",
              isWrong && "border-red-400 ring-2 ring-red-200",
              submitted && !active && !isCorrect && "border-stone-200 opacity-60",
            )}
          >
            {opt.imageUrl ? (
              <div className="relative aspect-video w-full">
                <Image
                  src={opt.imageUrl}
                  alt={altText}
                  fill
                  loading="lazy"
                  decoding="async"
                  sizes="(min-width: 640px) 30vw, 45vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                role="img"
                aria-label={altText}
                className="flex aspect-video w-full items-center justify-center bg-stone-100 text-stone-500 text-sm"
              >
                {opt.label}
              </div>
            )}
            <div className="flex items-center justify-center gap-2 px-3 py-2 text-center text-xs text-stone-600">
              <span>{opt.text || opt.label}</span>
              {status !== "none" ? <StatusBadge status={status} /> : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
