"use client";

import { useMemo } from "react";
import type { DisplayQuestion } from "./shared";

/** order: reorder list with up/down buttons */
export function OrderInput({
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
  // answer 存为逗号分隔的 option id 顺序。直接由 answer 派生当前顺序(move 会立即
  // onAnswer 回写,父组件更新 answer → 重新派生),无需本地 state / effect。
  const order = useMemo<string[]>(() => {
    if (answer) {
      const ids = answer.split(",").filter(Boolean);
      if (ids.length === options.length) return ids;
    }
    return options.map((o) => o.id);
  }, [answer, options]);

  const move = (idx: number, dir: -1 | 1) => {
    if (submitted) return;
    const next = [...order];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onAnswer(questionId, next.join(","));
  };

  const optMap = Object.fromEntries(options.map((o) => [o.id, o]));

  return (
    <div className="grid gap-2">
      {order.map((id, idx) => {
        const opt = optMap[id];
        if (!opt) return null;
        return (
          <div
            key={id}
            className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">
              {idx + 1}
            </span>
            <span className="flex-1 text-stone-900">{opt.text}</span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={submitted || idx === 0}
                onClick={() => move(idx, -1)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-500 disabled:opacity-30"
                aria-label="上移"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={submitted || idx === order.length - 1}
                onClick={() => move(idx, 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-500 disabled:opacity-30"
                aria-label="下移"
              >
                ↓
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
