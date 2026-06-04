"use client";

import type { DisplayQuestion } from "./shared";

/** match: simplified dropdown matching */
export function MatchInput({
  questionId,
  options,
  answer,
  submitted,
  onAnswer,
}: {
  questionId: string;
  options: DisplayQuestion["options"];
  answer: string | undefined;
  submitted: boolean;
  onAnswer: (id: string, val: string) => void;
}) {
  // answer is stored as JSON: Record<string, string> {leftId: rightId}
  // For simplicity we treat each option as a "left" item and let user
  // pick one from the pool as "right". Since we don't have two-side data,
  // we fall back to a single select among the option texts.
  return (
    <div className="grid gap-3">
      {options.map((opt) => (
        <div key={opt.id} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
          <span className="min-w-[2rem] text-xs font-medium text-stone-500">{opt.label}</span>
          <span className="flex-1 text-stone-900">{opt.text}</span>
          <select
            disabled={submitted}
            aria-label={`为「${opt.text || opt.label}」选择匹配项`}
            value={answer === opt.id ? opt.id : ""}
            onChange={(e) => onAnswer(questionId, e.target.value)}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-700 disabled:opacity-60"
          >
            <option value="">选择匹配项…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
