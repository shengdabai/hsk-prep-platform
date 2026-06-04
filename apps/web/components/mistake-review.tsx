"use client";

import { useState, useTransition } from "react";

import type { MistakeEntry, ReviewGrade } from "@hsk/shared";

type ReviewState =
  | { status: "idle" }
  | { status: "reviewing" }
  | { status: "done"; updated: MistakeEntry }
  | { status: "error"; message: string };

const GRADE_CONFIG: {
  grade: ReviewGrade;
  label: string;
  description: string;
  className: string;
}[] = [
  {
    grade: "again",
    label: "再来一次",
    description: "完全不记得",
    className:
      "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  },
  {
    grade: "hard",
    label: "困难",
    description: "想起来了但很费力",
    className:
      "border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
  },
  {
    grade: "good",
    label: "良好",
    description: "稍有犹豫后想起",
    className:
      "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  },
  {
    grade: "easy",
    label: "简单",
    description: "立刻想起来了",
    className:
      "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
  },
];

function formatDue(isoDate: string | undefined): string {
  if (!isoDate) return "立即";
  const d = new Date(isoDate);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays <= 0) return "立即";
  if (diffDays === 1) return "明天";
  return `${diffDays} 天后`;
}

export function MistakeReviewCard({ item }: { item: MistakeEntry }) {
  const [state, setState] = useState<ReviewState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  function handleGrade(grade: ReviewGrade) {
    startTransition(async () => {
      setState({ status: "reviewing" });
      try {
        const res = await fetch("/api/mistakes/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: item.itemId, grade }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setState({
            status: "error",
            message: body.error ?? `请求失败 (${res.status})`,
          });
          return;
        }
        const data = (await res.json()) as { mistake: MistakeEntry };
        setState({ status: "done", updated: data.mistake });
      } catch {
        setState({ status: "error", message: "网络错误，请重试。" });
      }
    });
  }

  const isBusy = isPending || state.status === "reviewing";

  if (state.status === "done") {
    const { updated } = state;
    return (
      <div className="rounded-[1.7rem] border border-stone-900/10 bg-white/80 p-5">
        <div className="text-xs uppercase tracking-[0.24em] text-stone-500">
          {item.levelCode} / {item.sectionCode} / {item.setSlug}
        </div>
        <div className="mt-2 text-sm text-stone-600">{item.itemId}</div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-500">
          <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">
            已评分 ✓
          </span>
          <span>下次复习：{formatDue(updated.dueAt)}</span>
          <span>间隔 {updated.intervalDays ?? 1} 天</span>
          <span>已复习 {updated.repetitions ?? 0} 次</span>
          {updated.mastered && (
            <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-[var(--brand)] font-medium">
              已掌握
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.7rem] border border-stone-900/10 bg-white/80 p-5">
      <div className="text-xs uppercase tracking-[0.24em] text-stone-500">
        {item.levelCode} / {item.sectionCode} / {item.setSlug}
      </div>
      <div className="mt-3 text-sm font-medium text-stone-900">{item.itemId}</div>

      {/* SRS 状态行 */}
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500">
        <span>
          到期：
          <span
            className={
              !item.dueAt || new Date(item.dueAt) <= new Date()
                ? "font-medium text-red-600"
                : "text-stone-600"
            }
          >
            {formatDue(item.dueAt)}
          </span>
        </span>
        <span>已复习 {item.repetitions ?? 0} 次</span>
        <span>
          状态：
          {item.mastered ? (
            <span className="font-medium text-green-600">已掌握</span>
          ) : (
            <span className="font-medium text-amber-600">待复习</span>
          )}
        </span>
      </div>

      {state.status === "error" && (
        <div className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-xs text-red-700">
          {state.message}
        </div>
      )}

      {/* 评级按钮组 */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {GRADE_CONFIG.map(({ grade, label, description, className }) => (
          <button
            key={grade}
            type="button"
            disabled={isBusy}
            onClick={() => handleGrade(grade)}
            className={`rounded-2xl px-3 py-2.5 text-center text-xs transition-colors disabled:opacity-50 ${className}`}
          >
            <div className="font-medium">{label}</div>
            <div className="mt-0.5 opacity-70">{description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
