/**
 * services/content-engine/src/build-bank.ts
 *
 * 组装 + 导入桥:把 authoring 出的题目 spec(banks/*.spec.json)
 * 转成平台原生的"已发布内容"包,落到 content/published/<slug>.generated.json:
 *   { items: ContentItem[], sets: [PracticeSet] }
 * 并按 apps/web/public/generated/ 下实际存在的媒体文件,回填 imageUrl / audioUrl。
 *
 * 媒体约定(由 Codex 出图 / Minimax 出音频落到这里,Next 直接静态服务):
 *   图:apps/web/public/generated/images/<level>/<itemId>.png  → imageUrl=/generated/images/<level>/<itemId>.png
 *   音:apps/web/public/generated/audio/<level>/<itemId>.mp3   → audioUrl=/generated/audio/<level>/<itemId>.mp3
 *
 * 用法:
 *   npx tsx src/build-bank.ts banks/hsk1-ce-pilot.spec.json
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, isAbsolute } from "node:path";

import { REPO_ROOT } from "./env.js";

type SpecOption = { id: string; label: string; text: string; imageBrief?: string };

type SpecItem = {
  id: string;
  questionTypeCode: string;
  sectionCode: string;
  title: string;
  stem: string;
  prompt: string;
  context?: string;
  audioScript?: string;
  imageBrief?: string;
  options: SpecOption[];
  correctOptionId: string;
  answerText?: string;
  explanation: string;
  vocabFocus?: string[];
  tags?: string[];
};

type BankSpec = {
  setSlug: string;
  setTitle: string;
  setDescription: string;
  levelCode: string;
  mode: "mock_exam" | "practice_set";
  access: "free" | "pro" | "institution";
  minutes: number;
  sectionCode?: string;
  items: SpecItem[];
};

const PUBLIC_DIR = join(REPO_ROOT, "apps", "web", "public");
const PUBLISHED_DIR = join(REPO_ROOT, "content", "published");

function imageRelPath(level: string, id: string): string {
  return `/generated/images/${level}/${id}.png`;
}
function audioRelPath(level: string, id: string): string {
  return `/generated/audio/${level}/${id}.mp3`;
}

async function buildBank(specPath: string): Promise<void> {
  const absSpec = isAbsolute(specPath) ? specPath : join(REPO_ROOT, "services", "content-engine", specPath);
  const spec = JSON.parse(await readFile(absSpec, "utf-8")) as BankSpec;

  const items = [];
  let withImage = 0;
  let withAudio = 0;
  let optionImages = 0;
  const missingMedia: string[] = [];

  for (const it of spec.items) {
    const needsImage = Boolean(it.imageBrief);
    const needsAudio = Boolean(it.audioScript);

    const imageFsPath = join(PUBLIC_DIR, "generated", "images", spec.levelCode, `${it.id}.png`);
    const audioFsPath = join(PUBLIC_DIR, "generated", "audio", spec.levelCode, `${it.id}.mp3`);
    const hasImage = needsImage && existsSync(imageFsPath);
    const hasAudio = needsAudio && existsSync(audioFsPath);
    if (hasImage) withImage += 1;
    if (hasAudio) withAudio += 1;
    if (needsImage && !hasImage) missingMedia.push(`IMAGE  ${it.id} (${it.questionTypeCode})`);
    if (needsAudio && !hasAudio) missingMedia.push(`AUDIO  ${it.id} (${it.questionTypeCode})`);

    // 选项级配图(mc_image 选图题):每个带 imageBrief 的选项检测 <itemId>_<optId>.png。
    const mappedOptions = it.options.map((o) => {
      if (!o.imageBrief) {
        return { id: o.id, label: o.label, text: o.text };
      }
      const optFsPath = join(PUBLIC_DIR, "generated", "images", spec.levelCode, `${it.id}_${o.id}.png`);
      if (existsSync(optFsPath)) {
        optionImages += 1;
        return {
          id: o.id,
          label: o.label,
          text: o.text,
          imageUrl: `/generated/images/${spec.levelCode}/${it.id}_${o.id}.png`,
        };
      }
      missingMedia.push(`OPT-IMG ${it.id}_${o.id} (${it.questionTypeCode})`);
      return { id: o.id, label: o.label, text: o.text };
    });

    items.push({
      id: it.id,
      levelCode: spec.levelCode,
      sectionCode: it.sectionCode,
      questionTypeCode: it.questionTypeCode,
      title: it.title,
      stem: it.stem,
      prompt: it.prompt,
      explanation: it.explanation,
      reviewStatus: "approved",
      publishStatus: "published",
      sourceType: "original",
      copyrightCleared: true,
      options: mappedOptions,
      correctOptionId: it.correctOptionId,
      tags: it.tags ?? [],
      // optional 富字段(全部 optional,平台 ContentItem 已支持)
      ...(it.context ? { context: it.context } : {}),
      ...(it.vocabFocus ? { vocabFocus: it.vocabFocus } : {}),
      ...(it.answerText ? { answerText: it.answerText } : {}),
      ...(hasImage ? { imageUrl: imageRelPath(spec.levelCode, it.id) } : {}),
      ...(hasAudio ? { audioUrl: audioRelPath(spec.levelCode, it.id) } : {}),
    });
  }

  const set = {
    id: `set_${spec.setSlug.replace(/-/g, "_")}`,
    slug: spec.setSlug,
    title: spec.setTitle,
    description: spec.setDescription,
    levelCode: spec.levelCode,
    mode: spec.mode,
    ...(spec.sectionCode ? { sectionCode: spec.sectionCode } : {}),
    access: spec.access,
    minutes: spec.minutes,
    itemIds: spec.items.map((i) => i.id),
  };

  const payload = { items, sets: [set] };

  await mkdir(PUBLISHED_DIR, { recursive: true });
  const outPath = join(PUBLISHED_DIR, `${spec.setSlug}.generated.json`);
  await writeFile(outPath, JSON.stringify(payload, null, 2), "utf-8");

  console.log("─────────────────────────────────────────");
  console.log(`bank        : ${spec.setSlug}`);
  console.log(`level       : ${spec.levelCode}`);
  console.log(`items       : ${items.length}`);
  console.log(`withImage   : ${withImage}`);
  console.log(`optionImages: ${optionImages}`);
  console.log(`withAudio   : ${withAudio}`);
  console.log(`output      : content/published/${spec.setSlug}.generated.json`);
  console.log("─────────────────────────────────────────");
  if (missingMedia.length > 0) {
    console.log(`\n[待补媒体 ${missingMedia.length} 项](文件不存在时该题不带 imageUrl/audioUrl,补齐后重跑即可):`);
    for (const m of missingMedia) console.log(`  - ${m}`);
  } else {
    console.log("\n所有需要的媒体均已就位。");
  }
}

const specArg = process.argv[2] ?? "banks/hsk1-ce-pilot.spec.json";
buildBank(specArg).catch((err) => {
  console.error("[build-bank FATAL]", err);
  process.exit(1);
});
