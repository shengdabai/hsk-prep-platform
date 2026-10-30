/**
 * services/content-engine/src/images-run.ts
 *
 * 从题目 spec 批量生成选项级插画,直接落到 Next 静态目录:
 *   apps/web/public/generated/images/<level>/<itemId>_<optId>.png
 * 这样 build-bank 回填的 imageUrl=/generated/images/<level>/<itemId>_<optId>.png 即可被 web 服务。
 *
 * 遍历每题 options 中带 imageBrief 的选项(选图题:L_SENT_IMG_MC / L_DIALOG_IMG_MC /
 * R_SENT_IMG_MC),以及题干级 imageBrief(单图题),逐张调 GPT Image adapter 出图。
 *
 * 依赖 OPENAI_API_KEY(从 apps/web/.env.local 自动加载)。
 * 无 key 时 adapter 回退占位 .txt,不真调外部、不产生费用(用于验证遍历/命名)。
 *
 * 幂等:已存在的 <itemId>_<optId>.png 默认跳过(--force 覆盖)。中断后重跑只补缺图。
 *
 * 用法:
 *   npx tsx src/images-run.ts banks/hsk2-mock-01.spec.json          # 出图(有 key 则真出,无 key 占位)
 *   npx tsx src/images-run.ts banks/hsk2-mock-01.spec.json --force  # 强制覆盖已存在的图
 *   npx tsx src/images-run.ts banks/hsk2-mock-01.spec.json --dry    # 强制占位(不调外部)
 */

import { existsSync } from "node:fs";
import { readFile, rename, unlink } from "node:fs/promises";
import { join, isAbsolute } from "node:path";

import { loadEnv, REPO_ROOT } from "./env.js";
import { generateImage } from "./adapters/gpt-image.js";

loadEnv();

type SpecOption = { id: string; label: string; text: string; imageBrief?: string };
type SpecItem = {
  id: string;
  questionTypeCode: string;
  imageBrief?: string;
  options: SpecOption[];
};
type BankSpec = { levelCode: string; items: SpecItem[] };

const PUBLIC_GENERATED = join(REPO_ROOT, "apps", "web", "public", "generated");

// 一个出图单元:目标文件名后缀 = 选项id(选项图)或 "main"(题干单图)。
type Unit = { itemId: string; suffix: string; brief: string };

function collectUnits(items: SpecItem[]): Unit[] {
  const units: Unit[] = [];
  for (const it of items) {
    if (it.imageBrief) {
      units.push({ itemId: it.id, suffix: "main", brief: it.imageBrief });
    }
    for (const o of it.options ?? []) {
      if (o.imageBrief) {
        units.push({ itemId: it.id, suffix: o.id, brief: o.imageBrief });
      }
    }
  }
  return units;
}

async function run(specPath: string, force: boolean, forceDry: boolean): Promise<void> {
  const absSpec = isAbsolute(specPath)
    ? specPath
    : join(REPO_ROOT, "services", "content-engine", specPath);
  const spec = JSON.parse(await readFile(absSpec, "utf-8")) as BankSpec;
  const level = spec.levelCode;

  const live = !forceDry && Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your_key_here");
  const units = collectUnits(spec.items);
  console.log(
    `[images-run] level=${level} | 待出图 ${units.length} 张 | openai=${live ? "LIVE" : "DRY(占位,不计费)"} | force=${force}`,
  );

  let ok = 0;
  let skipped = 0;
  let placeholder = 0;
  let failed = 0;

  for (const u of units) {
    // 最终目标:apps/web/public/generated/images/<level>/<itemId>_<suffix>.png
    const finalRel = `images/${level}/${u.itemId}_${u.suffix}.png`;
    const finalAbs = join(PUBLIC_GENERATED, finalRel);
    if (!force && existsSync(finalAbs)) {
      skipped += 1;
      continue;
    }

    // adapter 落盘命名为 <outputDir>/images/<batchId>/<adapterItemId>_<imageIndex>.png。
    // 让 adapterItemId=`${itemId}_${suffix}`、imageIndex=0,产出 `${itemId}_${suffix}_0.png`,再 rename 去掉 `_0`。
    const adapterItemId = `${u.itemId}_${u.suffix}`;
    const res = await generateImage({
      prompt: u.brief,
      itemId: adapterItemId,
      imageIndex: 0,
      batchId: level,
      outputDir: PUBLIC_GENERATED,
      dryRun: !live,
    });

    if (res.error) {
      failed += 1;
      console.error(`  ✗ ${u.itemId}_${u.suffix}: ${res.error}`);
      continue;
    }

    if (live && res.filePath && res.filePath.endsWith(".png")) {
      // res.filePath = .../images/<level>/<itemId>_<suffix>_0.png → rename 成 <itemId>_<suffix>.png
      await rename(res.filePath, finalAbs);
      ok += 1;
      console.log(`  ✓ ${finalRel}`);
    } else {
      // dry-run:adapter 产出 .placeholder.txt,删掉避免污染 images 目录。
      placeholder += 1;
      if (res.filePath && existsSync(res.filePath)) {
        try {
          await unlink(res.filePath);
        } catch {
          /* best-effort */
        }
      }
    }
  }

  console.log(
    `\n[images-run] 真图=${ok} | 跳过(已存在)=${skipped} | 占位=${placeholder} | 失败=${failed}`,
  );
  if (!live) {
    console.log(
      "提示:配置 apps/web/.env.local 的 OPENAI_API_KEY(GPT Image)后重跑即生成真实插画;随后跑 build-bank 回填 imageUrl。",
    );
  } else if (ok > 0) {
    console.log("下一步:跑 build-bank 重新组装以回填 imageUrl。");
  }
}

const args = process.argv.slice(2);
const specArg = args.find((a) => !a.startsWith("--")) ?? "banks/hsk2-mock-01.spec.json";
const force = args.includes("--force");
const forceDry = args.includes("--dry");

run(specArg, force, forceDry).catch((err) => {
  console.error("[images-run FATAL]", err);
  process.exit(1);
});
