"use client";

import { useMemo, useState } from "react";
import type { AnswerFormat } from "@hsk/shared";
import { AudioPlayer } from "./audio-player";

// ─── Shared display item shape (matches what view-models.ts exports) ───────────
export type DisplayQuestion = {
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
  // 共享选项池(A-F 六选共享)。存在时该题 options 即完整池;否则走原渲染。
  sharedOptionPool?: { groupId: string; poolOptionIds: string[] } | null;
  // submitted-only fields
  explanation?: string | null;
  correctOptionId?: string | null;
};

type QuestionViewProps = {
  question: DisplayQuestion;
  answer: string | undefined;
  submitted: boolean;
  onAnswer: (itemId: string, value: string) => void;
  // 共享池题专用:同组其他题已选走的池选项 id(本题需禁用)。非池题忽略。
  takenOptionIds?: string[];
};

// ─── Helper ────────────────────────────────────────────────────────────────────
function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Judge (TF / 对错判断) */
function JudgeInput({
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
  // 用题目自带的两个选项(如 一致/不一致、对/错);option.id 即 'A'/'B',
  // 与 correctOptionId 对齐,保证判分正确。无选项时回退到默认对/错(id=A/B)。
  const choices =
    options.length >= 2
      ? options.slice(0, 2)
      : [
          { id: "A", label: "A", text: "正确" },
          { id: "B", label: "B", text: "错误" },
        ];
  const glyphs = ["✓", "✗"];
  return (
    <div className="flex gap-4">
      {choices.map((c, i) => {
        const active = answer === c.id;
        const isCorrect = submitted && correctOptionId === c.id;
        const isWrong = submitted && active && correctOptionId !== c.id;
        return (
          <button
            key={c.id}
            type="button"
            disabled={submitted}
            onClick={() => onAnswer(questionId, c.id)}
            className={cx(
              "flex h-20 w-28 flex-col items-center justify-center rounded-2xl border text-xl transition",
              active && !submitted && "border-[var(--brand)] bg-[#fff5ec]",
              !active && !submitted && "border-stone-200 bg-white hover:border-stone-400",
              isCorrect && "border-green-500 bg-green-50",
              isWrong && "border-red-400 bg-red-50",
              submitted && !active && !isCorrect && "border-stone-200 bg-stone-50 opacity-60",
            )}
          >
            <span>{glyphs[i] ?? c.label}</span>
            <span className="mt-1 text-sm text-stone-600">{c.text}</span>
          </button>
        );
      })}
    </div>
  );
}

/** MC3 / MC4 text options */
function McInput({
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
    <div className="grid gap-3">
      {options.map((opt) => {
        const active = answer === opt.id;
        const isCorrect = submitted && correctOptionId === opt.id;
        const isWrong = submitted && active && correctOptionId !== opt.id;
        return (
          <button
            key={opt.id}
            type="button"
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
            <div className="text-xs uppercase tracking-[0.2em] text-stone-500">{opt.label}</div>
            <div className="mt-2 text-lg text-stone-900">{opt.text}</div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 共享选项池(A-F 六选共享):一组题干共用一个公共选项区。
 * - 渲染完整池(本题 options 即全集),按 poolOptionIds 顺序展示。
 * - 同组其他题已选走的选项(takenOptionIds)在本题禁用(置灰),实现"选过不能再选"。
 * - 组内唯一由"禁用已占用项"前端约束 + 单选语义共同保证。
 * - 提交后:正确项绿、错选红、未选正确项给出提示,口径与既有 MC 一致。
 */
function SharedPoolInput({
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
    <div className="grid gap-3">
      <div className="text-xs uppercase tracking-[0.18em] text-stone-400">
        从下面的公共选项中选择(每项只能用一次)
      </div>
      {ordered.map((opt) => {
        const active = answer === opt.id;
        // 被同组其他题占用且非本题当前所选 → 禁用(选过不能再选)。
        const lockedByOther = !active && takenSet.has(opt.id);
        const disabled = submitted || lockedByOther;
        const isCorrect = submitted && correctOptionId === opt.id;
        const isWrong = submitted && active && correctOptionId !== opt.id;
        return (
          <button
            key={opt.id}
            type="button"
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
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">
              {opt.label}
            </span>
            <span className="flex-1 text-lg text-stone-900">{opt.text}</span>
            {lockedByOther && !submitted ? (
              <span className="text-xs text-stone-400">已被选</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** mc_image: image options */
function McImageInput({
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((opt) => {
        const active = answer === opt.id;
        const isCorrect = submitted && correctOptionId === opt.id;
        const isWrong = submitted && active && correctOptionId !== opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={submitted}
            onClick={() => onAnswer(questionId, opt.id)}
            className={cx(
              "flex flex-col overflow-hidden rounded-2xl border transition",
              active && !submitted && "border-[var(--brand)] ring-2 ring-[var(--brand)]/30",
              !active && !submitted && "border-stone-200 hover:border-stone-400",
              isCorrect && "border-green-500 ring-2 ring-green-300",
              isWrong && "border-red-400 ring-2 ring-red-200",
              submitted && !active && !isCorrect && "border-stone-200 opacity-60",
            )}
          >
            {opt.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={opt.imageUrl} alt={opt.text || opt.label} className="aspect-video w-full object-cover" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-stone-100 text-stone-400 text-sm">
                {opt.label}
              </div>
            )}
            <div className="px-3 py-2 text-center text-xs text-stone-500">{opt.text || opt.label}</div>
          </button>
        );
      })}
    </div>
  );
}

/** match: simplified dropdown matching */
function MatchInput({
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

/** order: reorder list with up/down buttons */
function OrderInput({
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

/** fill: 选词填空复用 MC UI;无选项的听后填空(L_LONG_FILL)用文本输入框 */
function FillInput({
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
  // 无选项填空(如听后填空):答案为自由文本,按 answerText 判分,渲染单行文本输入。
  if (!options || options.length === 0) {
    return (
      <input
        type="text"
        disabled={submitted}
        value={answer ?? ""}
        onChange={(e) => onAnswer(questionId, e.target.value)}
        placeholder="请输入听到的答案"
        className="w-full rounded-2xl border border-stone-200 bg-white px-5 py-4 text-lg text-stone-900 placeholder:text-stone-400 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 disabled:bg-stone-50 disabled:opacity-70"
      />
    );
  }
  return (
    <McInput
      questionId={questionId}
      options={options}
      answer={answer}
      submitted={submitted}
      correctOptionId={correctOptionId}
      onAnswer={onAnswer}
    />
  );
}

/** write_char / write_sentence / write_essay: textarea */
function WriteInput({
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

/** speak: MediaRecorder placeholder */
function SpeakInput({ submitted }: { submitted: boolean }) {
  const [supported] = useState(() => typeof window !== "undefined" && Boolean(window.MediaRecorder));
  if (!supported) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-5 py-4">
        <span className="text-xl">🎙️</span>
        <p className="text-sm text-amber-800">
          当前浏览器不支持录音，请在支持 MediaRecorder 的现代浏览器中作答。
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-5 py-4">
      <span className="text-xl">🎙️</span>
      <p className="text-sm text-stone-600">
        {submitted ? "口语录音已提交。" : "口语录音功能即将上线，请直接点击「提交评分」继续。"}
      </p>
    </div>
  );
}

// ─── Main QuestionView ─────────────────────────────────────────────────────────

export function QuestionView({
  question,
  answer,
  submitted,
  onAnswer,
  takenOptionIds,
}: QuestionViewProps) {
  const { answerFormat, needsAudio, needsImage, imageUrl, audioUrl, context } = question;
  // 共享选项池题:存在 sharedOptionPool 时优先走池渲染(覆盖 match/mc 等默认分支)。
  const pool = question.sharedOptionPool ?? null;

  return (
    <div className="space-y-6">
      {/* Audio block */}
      {needsAudio ? (
        <AudioPlayer audioUrl={audioUrl} context={context} />
      ) : context ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <div className="text-xs uppercase tracking-widest text-stone-400">原文</div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-700">{context}</p>
        </div>
      ) : null}

      {/* Image block (for needsImage but non-mc_image types) */}
      {needsImage && answerFormat !== "mc_image" ? (
        imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="题目图片"
            className="w-full max-w-sm rounded-2xl border border-stone-200 object-contain"
          />
        ) : (
          <div className="flex h-40 w-full max-w-sm items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-400">
            图片加载中…
          </div>
        )
      ) : null}

      {/* Prompt */}
      <div className="text-2xl leading-10 text-stone-900">{question.prompt}</div>

      {/* 共享选项池优先:有 sharedOptionPool 走公共选项区,否则按 answerFormat 分发(原逻辑) */}
      {pool ? (
        <SharedPoolInput
          questionId={question.id}
          options={question.options}
          poolOptionIds={pool.poolOptionIds}
          takenOptionIds={takenOptionIds ?? []}
          answer={answer}
          submitted={submitted}
          correctOptionId={question.correctOptionId}
          onAnswer={onAnswer}
        />
      ) : (
        <>
      {/* Answer input, dispatched by answerFormat */}
      {answerFormat === "judge" && (
        <JudgeInput
          questionId={question.id}
          options={question.options}
          answer={answer}
          submitted={submitted}
          correctOptionId={question.correctOptionId}
          onAnswer={onAnswer}
        />
      )}
      {(answerFormat === "mc3" || answerFormat === "mc4") && (
        <McInput
          questionId={question.id}
          options={question.options}
          answer={answer}
          submitted={submitted}
          correctOptionId={question.correctOptionId}
          onAnswer={onAnswer}
        />
      )}
      {answerFormat === "mc_image" &&
        (question.options.some((o) => o.imageUrl) ? (
          <McImageInput
            questionId={question.id}
            options={question.options}
            answer={answer}
            submitted={submitted}
            correctOptionId={question.correctOptionId}
            onAnswer={onAnswer}
          />
        ) : (
          // 选项无图(v1 文本选项)时降级为文本单选,避免空图框。
          <McInput
            questionId={question.id}
            options={question.options}
            answer={answer}
            submitted={submitted}
            correctOptionId={question.correctOptionId}
            onAnswer={onAnswer}
          />
        ))}
      {answerFormat === "match" && (
        <MatchInput
          questionId={question.id}
          options={question.options}
          answer={answer}
          submitted={submitted}
          onAnswer={onAnswer}
        />
      )}
      {answerFormat === "order" && (
        <OrderInput
          questionId={question.id}
          options={question.options}
          answer={answer}
          submitted={submitted}
          onAnswer={onAnswer}
        />
      )}
      {answerFormat === "fill" && (
        <FillInput
          questionId={question.id}
          options={question.options}
          answer={answer}
          submitted={submitted}
          correctOptionId={question.correctOptionId}
          onAnswer={onAnswer}
        />
      )}
      {answerFormat === "write_char" && (
        <WriteInput
          questionId={question.id}
          answer={answer}
          submitted={submitted}
          rows={2}
          placeholder="在此输入汉字…"
          onAnswer={onAnswer}
        />
      )}
      {answerFormat === "write_sentence" && (
        <WriteInput
          questionId={question.id}
          answer={answer}
          submitted={submitted}
          rows={3}
          placeholder="在此输入句子…"
          onAnswer={onAnswer}
        />
      )}
      {answerFormat === "write_essay" && (
        <WriteInput
          questionId={question.id}
          answer={answer}
          submitted={submitted}
          rows={8}
          placeholder="在此输入短文…"
          onAnswer={onAnswer}
        />
      )}
      {answerFormat === "speak" && <SpeakInput submitted={submitted} />}
        </>
      )}

      {/* Post-submit explanation */}
      {submitted && question.explanation ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="text-xs uppercase tracking-widest text-green-700">解析</div>
          <p className="mt-2 text-sm leading-7 text-green-900">{question.explanation}</p>
        </div>
      ) : null}
    </div>
  );
}
