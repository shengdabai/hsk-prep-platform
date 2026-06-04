"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AnswerFormat } from "@hsk/shared";
import { QuestionView } from "./question-view";
import type { DisplayQuestion } from "./question-view";

// ─── Types that match ActiveDisplayItem from view-models.ts ────────────────────
type Question = {
  id: string;
  title: string;
  stem: string;
  prompt: string;
  sectionCode: string;
  questionTypeCode: string;
  answerFormat: AnswerFormat;
  needsAudio: boolean;
  needsImage: boolean;
  audioUrl?: string | null;
  imageUrl?: string | null;
  context?: string | null;
  part?: number | null;
  options: Array<{ id: string; label: string; text: string; imageUrl?: string | null }>;
  // 共享选项池(A-F 六选共享);无则为 null,该题走原渲染。
  sharedOptionPool?: { groupId: string; poolOptionIds: string[] } | null;
  // submitted-only fields (absent while active, present after submission)
  explanation?: string | null;
  correctOptionId?: string | null;
};

type SessionView = {
  id: string;
  setSlug: string;
  status: string;
  answers: Record<string, string>;
};

// ─── SessionRunner ─────────────────────────────────────────────────────────────
export function SessionRunner({
  session,
  questions,
}: {
  session: SessionView;
  questions: Question[];
}) {
  const router = useRouter();
  const submitted = session.status === "submitted";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return session.answers;
    try {
      const saved = window.localStorage.getItem(`hsk-session-${session.id}`);
      if (!saved) return session.answers;
      const parsed = JSON.parse(saved) as { answers?: Record<string, string> };
      return parsed.answers ?? session.answers;
    } catch {
      return session.answers;
    }
  });
  const [error, setError] = useState<string | null>(null);
  // 记录后端未保存成功的答案(itemId → 该题的值),用于可感知提示 + 重试。
  // 本地 state + localStorage 始终先落,网络失败不丢用户选择。
  const [unsavedAnswers, setUnsavedAnswers] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const current = questions[currentIndex];

  async function persistAnswer(itemId: string, value: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/sessions/${session.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, optionId: value }),
      });
      if (!response.ok) {
        throw new Error(`保存失败(${response.status})`);
      }
      // 保存成功:从未保存集合中移除该题。
      setUnsavedAnswers((prev) => {
        if (!(itemId in prev)) return prev;
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      return true;
    } catch {
      // 失败:记入未保存集合,UI 提示用户可重试,答案已在本地保留。
      setUnsavedAnswers((prev) => ({ ...prev, [itemId]: value }));
      return false;
    }
  }

  async function answer(itemId: string, value: string) {
    const nextAnswers = { ...answers, [itemId]: value };
    setAnswers(nextAnswers);
    window.localStorage.setItem(
      `hsk-session-${session.id}`,
      JSON.stringify({ answers: nextAnswers }),
    );
    await persistAnswer(itemId, value);
  }

  async function retryUnsaved() {
    const pending = Object.entries(unsavedAnswers);
    for (const [itemId, value] of pending) {
      // 用最新的本地答案重试(用户可能在失败后又改了答案)。
      await persistAnswer(itemId, answers[itemId] ?? value);
    }
  }

  async function submit() {
    setError(null);
    // 提交前尽量补存未保存的答案,避免漏判。
    if (Object.keys(unsavedAnswers).length > 0) {
      await retryUnsaved();
    }
    let response: Response;
    try {
      response = await fetch(`/api/sessions/${session.id}/submit`, {
        method: "POST",
      });
    } catch {
      setError("网络异常,提交失败,请检查网络后重试。");
      return;
    }
    let data: { reportId?: string; error?: string } = {};
    try {
      data = (await response.json()) as { reportId?: string; error?: string };
    } catch {
      // 响应非 JSON(如网关错误页),走下方通用错误分支。
    }
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

  // Build the DisplayQuestion shape expected by QuestionView
  const displayQuestion: DisplayQuestion = {
    ...current,
    answerFormat: current.answerFormat,
    needsAudio: current.needsAudio,
    needsImage: current.needsImage,
    audioUrl: current.audioUrl ?? null,
    imageUrl: current.imageUrl ?? null,
    context: current.context ?? null,
    part: current.part ?? null,
    sharedOptionPool: current.sharedOptionPool ?? null,
    explanation: submitted ? (current.explanation ?? null) : null,
    correctOptionId: submitted ? (current.correctOptionId ?? null) : null,
  };

  // 共享选项池:本题属于某个池组时,收集同组其他题已选走的池选项,
  // 传给 QuestionView 以禁用这些选项(实现"选过不能再选"+ 组内唯一)。
  // 非池题该值为空数组,不影响原渲染。
  const takenOptionIds = current.sharedOptionPool
    ? questions
        .filter(
          (q) =>
            q.id !== current.id &&
            q.sharedOptionPool?.groupId === current.sharedOptionPool?.groupId,
        )
        .map((q) => answers[q.id])
        .filter((v): v is string => Boolean(v))
    : [];

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-10">
      {/* ── Sidebar ── */}
      <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
        <div className="rounded-[2rem] border border-stone-900/10 bg-[#f4ece0] p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-stone-500">答题进度</div>
          <div className="mt-3 text-4xl font-semibold text-[var(--brand)]">
            {Object.keys(answers).length} / {questions.length}
          </div>
          <div className="mt-4 h-2 rounded-full bg-stone-900/10">
            <div
              className="h-full rounded-full bg-[var(--brand)]"
              style={{
                width: `${(Object.keys(answers).length / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Question grid navigator */}
        <div className="grid grid-cols-5 gap-2 rounded-[2rem] border border-stone-900/10 bg-white/75 p-4">
          {questions.map((q, index) => {
            const selected = Boolean(answers[q.id]);
            return (
              <button
                key={q.id}
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

        {!submitted ? (
          <button
            type="button"
            onClick={() => { void submit(); }}
            className="w-full rounded-full border border-[var(--brand)] px-5 py-3 text-sm font-medium text-[var(--brand)]"
          >
            提交评分
          </button>
        ) : null}

        {Object.keys(unsavedAnswers).length > 0 && !submitted ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p>
              有 {Object.keys(unsavedAnswers).length} 题未能同步到服务器(答案已暂存在本机)。
            </p>
            <button
              type="button"
              onClick={() => { void retryUnsaved(); }}
              className="mt-3 rounded-full border border-amber-500 px-4 py-2 text-xs font-medium text-amber-800"
            >
              重试同步
            </button>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </aside>

      {/* ── Main question panel ── */}
      <section className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_30px_80px_rgba(34,22,8,0.08)] md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-900/10 pb-5">
          <div>
            <div className="text-xs uppercase tracking-[0.26em] text-stone-500">
              {current.sectionCode}
              {current.part != null ? ` · 第 ${current.part} 部分` : ""}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
              {current.title}
            </h1>
          </div>
          <div className="rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-600">
            {currentIndex + 1} / {questions.length}
          </div>
        </div>

        {/* Stem */}
        {current.stem ? (
          <div className="mt-5 text-sm uppercase tracking-[0.2em] text-stone-500">
            {current.stem}
          </div>
        ) : null}

        {/* Question body + answer UI */}
        <div className="pt-5">
          <QuestionView
            question={displayQuestion}
            answer={answers[current.id]}
            submitted={submitted}
            onAnswer={(itemId, value) => { void answer(itemId, value); }}
            takenOptionIds={takenOptionIds}
          />
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-stone-900/10 pt-6">
          <button
            type="button"
            onClick={() => setCurrentIndex((v) => Math.max(0, v - 1))}
            disabled={currentIndex === 0}
            className="rounded-full border border-stone-900/10 px-5 py-3 text-sm disabled:opacity-40"
          >
            上一题
          </button>
          <button
            type="button"
            onClick={() => setCurrentIndex((v) => Math.min(questions.length - 1, v + 1))}
            disabled={currentIndex === questions.length - 1}
            className="rounded-full bg-stone-900 px-5 py-3 text-sm text-white disabled:opacity-40"
          >
            下一题
          </button>
        </div>

        {isPending ? (
          <p className="mt-4 text-sm text-stone-500">正在跳转到报告页...</p>
        ) : null}
      </section>
    </div>
  );
}
