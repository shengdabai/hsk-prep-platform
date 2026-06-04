"use client";

import { memo } from "react";
import Image from "next/image";
import { AudioPlayer } from "./audio-player";
import {
  FillInput,
  JudgeInput,
  MatchInput,
  McImageInput,
  McInput,
  OrderInput,
  SharedPoolInput,
  SpeakInput,
  WriteInput,
} from "./question-inputs";

// ─── Shared display item shape (C5 单一来源:lib/view-models) ───────────────────
// DisplayQuestion / DisplayOption 由 lib/view-models 单点定义,此处 re-export 以
// 保持既有导入路径(session-runner 仍 `import type { DisplayQuestion } from "./question-view"`)。
export type { DisplayOption, DisplayQuestion } from "../lib/view-models";
import type { DisplayQuestion } from "../lib/view-models";

type QuestionViewProps = {
  question: DisplayQuestion;
  answer: string | undefined;
  submitted: boolean;
  onAnswer: (itemId: string, value: string) => void;
  // 共享池题专用:同组其他题已选走的池选项 id(本题需禁用)。非池题忽略。
  takenOptionIds?: string[];
};

// ─── Main QuestionView ─────────────────────────────────────────────────────────

function QuestionViewImpl({
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
          <div className="text-xs uppercase tracking-widest text-stone-600">原文</div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-700">{context}</p>
        </div>
      ) : null}

      {/* Image block (for needsImage but non-mc_image types) */}
      {needsImage && answerFormat !== "mc_image" ? (
        imageUrl ? (
          <Image
            src={imageUrl}
            alt={question.prompt || question.stem || question.title || "题目配图"}
            width={384}
            height={288}
            loading="lazy"
            decoding="async"
            sizes="(min-width: 640px) 384px, 90vw"
            className="h-auto w-full max-w-sm rounded-2xl border border-stone-200 object-contain"
          />
        ) : (
          <div
            role="img"
            aria-busy="true"
            aria-label="题目配图加载中"
            className="flex h-40 w-full max-w-sm items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500"
          >
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

// React.memo:onAnswer 由父组件 useCallback 稳定后,切题/无关 state 变化不再重渲染。
export const QuestionView = memo(QuestionViewImpl);
