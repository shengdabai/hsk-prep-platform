#!/usr/bin/env node
/**
 * services/content-engine/src/cli.ts
 *
 * 命令行入口。
 *
 * 用法:
 *   npx tsx services/content-engine/src/cli.ts [options]
 *
 * 选项:
 *   --level <code>         HSK 级别，如 hsk-1 (默认: hsk-1)
 *   --types <slugs>        逗号分隔的题型代码；省略则按蓝图自动展开
 *   --count <n>            每种题型的题数；省略则按蓝图默认；与 --types 组合使用
 *   --dry-run              不真调外部 API，产出 mock 占位数据
 *   --help                 显示帮助
 *
 * 示例:
 *   # 完整 hsk-1 模拟卷 dry-run
 *   npx tsx services/content-engine/src/cli.ts --level hsk-1 --dry-run
 *
 *   # 只生成 2 道特定题型，真实调用
 *   npx tsx services/content-engine/src/cli.ts --level hsk-2 --types L_SENT_IMG_MC --count 2
 */

import { runGenerationJob } from "./orchestrator.js";
import { getBlueprint, blueprintToJobItems } from "./blueprint.js";
import type { GenerationJob, LevelCode, QuestionTypeSlug } from "./types.js";

// ─── 解析 CLI 参数 ────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): {
  level: LevelCode;
  types?: QuestionTypeSlug[];
  count?: number;
  dryRun: boolean;
  help: boolean;
} {
  const args = argv.slice(2);
  const result = {
    level: "hsk-1" as LevelCode,
    types: undefined as QuestionTypeSlug[] | undefined,
    count: undefined as number | undefined,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--dry-run") {
      result.dryRun = true;
    } else if (arg === "--level" && args[i + 1]) {
      result.level = args[++i] as LevelCode;
    } else if (arg === "--types" && args[i + 1]) {
      result.types = args[++i].split(",").map((s) => s.trim()) as QuestionTypeSlug[];
    } else if (arg === "--count" && args[i + 1]) {
      result.count = parseInt(args[++i], 10);
    }
  }
  return result;
}

function printHelp(): void {
  console.log(`
HSK 内容生产引擎 CLI
===================
用法:
  npx tsx src/cli.ts [选项]

选项:
  --level <code>     HSK 级别 (默认: hsk-1)
                     可选: hsk-1 ~ hsk-6, hsk-7-9,
                           hskk-beginner, hskk-intermediate, hskk-advanced
  --types <slugs>    逗号分隔的题型代码，省略则按蓝图全量展开
  --count <n>        每种题型题数 (与 --types 组合)，省略则按蓝图默认
  --dry-run          不真调外部 API，产出 mock 占位数据
  --help             显示此帮助

环境变量（真实调用时需要配置）:
  LLM_API_KEY        DeepSeek / OpenAI 兼容 API 密钥
  LLM_BASE_URL       LLM 端点基础 URL (默认 https://api.deepseek.com)
  LLM_MODEL          LLM 模型名 (默认 deepseek-chat)
  OPENAI_API_KEY     OpenAI API 密钥 (GPT Image 2 配图)
  OPENAI_IMAGE_MODEL GPT Image 模型名 (默认 gpt-image-alpha)
  MINIMAX_API_KEY    Minimax API 密钥 (TTS 配音)
  MINIMAX_GROUP_ID   Minimax Group ID

输出:
  services/content-engine/output/generated-batch.json
  services/content-engine/output/images/<batchId>/
  services/content-engine/output/audio/<batchId>/
`);
}

// ─── 主函数 ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  // 构建 job
  let jobItems: Array<{ questionTypeSlug: QuestionTypeSlug; count: number }>;

  if (opts.types && opts.types.length > 0) {
    // 用户指定题型
    const countPerType = opts.count ?? 2;
    jobItems = opts.types.map((t) => ({ questionTypeSlug: t, count: countPerType }));
  } else {
    // 按蓝图自动展开
    const blueprint = getBlueprint(opts.level);
    if (!blueprint) {
      console.error(`[ERROR] 未知级别: ${opts.level}`);
      process.exit(1);
    }
    // dry-run 时各题型只生成 1 题加快速度；正式跑按蓝图全量
    const rawItems = blueprintToJobItems(blueprint);
    jobItems = opts.dryRun
      ? rawItems.map((it) => ({ ...it, count: 1 }))
      : rawItems;
  }

  const job: GenerationJob = {
    levelCode: opts.level,
    items: jobItems,
    dryRun: opts.dryRun,
  };

  const mode = opts.dryRun ? "DRY-RUN" : "LIVE";
  const totalQuestions = jobItems.reduce((s, it) => s + it.count, 0);
  console.log(`\n[content-engine] ${mode} | level=${opts.level} | 题型×数量: ${jobItems.length} 类 × 总计 ${totalQuestions} 题\n`);

  const t0 = Date.now();
  const batch = await runGenerationJob(job);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  // 输出摘要
  const { summary } = batch;
  console.log("─────────────────────────────────────────");
  console.log(`batchId    : ${batch.batchId}`);
  console.log(`level      : ${batch.levelCode}`);
  console.log(`dryRun     : ${batch.dryRun}`);
  console.log(`total      : ${summary.total}`);
  console.log(`succeeded  : ${summary.succeeded}`);
  console.log(`failed     : ${summary.failed}`);
  console.log(`withImages : ${summary.withImages}`);
  console.log(`withAudio  : ${summary.withAudio}`);
  console.log(`elapsed    : ${elapsed}s`);
  console.log("─────────────────────────────────────────");
  console.log(`\n输出文件: services/content-engine/output/generated-batch.json`);

  // 打印前 2 条样例
  const samples = batch.items.slice(0, 2);
  console.log("\n── 样例条目（前 2 条） ──────────────────");
  for (const item of samples) {
    console.log(`  id             : ${item.id}`);
    console.log(`  questionType   : ${item.questionTypeSlug}`);
    console.log(`  skill          : ${item.skill}`);
    console.log(`  answerFormat   : ${item.answerFormat}`);
    console.log(`  prompt snippet : ${item.prompt.slice(0, 60)}...`);
    console.log(`  correctAnswer  : ${item.correctAnswer}`);
    console.log(`  images         : ${item.images.length > 0 ? (item.images[0].filePath ?? item.images[0].placeholder ?? "error") : "none"}`);
    console.log(`  audio          : ${item.audio.length > 0 ? (item.audio[0].filePath ?? item.audio[0].placeholder ?? "error") : "none"}`);
    console.log(`  reviewStatus   : ${item.reviewStatus}`);
    console.log(`  publishStatus  : ${item.publishStatus}`);
    console.log("");
  }

  if (summary.failed > 0) {
    console.warn(`[WARN] ${summary.failed} 题生成失败，详见 generated-batch.json 中 failed=true 的条目。`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
