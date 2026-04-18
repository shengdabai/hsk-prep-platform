"use client";

import { useEffect, useEffectEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type SessionQuestion = {
  id: string;
  title: string;
  prompt: string;
  context?: string;
  visualHint?: string;
  section: string;
  part: number;
  kind: string;
  options: Array<{ id: string; label: string; text: string }>;
};

type SessionView = {
  id: string;
  sourceKind: string;
  sourceSlug: string;
  status: string;
  currentIndex: number;
  answers: Record<string, string>;
  questions: SessionQuestion[];
};

function formatTime(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function SessionRunner({
  sessionId,
  initialSession,
  initialSeconds,
}: {
  sessionId: string;
  initialSession: SessionView;
  initialSeconds: number;
}) {
  const router = useRouter();
  const [session, setSession] = useState(() => {
    if (typeof window === "undefined") {
      return initialSession;
    }

    try {
      const storageKey = `hsk-session-${sessionId}`;
      const cachedRaw = window.localStorage.getItem(storageKey);
      if (!cachedRaw) {
        return initialSession;
      }
      const cached = JSON.parse(cachedRaw) as { answers?: Record<string, string> };
      if (!cached.answers) {
        return initialSession;
      }
      return {
        ...initialSession,
        answers: { ...initialSession.answers, ...cached.answers },
      };
    } catch {
      return initialSession;
    }
  });
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const question = session.questions[session.currentIndex];
  const storageKey = `hsk-session-${sessionId}`;
  const completionRate = useMemo(
    () =>
      session.questions.length
        ? Object.keys(session.answers).length / session.questions.length
        : 0,
    [session.answers, session.questions.length],
  );

  async function submitNow() {
    const response = await fetch(`/api/sessions/${sessionId}/submit`, { method: "POST" });
    const data = (await response.json()) as { reportId?: string; error?: string };

    if (!response.ok || !data.reportId) {
      setSubmitError(data.error ?? "提交失败，请重试。");
      return;
    }

    localStorage.removeItem(storageKey);
    router.push(`/report/${data.reportId}`);
    router.refresh();
  }

  const handleTimerExpiry = useEffectEvent(async () => {
    await submitNow();
  });

  useEffect(() => {
    const handle = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(handle);
          void handleTimerExpiry();
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(handle);
  }, []);

  async function persistAnswer(questionId: string, answer: string, currentIndex: number) {
    const nextAnswers = { ...session.answers, [questionId]: answer };
    setSession((prev) => ({ ...prev, answers: nextAnswers, currentIndex }));
    localStorage.setItem(storageKey, JSON.stringify({ answers: nextAnswers }));

    startTransition(async () => {
      await fetch(`/api/sessions/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answer, currentIndex }),
      });
    });
  }

  function moveTo(index: number) {
    setSession((prev) => ({
      ...prev,
      currentIndex: Math.min(prev.questions.length - 1, Math.max(0, index)),
    }));
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-10">
      <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
        <div className="rounded-[2rem] border border-stone-900/10 bg-[#f4ece0] p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-stone-500">答题中</div>
          <div className="mt-3 text-4xl font-semibold text-[#9f3215]">{formatTime(secondsLeft)}</div>
          <div className="mt-2 text-sm text-stone-600">本地 + 服务端双重保存</div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-stone-900/10">
            <div
              className="h-full rounded-full bg-[#9f3215] transition-all"
              style={{ width: `${completionRate * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 rounded-[2rem] border border-stone-900/10 bg-white/75 p-4">
          {session.questions.map((entry, index) => {
            const answered = Boolean(session.answers[entry.id]);
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => moveTo(index)}
                className={`aspect-square rounded-2xl text-sm transition ${
                  index === session.currentIndex
                    ? "bg-[#9f3215] text-[#fff3df]"
                    : answered
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
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
            void submitNow();
          }}
          className="w-full rounded-full border border-[#9f3215] px-5 py-3 text-sm font-medium text-[#9f3215] transition hover:bg-[#9f3215] hover:text-[#fff3df]"
        >
          提交并生成报告
        </button>
        {submitError ? <p className="text-sm text-red-700">{submitError}</p> : null}
      </aside>

      <section className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_30px_80px_rgba(34,22,8,0.08)] md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-900/10 pb-5">
          <div>
            <div className="text-xs uppercase tracking-[0.26em] text-stone-500">
              {question.section} / Part {question.part}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">{question.title}</h1>
          </div>
          <div className="rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-600">
            {session.currentIndex + 1} / {session.questions.length}
          </div>
        </div>

        <div className="space-y-6 pt-6">
          {question.context ? (
            <div className="rounded-[1.5rem] bg-[#f6f1ea] p-5 text-sm leading-7 text-stone-600">
              {question.context}
            </div>
          ) : null}

          {question.visualHint ? (
            question.visualHint.startsWith("/") ? (
              <div className="flex justify-center rounded-[1.75rem] overflow-hidden border border-stone-900/10 bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={question.visualHint}
                  alt={question.prompt || "题目图片"}
                  className="max-h-72 w-auto object-contain"
                />
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-stone-900/15 bg-[linear-gradient(135deg,#efe4d4,#f8f4ef)] p-6 text-sm leading-7 text-stone-600">
                <span className="font-medium text-stone-900">🔊 音频题：</span> {question.visualHint}
              </div>
            )
          ) : null}

          <div className="text-2xl leading-10 text-stone-900">{question.prompt}</div>

          <div className="grid gap-3">
            {question.options.map((option) => {
              const selected = session.answers[question.id] === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    void persistAnswer(question.id, option.id, session.currentIndex);
                  }}
                  className={`rounded-[1.5rem] border px-5 py-4 text-left transition ${
                    selected
                      ? "border-[#9f3215] bg-[#fff5ec] shadow-[0_10px_40px_rgba(159,50,21,0.1)]"
                      : "border-stone-900/10 bg-white hover:border-stone-900/25 hover:bg-stone-50"
                  }`}
                >
                  <div className="text-xs uppercase tracking-[0.26em] text-stone-500">{option.label}</div>
                  <div className="mt-2 text-lg text-stone-900">{option.text}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-stone-900/10 pt-6">
          <button
            type="button"
            onClick={() => moveTo(session.currentIndex - 1)}
            disabled={session.currentIndex === 0}
            className="rounded-full border border-stone-900/10 px-5 py-3 text-sm transition hover:border-stone-900/30 disabled:cursor-not-allowed disabled:opacity-35"
          >
            上一题
          </button>
          <button
            type="button"
            onClick={() => moveTo(session.currentIndex + 1)}
            disabled={session.currentIndex === session.questions.length - 1}
            className="rounded-full bg-stone-900 px-5 py-3 text-sm text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-35"
          >
            下一题
          </button>
        </div>

        {isPending ? <p className="mt-4 text-sm text-stone-500">答案已提交到服务端...</p> : null}
      </section>
    </div>
  );
}
