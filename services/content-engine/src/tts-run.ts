/**
 * services/content-engine/src/tts-run.ts
 *
 * 从题目 spec 批量生成 Minimax 听力/口语音频,直接落到 Next 静态目录:
 *   apps/web/public/generated/audio/<level>/<itemId>.mp3
 * 这样 build-bank 回填的 audioUrl=/generated/audio/<level>/<itemId>.mp3 即可被 web 服务。
 *
 * 依赖 MINIMAX_API_KEY / MINIMAX_GROUP_ID(从 apps/web/.env.local 自动加载)。
 * 无 key 时 adapter 回退占位 .txt,不真调外部、不产生费用。
 *
 * 用法:
 *   npx tsx src/tts-run.ts banks/hsk1-ce-pilot.spec.json
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, isAbsolute } from "node:path";

import { loadEnv, REPO_ROOT } from "./env.js";
import { generateAudio } from "./adapters/minimax.js";

loadEnv();

type SpecItem = {
  id: string;
  questionTypeCode: string;
  audioScript?: string;
};
type BankSpec = { levelCode: string; items: SpecItem[] };

const PUBLIC_GENERATED = join(REPO_ROOT, "apps", "web", "public", "generated");

function speedForLevel(level: string): "slow" | "medium" | "normal" | "fast" {
  if (level === "hsk-1" || level === "hsk-2") return "slow";
  if (level === "hsk-3" || level === "hsk-4") return "medium";
  return "normal";
}
function voiceForType(slug: string): "female_standard" | "male_news" | "dual" {
  if (slug === "L_CONSIST_MC4" || slug === "L_NEWS_TF") return "male_news";
  if (slug.includes("DIALOG") || slug.includes("QA")) return "dual";
  return "female_standard";
}

async function run(specPath: string): Promise<void> {
  const absSpec = isAbsolute(specPath)
    ? specPath
    : join(REPO_ROOT, "services", "content-engine", specPath);
  const spec = JSON.parse(await readFile(absSpec, "utf-8")) as BankSpec;

  const live = Boolean(process.env.MINIMAX_API_KEY && process.env.MINIMAX_GROUP_ID);
  console.log(`[tts-run] level=${spec.levelCode} | minimax=${live ? "LIVE" : "DRY(无key,产占位)"}`);

  let ok = 0;
  let placeholder = 0;
  let failed = 0;
  let skipped = 0;

  for (const it of spec.items) {
    if (!it.audioScript) continue;
    // 幂等:已存在的 mp3 跳过,中断/限流后重跑只补缺失,不重复计费。
    const existingMp3 = join(PUBLIC_GENERATED, "audio", spec.levelCode, `${it.id}.mp3`);
    if (existsSync(existingMp3)) {
      skipped += 1;
      continue;
    }
    const result = await generateAudio({
      text: it.audioScript,
      voiceHint: voiceForType(it.questionTypeCode),
      speed: speedForLevel(spec.levelCode),
      itemId: it.id,
      batchId: spec.levelCode, // → 落到 .../audio/<level>/<id>.mp3
      outputDir: PUBLIC_GENERATED,
      dryRun: !live,
    });
    if (result.error) {
      failed += 1;
      console.error(`  ✗ ${it.id}: ${result.error}`);
    } else if (result.filePath && result.filePath.endsWith(".mp3")) {
      ok += 1;
      console.log(`  ✓ ${it.id} → ${result.filePath.replace(REPO_ROOT, "")}`);
    } else {
      placeholder += 1;
      console.log(`  · ${it.id} 占位(待 key)`);
    }
  }

  console.log(`\n[tts-run] mp3=${ok} 跳过(已存在)=${skipped} 占位=${placeholder} 失败=${failed}`);
  if (!live) {
    console.log("提示:在 apps/web/.env.local 配置 MINIMAX_API_KEY + MINIMAX_GROUP_ID 后重跑即可生成真实音频。");
  }
}

const specArg = process.argv[2] ?? "banks/hsk1-ce-pilot.spec.json";
run(specArg).catch((err) => {
  console.error("[tts-run FATAL]", err);
  process.exit(1);
});
