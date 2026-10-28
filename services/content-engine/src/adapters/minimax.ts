/**
 * services/content-engine/src/adapters/minimax.ts
 *
 * Minimax TTS adapter（听力音频 + 口语示范）。
 *
 * 环境变量:
 *   MINIMAX_API_KEY    — Minimax API 密钥
 *   MINIMAX_GROUP_ID   — Minimax Group ID（接口必填）
 *   MINIMAX_TTS_MODEL  — TTS 模型，默认 speech-02-hd
 *
 * 真实调用端点:
 *   POST https://api.minimax.io/v1/t2a_v2?GroupId=<GROUP_ID>
 * 请求体:
 *   {
 *     model: "speech-02-hd",
 *     text: "...",
 *     stream: false,
 *     voice_setting: { voice_id: "...", speed: 1.0, vol: 1.0, pitch: 0 },
 *     audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3" }
 *   }
 * 响应: { data: { audio: "<hex string>" } }
 * 落盘: services/content-engine/output/audio/<batchId>/<itemId>.mp3
 *
 * dry-run: 写占位 .txt 文件，返回 placeholder 路径。
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { dirname } from "node:path";

// 端点按区域不同:国内站 api.minimaxi.com,国际站 api.minimax.io。
// 默认国内站(本项目 key 为国内);国际 key 在 .env.local 配 MINIMAX_BASE_URL 覆盖。
const DEFAULT_BASE_URL = "https://api.minimaxi.com/v1/t2a_v2";
const DEFAULT_MODEL = "speech-02-hd";

// ─── 音色映射 ─────────────────────────────────────────────────────────────────

type VoiceHint = "female_standard" | "male_standard" | "male_news" | "dual";

/** Minimax 内置音色 ID */
const VOICE_MAP: Record<Exclude<VoiceHint, "dual">, string> = {
  female_standard: "female-shaonv",   // 少女音（清晰标准普通话）
  male_standard:   "male-qn-qingse",  // 清色男声
  male_news:       "presenter_male",  // 播音风格男声
};

// ─── 语速映射 ─────────────────────────────────────────────────────────────────

type SpeedHint = "slow" | "medium" | "normal" | "fast";

const SPEED_MAP: Record<SpeedHint, number> = {
  slow:   0.75,
  medium: 0.9,
  normal: 1.0,
  fast:   1.15,
};

// ─── 重试 ─────────────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 800,
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

// ─── 类型 ─────────────────────────────────────────────────────────────────────

export type TTSOptions = {
  text: string;
  voiceHint: VoiceHint;
  speed: SpeedHint;
  itemId: string;
  batchId: string;
  outputDir: string;
  dryRun?: boolean;
};

export type TTSResult = {
  filePath?: string;
  placeholder?: string;
  error?: string;
};

// ─── 主导出 ───────────────────────────────────────────────────────────────────

export async function generateAudio(opts: TTSOptions): Promise<TTSResult> {
  const apiKey = process.env.MINIMAX_API_KEY;
  const groupId = process.env.MINIMAX_GROUP_ID;

  // dry-run 或无 key
  if (opts.dryRun || !apiKey || apiKey === "your_key_here" || !groupId) {
    const placeholderPath = join(
      opts.outputDir,
      "audio",
      opts.batchId,
      `${opts.itemId}.placeholder.txt`,
    );
    await mkdir(dirname(placeholderPath), { recursive: true });
    await writeFile(
      placeholderPath,
      `[DRY-RUN] audio placeholder\ntext: ${opts.text.slice(0, 80)}...\nvoice: ${opts.voiceHint}\nspeed: ${opts.speed}`,
      "utf-8",
    );
    return { placeholder: placeholderPath };
  }

  const model = process.env.MINIMAX_TTS_MODEL ?? DEFAULT_MODEL;
  const voiceId = VOICE_MAP[opts.voiceHint as Exclude<VoiceHint, "dual">] ?? VOICE_MAP.female_standard;
  const speedVal = SPEED_MAP[opts.speed] ?? 1.0;
  const baseUrl = process.env.MINIMAX_BASE_URL ?? DEFAULT_BASE_URL;
  const url = `${baseUrl}?GroupId=${groupId}`;

  try {
    const hexAudio = await withRetry(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          text: opts.text,
          stream: false,
          voice_setting: {
            voice_id: voiceId,
            speed: speedVal,
            vol: 1.0,
            pitch: 0,
          },
          audio_setting: {
            sample_rate: 32000,
            bitrate: 128000,
            format: "mp3",
          },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Minimax TTS API ${res.status}: ${errText}`);
      }
      const data = (await res.json()) as { data?: { audio?: string }; base_resp?: { status_msg: string } };
      const hex = data.data?.audio;
      const statusMsg = data.base_resp?.status_msg ?? "";
      // Minimax 成功返回 status_msg="success"(小写);以 audio 是否存在为准,
      // 仅当无 audio 且状态非 success(忽略大小写)时才算错误。
      if (!hex) {
        if (statusMsg && statusMsg.toLowerCase() !== "success") {
          throw new Error(`Minimax TTS 错误: ${statusMsg}`);
        }
        throw new Error("Minimax TTS 返回数据中无 audio 字段");
      }
      return hex;
    });

    // hex → Buffer → mp3
    const outDir = join(opts.outputDir, "audio", opts.batchId);
    await mkdir(outDir, { recursive: true });
    const filePath = join(outDir, `${opts.itemId}.mp3`);
    const buf = Buffer.from(hexAudio, "hex");
    await writeFile(filePath, buf);
    return { filePath };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
