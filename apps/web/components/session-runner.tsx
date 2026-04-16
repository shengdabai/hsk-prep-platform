"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  title: string;
  stem: string;
  prompt: string;
  options: Array<{ id: string; label: string; text: string }>;
  sectionCode: string;
};

type SessionView = {
  id: string;
  setSlug: string;
  status: string;
  answers: Record<string, string>;
};

export function SessionRunner({
  session,
  questions,
}: {
  session: SessionView;
  questions: Question[];
}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") {
      return session.answers;
    }

    try {
      const saved = window.localStorage.getItem(`hsk-session-${session.id}`);
      if (!saved) {
        return session.answers;
      }
      const parsed = JSON.parse(saved) as { answers?: Record<string, string> };
      return parsed.answers ?? session.answers;
    } catch {
      return session.answers;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const current = questions[currentIndex];

  async function answer(itemId: string, optionId: string) {
    const nextAnswers = { ...answers, [itemId]: optionId };
    setAnswers(nextAnswers);
    window.localStorage.setItem(`hsk-session-${session.id}`, JSON.stringify({ answers: nextAnswers }));

    await fetch(`/api/sessions/${session.id}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, optionId }),
    });
  }

  async function submit() {
    setError(null);
    const response = await fetch(`/api/sessions/${session.id}/submit`, { method: "POST" });
    const data = (await response.json()) as { reportId?: string; error?: string };
    if (!response.ok || !data.reportId) {
      setError(data.error ?? "提交失败。");
      return;
    }
    window.localStorage.removeItem(`hsk-session-${session.id}`);
    startTransition(() => {
      router.push(`/report/${data.reportId}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-10">
      <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
        <div className="rounded-[2rem] border border-stone-900/10 bg-[#f4ece0] p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-stone-500">答题进度</div>
          <div className="mt-3 text-4xl font-semibold text-[var(--brand)]">{Object.keys(answers).length} / {questions.length}</div>
          <div className="mt-4 h-2 rounded-full bg-stone-900/10">
            <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2 rounded-[2rem] border border-stone-900/10 bg-white/75 p-4">
          {questions.map((question, index) => {
            const selected = Boolean(answers[question.id]);
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`aspect-square rounded-2xl text-sm ${
                  index === currentIndex
                    ? "bg-[var(--brand)] text-[var(--brand-soft)]"
                    : selected
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-600"
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            void submit();
          }}
          className="w-full rounded-full border border-[var(--brand)] px-5 py-3 text-sm font-medium text-[var(--brand)]"
        >
          提交评分
        </button>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </aside>

      <section className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_30px_80px_rgba(34,22,8,0.08)] md:p-8">
        <div className="flex items-center justify-between border-b border-stone-900/10 pb-5">
          <div>
            <div className="text-xs uppercase tracking-[0.26em] text-stone-500">{current.sectionCode}</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">{current.title}</h1>
          </div>
          <div className="rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-600">
            {currentIndex + 1} / {questions.length}
          </div>
        </div>
        <div className="space-y-6 pt-6">
          <div className="text-sm uppercase tracking-[0.2em] text-stone-500">{current.stem}</div>
          <div className="text-2xl leading-10 text-stone-900">{current.prompt}</div>
          <div className="grid gap-3">
            {current.options.map((option) => {
              const active = answers[current.id] === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    void answer(current.id, option.id);
                  }}
                  className={`rounded-[1.5rem] border px-5 py-4 text-left ${
                    active
                      ? "border-[var(--brand)] bg-[#fff5ec]"
                      : "border-stone-900/10 bg-white hover:border-stone-900/25"
                  }`}
                >
                  <div className="text-xs uppercase tracking-[0.2em] text-stone-500">{option.label}</div>
                  <div className="mt-2 text-lg text-stone-900">{option.text}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-stone-900/10 pt-6">
          <button
            type="button"
            onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
            disabled={currentIndex === 0}
            className="rounded-full border border-stone-900/10 px-5 py-3 text-sm disabled:opacity-40"
          >
            上一题
          </button>
          <button
            type="button"
            onClick={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))}
            disabled={currentIndex === questions.length - 1}
            className="rounded-full bg-stone-900 px-5 py-3 text-sm text-white disabled:opacity-40"
          >
            下一题
          </button>
        </div>
        {isPending ? <p className="mt-4 text-sm text-stone-500">正在跳转到报告页...</p> : null}
      </section>
    </div>
  );
}
