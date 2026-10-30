/**
 * services/content-engine/src/adapters/gpt-image.ts
 *
 * GPT Image 2 配图 adapter（OpenAI images/generations API）。
 *
 * 环境变量:
 *   OPENAI_API_KEY        — OpenAI API 密钥
 *   OPENAI_IMAGE_MODEL    — 模型名，默认 gpt-image-alpha（gpt-image-2 正式发布前代号）
 *   OPENAI_IMAGE_SIZE     — 图片尺寸，默认 1024x1024
 *   OPENAI_IMAGE_QUALITY  — 质量，默认 standard
 *
 * dry-run: OPENAI_API_KEY 缺失时返回 data-URI placeholder，不真调外部。
 *
 * 真实调用端点: POST https://api.openai.com/v1/images/generations
 * 请求体:
 *   { model, prompt, n, size, quality, response_format: "b64_json" }
 * 响应: { data: [{ b64_json: "..." }] }
 * 落盘: services/content-engine/output/images/<batchId>/<itemId>_<idx>.png
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_MODEL = "gpt-image-alpha"; // gpt-image-2 推出后换为 "gpt-image-2"
const DEFAULT_SIZE = "1024x1024";
const DEFAULT_QUALITY = "standard";

/** 1x1 透明 PNG 的 data-URI，用于 dry-run 占位 */
const PLACEHOLDER_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export type ImageGenerateOptions = {
  prompt: string;
  itemId: string;
  imageIndex: number;
  batchId: string;
  outputDir: string;
  dryRun?: boolean;
};

export type ImageGenerateResult = {
  filePath?: string;
  placeholder?: string;
  error?: string;
};

// ─── 重试 ─────────────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

// ─── HSK 风格前缀 ─────────────────────────────────────────────────────────────

const STYLE_PREFIX =
  "Clean flat illustration style, suitable for Chinese language learning exam, " +
  "no text in the image, simple background, clear subject, educational tone. Subject: ";

// ─── 主导出 ───────────────────────────────────────────────────────────────────

export async function generateImage(
  opts: ImageGenerateOptions,
): Promise<ImageGenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  // dry-run 或无 key
  if (opts.dryRun || !apiKey || apiKey === "your_key_here") {
    const placeholderPath = join(
      opts.outputDir,
      "images",
      opts.batchId,
      `${opts.itemId}_${opts.imageIndex}.placeholder.txt`,
    );
    await mkdir(dirname(placeholderPath), { recursive: true });
    await writeFile(
      placeholderPath,
      `[DRY-RUN] image placeholder\nprompt: ${opts.prompt}\nitemId: ${opts.itemId}\nindex: ${opts.imageIndex}`,
      "utf-8",
    );
    return { placeholder: PLACEHOLDER_DATA_URI, filePath: placeholderPath };
  }

  const model = process.env.OPENAI_IMAGE_MODEL ?? DEFAULT_MODEL;
  const size = (process.env.OPENAI_IMAGE_SIZE ?? DEFAULT_SIZE) as
    | "256x256"
    | "512x512"
    | "1024x1024"
    | "1792x1024"
    | "1024x1792";
  const quality = (process.env.OPENAI_IMAGE_QUALITY ?? DEFAULT_QUALITY) as
    | "standard"
    | "hd";

  const fullPrompt = STYLE_PREFIX + opts.prompt;

  try {
    const b64 = await withRetry(async () => {
      const res = await fetch(OPENAI_IMAGES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: fullPrompt,
          n: 1,
          size,
          quality,
          response_format: "b64_json",
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI Images API ${res.status}: ${errText}`);
      }
      const data = (await res.json()) as { data: Array<{ b64_json: string }> };
      const b64 = data.data[0]?.b64_json;
      if (!b64) throw new Error("OpenAI Images API 返回数据中无 b64_json");
      return b64;
    });

    // 落盘
    const outDir = join(opts.outputDir, "images", opts.batchId);
    await mkdir(outDir, { recursive: true });
    const filePath = join(outDir, `${opts.itemId}_${opts.imageIndex}.png`);
    await writeFile(filePath, Buffer.from(b64, "base64"));
    return { filePath };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
