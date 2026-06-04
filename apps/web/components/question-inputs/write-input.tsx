"use client";

/** write_char / write_sentence / write_essay: textarea */
export function WriteInput({
  questionId,
  answer,
  submitted,
  rows,
  placeholder,
  onAnswer,
}: {
  questionId: string;
  answer: string | undefined;
  submitted: boolean;
  rows: number;
  placeholder: string;
  onAnswer: (id: string, val: string) => void;
}) {
  return (
    <textarea
      disabled={submitted}
      value={answer ?? ""}
      onChange={(e) => onAnswer(questionId, e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full resize-y rounded-2xl border border-stone-200 bg-white px-5 py-4 text-lg text-stone-900 placeholder:text-stone-400 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 disabled:bg-stone-50 disabled:opacity-70"
    />
  );
}
