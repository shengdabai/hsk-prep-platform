/**
 * services/content-engine/src/types.ts
 *
 * 引擎内部类型定义 —— 自包含,不依赖 @hsk/shared。
 * 与 packages/shared/src/types.ts 的 ContentItem / ImportPayload
 * 做外部映射时由集成层负责转换。
 */

// ─── 级别 ────────────────────────────────────────────────────────────────────

export type LevelCode =
  | "hsk-1"
  | "hsk-2"
  | "hsk-3"
  | "hsk-4"
  | "hsk-5"
  | "hsk-6"
  | "hsk-7-9"
  | "hskk-beginner"
  | "hskk-intermediate"
  | "hskk-advanced";

// ─── 技能 ────────────────────────────────────────────────────────────────────

export type SkillCode = "listening" | "reading" | "writing" | "speaking" | "translation";

// ─── 作答形式 ─────────────────────────────────────────────────────────────────

export type AnswerFormat =
  | "TF"
  | "MC-ABC"
  | "MC-ABCD"
  | "MC-IMAGE"
  | "MATCH"
  | "ORDER"
  | "FILL"
  | "WRITE-CHAR"
  | "WRITE-SENT"
  | "WRITE-PARA"
  | "WRITE-LONG"
  | "REC-REPEAT"
  | "REC-ANSWER"
  | "REC-READ"
  | "REC-TRANSLATE";

// ─── 题型 ────────────────────────────────────────────────────────────────────

export type QuestionTypeSlug =
  | "L_WORD_IMG_TF"
  | "L_SENT_IMG_MC"
  | "L_DIALOG_IMG_MC"
  | "L_SENT_TF"
  | "L_QA_MC3"
  | "L_QA_MC4"
  | "L_LONG_MC4"
  | "L_CONSIST_MC4"
  | "L_NEWS_TF"
  | "L_LONG_FILL"
  | "R_IMG_WORD_TF"
  | "R_SENT_IMG_MC"
  | "R_QA_MATCH"
  | "R_SENT_FILL_MC"
  | "R_PARA_MATCH"
  | "R_TEXT_FILL_MC"
  | "R_SENT_ORDER"
  | "R_TEXT_MC3"
  | "R_TEXT_MC4"
  | "R_ERROR_MC"
  | "R_SENT_FILL_CONTEXT"
  | "W_PINYIN_CHAR"
  | "W_WORD_ORDER_SENT"
  | "W_WORD_SENT"
  | "W_IMG_WORD_SENT"
  | "W_IMG_WORD_PARA"
  | "W_SUMMARIZE"
  | "T_L2C_WRITTEN"
  | "T_L2C_INTERPRET"
  | "S_HSKK_REPEAT"
  | "S_HSKK_RETELL"
  | "S_HSKK_QA"
  | "S_HSKK_READ"
  | "S_HSKK_FREE_QA"
  | "S_OPINION";

// ─── 媒体规格 ─────────────────────────────────────────────────────────────────

export type ImageSpec = {
  /** 给 GPT Image 的生成 prompt */
  prompt: string;
  /** 图片用途: scene | object | story */
  usage: "scene" | "object" | "story";
  /** 是否干扰选项组(同一题多图) */
  isDistractor?: boolean;
  /** 最终落盘路径(生成后填入) */
  filePath?: string;
  /** data-URI 或占位路径(dry-run) */
  placeholder?: string;
  error?: string;
};

export type AudioSpec = {
  /** 要 TTS 的文本 */
  text: string;
  /** 音色建议 */
  voiceHint: "female_standard" | "male_standard" | "male_news" | "dual";
  /** 语速:slow/medium/normal/fast */
  speed: "slow" | "medium" | "normal" | "fast";
  /** 最终落盘路径(生成后填入) */
  filePath?: string;
  placeholder?: string;
  error?: string;
};

// ─── 选项 ────────────────────────────────────────────────────────────────────

export type QuestionOption = {
  id: string;   // "A" | "B" | "C" | "D"
  label: string;
  text: string;
};

// ─── 单题 ────────────────────────────────────────────────────────────────────

export type GeneratedItem = {
  id: string;
  levelCode: LevelCode;
  questionTypeSlug: QuestionTypeSlug;
  skill: SkillCode;
  answerFormat: AnswerFormat;

  /** 题干文本 */
  stem: string;
  /** 题目提示语 */
  prompt: string;
  /** 选项列表(非选择题可为空) */
  options: QuestionOption[];
  /** 正确答案 id 或文本 */
  correctAnswer: string;
  /** 解析 */
  explanation: string;

  /** 词汇焦点 */
  vocabFocus: string[];
  /** 标签 */
  tags: string[];

  /** 媒体资产 */
  images: ImageSpec[];
  audio: AudioSpec[];

  /** 状态 —— 对齐 @hsk/shared 审核队列 */
  reviewStatus: "pending" | "approved" | "rejected" | "needs_fix";
  publishStatus: "draft" | "ready" | "published" | "unpublished";

  /** 生成元数据 */
  generatedAt: string;
  generationDurationMs?: number;
  failed?: boolean;
  failReason?: string;
};

// ─── 批次 ────────────────────────────────────────────────────────────────────

export type GenerationBatch = {
  batchId: string;
  levelCode: LevelCode;
  requestedAt: string;
  completedAt?: string;
  dryRun: boolean;
  items: GeneratedItem[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    withImages: number;
    withAudio: number;
  };
};

// ─── Job 输入 ─────────────────────────────────────────────────────────────────

export type GenerationJobItem = {
  questionTypeSlug: QuestionTypeSlug;
  count: number;
};

export type GenerationJob = {
  levelCode: LevelCode;
  items: GenerationJobItem[];
  dryRun?: boolean;
};

// ─── Blueprint 结构 ───────────────────────────────────────────────────────────

export type BlueprintSection = {
  skill: SkillCode;
  part: number;
  questionTypeSlug: QuestionTypeSlug;
  count: number;
  durationMinutes: number;
  requiresImage: boolean;
  requiresAudio: boolean;
  audioPlayCount: 1 | 2;
  notes?: string;
};

export type LevelBlueprint = {
  levelCode: LevelCode;
  totalQuestions: number;
  totalMinutes: number;
  sections: BlueprintSection[];
};
