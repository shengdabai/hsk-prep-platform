/**
 * services/content-engine/src/orchestrator.ts
 *
 * 编排入口：
 *   输入 GenerationJob → LLM 出题 → (需图)GPT Image → (需音频)Minimax TTS
 *   → 汇总 GeneratedItem[] → 写 output/generated-batch.json
 *
 * 媒体规则严格按照 HSK_3.0_EXAM_SPEC.md §7 题型→媒体映射：
 *   7 类需图题型 / 15 类需音频题型
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";

import type {
  GenerationJob,
  GeneratedItem,
  GenerationBatch,
  QuestionTypeSlug,
  LevelCode,
  ImageSpec,
  AudioSpec,
} from "./types.js";
import { generateQuestionsViaLLM } from "./adapters/llm.js";
import { generateImage } from "./adapters/gpt-image.js";
import { generateAudio } from "./adapters/minimax.js";
import { getBlueprint } from "./blueprint.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// output 目录相对于 services/content-engine/
const OUTPUT_DIR = join(__dirname, "..", "output");

// ─── 媒体需求查找表（来自 spec §7） ─────────────────────────────────────────

const IMAGE_TYPES = new Set<QuestionTypeSlug>([
  "L_WORD_IMG_TF",
  "L_SENT_IMG_MC",
  "L_DIALOG_IMG_MC",
  "R_IMG_WORD_TF",
  "R_SENT_IMG_MC",
  "W_IMG_WORD_SENT",
  "W_IMG_WORD_PARA",
]);

const AUDIO_TYPES = new Set<QuestionTypeSlug>([
  "L_WORD_IMG_TF",
  "L_SENT_IMG_MC",
  "L_DIALOG_IMG_MC",
  "L_SENT_TF",
  "L_QA_MC3",
  "L_QA_MC4",
  "L_LONG_MC4",
  "L_CONSIST_MC4",
  "L_NEWS_TF",
  "L_LONG_FILL",
  "S_HSKK_REPEAT",
  "S_HSKK_RETELL",
  "S_HSKK_QA",
  "S_OPINION",
  "T_L2C_INTERPRET",
]);

// ─── 语速根据级别确定 ─────────────────────────────────────────────────────────

function audioSpeedForLevel(levelCode: LevelCode): "slow" | "medium" | "normal" | "fast" {
  if (levelCode === "hsk-1" || levelCode === "hsk-2") return "slow";
  if (levelCode === "hsk-3" || levelCode === "hsk-4") return "medium";
  if (levelCode === "hsk-5" || levelCode === "hsk-6") return "normal";
  return "fast"; // hsk-7-9
}

// ─── 音色根据题型确定 ─────────────────────────────────────────────────────────

function voiceForType(
  slug: QuestionTypeSlug,
): "female_standard" | "male_standard" | "male_news" | "dual" {
  if (slug === "L_CONSIST_MC4" || slug === "L_NEWS_TF") return "male_news";
  if (
    slug === "L_DIALOG_IMG_MC" ||
    slug === "L_QA_MC3" ||
    slug === "L_QA_MC4" ||
    slug === "L_LONG_MC4" ||
    slug === "L_LONG_FILL"
  )
    return "dual"; // 对话用双音色（adapter 目前回退到 female_standard）
  return "female_standard";
}

// ─── 工具 ─────────────────────────────────────────────────────────────────────

function newId(prefix = "CE"): string {
  return `${prefix}_${randomBytes(5).toString("hex").toUpperCase()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ─── 单题媒体生成 ─────────────────────────────────────────────────────────────

async function attachImage(
  item: GeneratedItem,
  imagePromptHint: string | undefined,
  batchId: string,
  dryRun: boolean,
): Promise<void> {
  if (!IMAGE_TYPES.has(item.questionTypeSlug)) return;

  const prompt =
    imagePromptHint ??
    `Illustration for ${item.questionTypeSlug} question at ${item.levelCode} level`;

  const result = await generateImage({
    prompt,
    itemId: item.id,
    imageIndex: 0,
    batchId,
    outputDir: OUTPUT_DIR,
    dryRun,
  });

  const spec: ImageSpec = {
    prompt,
    usage: item.questionTypeSlug.includes("WORD") ? "object" : "scene",
    filePath: result.filePath,
    placeholder: result.placeholder,
    error: result.error,
  };
  item.images.push(spec);
}

async function attachAudio(
  item: GeneratedItem,
  audioTextHint: string | undefined,
  batchId: string,
  dryRun: boolean,
): Promise<void> {
  if (!AUDIO_TYPES.has(item.questionTypeSlug)) return;

  const text =
    audioTextHint ??
    item.prompt ??
    "[TTS placeholder text]";

  const result = await generateAudio({
    text,
    voiceHint: voiceForType(item.questionTypeSlug),
    speed: audioSpeedForLevel(item.levelCode),
    itemId: item.id,
    batchId,
    outputDir: OUTPUT_DIR,
    dryRun,
  });

  const spec: AudioSpec = {
    text,
    voiceHint: voiceForType(item.questionTypeSlug),
    speed: audioSpeedForLevel(item.levelCode),
    filePath: result.filePath,
    placeholder: result.placeholder,
    error: result.error,
  };
  item.audio.push(spec);
}

// ─── 主编排函数 ───────────────────────────────────────────────────────────────

export async function runGenerationJob(job: GenerationJob): Promise<GenerationBatch> {
  const batchId = newId("BATCH");
  const requestedAt = nowIso();
  const dryRun = job.dryRun ?? false;

  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(join(OUTPUT_DIR, "images", batchId), { recursive: true });
  await mkdir(join(OUTPUT_DIR, "audio", batchId), { recursive: true });

  // 从蓝图补全 skill / answerFormat 映射
  const blueprint = getBlueprint(job.levelCode);
  const bpMap = new Map(
    blueprint.sections.map((s) => [s.questionTypeSlug, s]),
  );

  const allItems: GeneratedItem[] = [];

  for (const jobItem of job.items) {
    const { questionTypeSlug, count } = jobItem;
    const bpSection = bpMap.get(questionTypeSlug);

    // 调 LLM 出题
    const { results, error: llmError } = await generateQuestionsViaLLM({
      levelCode: job.levelCode,
      questionTypeSlug,
      count,
      dryRun,
    });

    if (llmError && results.length === 0) {
      // 整批该题型 fail，用占位错误项
      for (let i = 0; i < count; i++) {
        allItems.push({
          id: newId("ITEM"),
          levelCode: job.levelCode,
          questionTypeSlug,
          skill: bpSection?.skill ?? "reading",
          answerFormat: bpSection?.requiresAudio ? "MC-ABCD" : "MC-ABCD",
          stem: "",
          prompt: "",
          options: [],
          correctAnswer: "",
          explanation: "",
          vocabFocus: [],
          tags: [job.levelCode, questionTypeSlug.toLowerCase(), "ai-generated"],
          images: [],
          audio: [],
          reviewStatus: "pending",
          publishStatus: "draft",
          generatedAt: nowIso(),
          failed: true,
          failReason: llmError,
        });
      }
      continue;
    }

    // 对每条 LLM 结果做媒体生成
    for (const llmResult of results) {
      const itemId = newId("ITEM");
      const t0 = Date.now();

      const item: GeneratedItem = {
        id: itemId,
        levelCode: job.levelCode,
        questionTypeSlug,
        skill: bpSection?.skill ?? "reading",
        answerFormat: llmResult.answerFormat,
        stem: llmResult.stem,
        prompt: llmResult.prompt,
        options: llmResult.options,
        correctAnswer: llmResult.correctAnswer,
        explanation: llmResult.explanation,
        vocabFocus: llmResult.vocabFocus,
        tags: llmResult.tags,
        images: [],
        audio: [],
        reviewStatus: "pending",
        publishStatus: "draft",
        generatedAt: nowIso(),
      };

      // 并行生成图 + 音频（独立，互不依赖）
      await Promise.all([
        attachImage(item, llmResult.imagePromptHint, batchId, dryRun),
        attachAudio(item, llmResult.audioTextHint, batchId, dryRun),
      ]);

      item.generationDurationMs = Date.now() - t0;
      allItems.push(item);
    }
  }

  const succeeded = allItems.filter((i) => !i.failed).length;
  const failed = allItems.filter((i) => i.failed).length;
  const withImages = allItems.filter((i) => i.images.length > 0 && !i.images[0].error).length;
  const withAudio = allItems.filter((i) => i.audio.length > 0 && !i.audio[0].error).length;

  const batch: GenerationBatch = {
    batchId,
    levelCode: job.levelCode,
    requestedAt,
    completedAt: nowIso(),
    dryRun,
    items: allItems,
    summary: {
      total: allItems.length,
      succeeded,
      failed,
      withImages,
      withAudio,
    },
  };

  // 落盘 generated-batch.json
  const batchPath = join(OUTPUT_DIR, "generated-batch.json");
  await writeFile(batchPath, JSON.stringify(batch, null, 2), "utf-8");

  return batch;
}
