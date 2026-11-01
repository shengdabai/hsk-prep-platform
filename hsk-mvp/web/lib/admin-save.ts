import type { Question } from "./hsk-content";

// Save path of /api/admin/generate. Each item is rebuilt from known fields only, so a caller
// cannot store extra fields or mark its own items as reviewed or published.
const KINDS = ["image_true_false", "image_choice", "single_choice", "matching", "fill_blank"] as const;
const SECTIONS = ["听力", "阅读"] as const;
const SOURCES = ["reference_only", "re_authored", "original"] as const;
const COPYRIGHT = ["pending", "cleared"] as const;
const PARTS = [1, 2, 3, 4] as const;
export const MAX_SAVE_ITEMS = 50;
const MAX_TEXT = 2000;

function oneOf<T extends string | number>(list: readonly T[], value: unknown): value is T {
  return (list as readonly unknown[]).includes(value);
}
function text(value: unknown, max = MAX_TEXT): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}
function optionalText(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || (typeof value === "string" && value.length <= MAX_TEXT);
}
function textList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 50 && value.every((v) => typeof v === "string" && v.length <= 200);
}

export function sanitizeQuestion(input: unknown): Question | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const { id, title, level, section, part, kind, prompt, context, visualHint, options, answer,
    explanation, estimatedSeconds, vocabFocus, tags, sourceType, copyrightStatus } = input as Record<string, unknown>;
  if (!text(id, 100) || !text(title) || level !== "HSK1" || !oneOf(SECTIONS, section) || !oneOf(PARTS, part) ||
      !oneOf(KINDS, kind) || !text(prompt) || !optionalText(context) || !optionalText(visualHint) ||
      typeof explanation !== "string" || explanation.length > MAX_TEXT ||
      typeof estimatedSeconds !== "number" || !Number.isFinite(estimatedSeconds) || estimatedSeconds <= 0 || estimatedSeconds > 3600 ||
      !textList(vocabFocus) || !textList(tags) || !oneOf(SOURCES, sourceType) || !oneOf(COPYRIGHT, copyrightStatus)) {
    return null;
  }
  if (!Array.isArray(options) || options.length === 0 || options.length > 10) return null;
  const cleanOptions: Question["options"] = [];
  for (const option of options) {
    if (!option || typeof option !== "object") return null;
    const { id: optionId, label, text: optionText } = option as Record<string, unknown>;
    if (!text(optionId, 20) || !text(label, 20) || !text(optionText, 500)) return null;
    cleanOptions.push({ id: optionId, label, text: optionText });
  }
  // Matching answers are an ordering such as "3,1,4,2,5"; every other kind names one option id.
  const answerOk = kind === "matching"
    ? typeof answer === "string" && /^\d+(,\d+)*$/.test(answer)
    : cleanOptions.some((option) => option.id === answer);
  if (!answerOk) return null;

  return {
    id, title, level: "HSK1", section, part, kind, prompt,
    ...(typeof context === "string" ? { context } : {}),
    ...(typeof visualHint === "string" ? { visualHint } : {}),
    options: cleanOptions,
    answer: answer as string,
    explanation, estimatedSeconds,
    vocabFocus: [...vocabFocus], tags: [...tags], sourceType, copyrightStatus,
    // Saved items always wait for human review; the caller cannot approve or publish them.
    reviewStatus: "pending",
    publishStatus: "draft",
  };
}

export type SavePlan = { ok: true; items: Question[]; skipped: number } | { ok: false; error: string };

// A save request never falls through to paid generation: missing, empty or invalid input is an error.
export function planSave(pregenerated: unknown): SavePlan {
  if (!Array.isArray(pregenerated) || pregenerated.length === 0) {
    return { ok: false, error: "save 模式需要非空的 pregenerated 数组。" };
  }
  if (pregenerated.length > MAX_SAVE_ITEMS) return { ok: false, error: `一次最多保存 ${MAX_SAVE_ITEMS} 题。` };
  const items = pregenerated.map(sanitizeQuestion).filter((q): q is Question => q !== null);
  if (items.length === 0) return { ok: false, error: "pregenerated 中无结构合法的题目。" };
  return { ok: true, items, skipped: pregenerated.length - items.length };
}
