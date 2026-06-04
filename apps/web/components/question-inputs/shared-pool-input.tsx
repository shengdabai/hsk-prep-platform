"use client";

import { cx, optionStatus, statusAriaSuffix, StatusBadge } from "./shared";
import type { DisplayQuestion } from "./shared";

/**
 * 共享选项池(A-F 六选共享):一组题干共用一个公共选项区。
 * - 渲染完整池(本题 options 即全集),按 poolOptionIds 顺序展示。
 * - 同组其他题已选走的选项(takenOptionIds)在本题禁用(置灰),实现"选过不能再选"。
 * - 组内唯一由"禁用已占用项"前端约束 + 单选语义共同保证。
 * - 提交后:正确项绿、错选红、未选正确项给出提示,口径与既有 MC 一致。
 */
export function SharedPoolInput({
  questionId,
  options,
  poolOptionIds,
  takenOptionIds,
  answer,
  submitted,
  correctOptionId,
  onAnswer,
}: {
  questionId: string;
  options: DisplayQuestion["options"];
  poolOptionIds: string[];
  takenOptionIds: string[];
  answer: string | undefined;
  submitted: boolean;
  correctOptionId?: string | null;
  onAnswer: (id: string, val: string) => void;
}) {
  // 按池组声明的顺序渲染;池顺序权威来自 poolOptionIds,options 提供文本。
  const byId = Object.fromEntries(options.map((o) => [o.id, o]));
  const ordered =
    poolOptionIds.length > 0
      ? poolOptionIds.map((id) => byId[id]).filter(Boolean)
      : options;
  const takenSet = new Set(takenOptionIds);
  return (
    <div className="grid gap-3" role="radiogroup" aria-label="从公共选项中选择(每项只能用一次)">
      <div className="text-xs uppercase tracking-[0.18em] text-stone-500">
        从下面的公共选项中选择(每项只能用一次)
      </div>
      {ordered.map((opt) => {
        const active = answer === opt.id;
        // 被同组其他题占用且非本题当前所选 → 禁用(选过不能再选)。
        const lockedByOther = !active && takenSet.has(opt.id);
        const disabled = submitted || lockedByOther;
        const isCorrect = submitted && correctOptionId === opt.id;
        const isWrong = submitted && active && correctOptionId !== opt.id;
        const status = optionStatus(submitted, active, correctOptionId === opt.id);
        const lockSuffix = lockedByOther && !submitted ? "(已被其他题选用)" : "";
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={disabled}
            aria-label={`选项 ${opt.label}:${opt.text}${lockSuffix}${statusAriaSuffix(status)}`}
            disabled={disabled}
            onClick={() => onAnswer(questionId, opt.id)}
            className={cx(
              "flex items-center gap-3 rounded-[1.5rem] border px-5 py-4 text-left transition",
              active && !submitted && "border-[var(--brand)] bg-[#fff5ec]",
              !active && !submitted && !lockedByOther && "border-stone-900/10 bg-white hover:border-stone-900/25",
              lockedByOther && !submitted && "border-stone-200 bg-stone-100 opacity-45",
              isCorrect && "border-green-500 bg-green-50",
              isWrong && "border-red-400 bg-red-50",
              submitted && !active && !isCorrect && "border-stone-200 bg-stone-50 opacity-60",
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600">
              {opt.label}
            </span>
            <span className="flex-1 text-lg text-stone-900">{opt.text}</span>
            {status !== "none" ? <StatusBadge status={status} /> : null}
            {lockedByOther && !submitted ? (
              <span className="text-xs text-stone-500">已被选</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
