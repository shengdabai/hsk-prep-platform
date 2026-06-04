import {
  QUESTION_TYPE_META,
  type AnswerFormat,
  type ContentItem,
  type SectionCode,
} from "./types";

// 统一判分(纯函数)。供 mock / supabase 两套 repository 与多维报告共用,保证口径一致。
// 修复:此前所有题型都做 `answer === correctOptionId` 单一相等比较,导致 order/书写/口语
// 必然错判。这里按 answerFormat 分流:
//   - 真主观题(write_sentence/write_essay/speak):无法客观自动判分 → "ungraded"。
//   - write_char(看拼音写汉字):有确定客观答案(answerText 为单/少数汉字),
//     按归一化(去空格 + 繁简/全半角容错)精确匹配自动判分;无 answerText 时回退 ungraded。
//   - order(排序):比较归一化后的序列(正确序列存 answerText,回退 correctOptionId)。
//   - fill(听写/选词填空):无选项时按 answerText 文本精确比较。
//   - 其余(judge/mc3/mc4/mc_image/fill 选词/match 降级):选项键相等比较。

export type GradeOutcome = "correct" | "incorrect" | "ungraded";

// 真主观题:看图写句/写段、缩写、笔译、口译、口语等,答案多样无法客观判分 → 人工/ungraded。
// 注意:write_char(看拼音写汉字)不在此列——它有确定答案,走下方自动文本判分分支。
const MANUAL_FORMATS: readonly AnswerFormat[] = [
  "write_sentence",
  "write_essay",
  "speak",
];

function formatOf(item: ContentItem): AnswerFormat {
  const meta = QUESTION_TYPE_META[item.questionTypeCode];
  return meta?.answerFormat ?? "mc4";
}

function normalizeSequence(value: string): string {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");
}

// 文本填空归一化:去首尾空白与内部空白,便于无选项 fill 题(如听后填空)按 answerText 精确比较。
function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

// 看拼音写汉字(write_char)极少数常见繁/异体 → 简体的容错映射。
// 仅收录 HSK 书写题常出现、繁简点对点等价的高频字,适度容错不做全表繁简转换(避免误判)。
const CHAR_VARIANTS: Record<string, string> = {
  // 繁体/异体 → 简体(覆盖本题库书写题用字 + 常见高频字)
  復: "复", 環: "环", 興: "兴", 鍛: "锻", 貴: "贵", 點: "点",
  愛: "爱", 學: "学", 們: "们", 國: "国", 樂: "乐", 書: "书",
  爲: "为", 衆: "众",
};

// write_char 归一化:去空白 + 全角→半角(数字/字母/标点)+ 繁/异体→简体容错。
function normalizeChar(value: string): string {
  const stripped = value.trim().replace(/\s+/g, "");
  // 全角 ASCII(！-～)→ 半角;全角空格(　)已被 \s+ 去除。
  const halfWidth = stripped.replace(/[！-～]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
  // 逐字符做繁/异体 → 简体映射(未命中保持原字)。
  let mapped = "";
  for (const ch of halfWidth) {
    mapped += CHAR_VARIANTS[ch] ?? ch;
  }
  return mapped;
}

// 该题是否可被客观自动判分(真主观书写/口语不可)。
// write_char 仅当 answerText 非空时才视为可自动判分(无参考答案则归人工)。
export function isAutoGradable(item: ContentItem): boolean {
  const format = formatOf(item);
  if (MANUAL_FORMATS.includes(format)) {
    return false;
  }
  if (format === "write_char") {
    return Boolean((item.answerText ?? "").trim());
  }
  return true;
}

export function gradeResponse(
  item: ContentItem,
  answer: string | undefined | null,
): GradeOutcome {
  const format = formatOf(item);

  // ── 共享选项池(A-F 六选共享)判分分支 ──────────────────────────────────
  // 题带 sharedOptionPool 时,用户提交的仍是池内某个选项 id(字母),每题自带
  // correctOptionId 指向其正确的池选项。判分口径与既有"选项键相等"完全一致:
  // 未作答记错,选中即与 correctOptionId 比较。显式前置此分支只为自文档化语义,
  // **不改变**任何既有题型(single_choice/order/fill/write_char/match)的判分逻辑。
  if (item.sharedOptionPool) {
    if (answer == null || answer === "") {
      return "incorrect";
    }
    return answer === item.correctOptionId ? "correct" : "incorrect";
  }

  if (MANUAL_FORMATS.includes(format)) {
    return "ungraded";
  }
  // 看拼音写汉字:有客观答案。无 answerText 时无法判分 → ungraded(不冤判为错)。
  if (format === "write_char" && !((item.answerText ?? "").trim())) {
    return "ungraded";
  }
  // 客观题未作答记为错。
  if (answer == null || answer === "") {
    return "incorrect";
  }
  // 看拼音写汉字:归一化(去空格 + 全半角 + 繁简容错)后精确匹配 answerText。
  if (format === "write_char") {
    return normalizeChar(answer) === normalizeChar(item.answerText ?? "")
      ? "correct"
      : "incorrect";
  }
  if (format === "order") {
    const expected = item.answerText ?? item.correctOptionId ?? "";
    return normalizeSequence(answer) === normalizeSequence(expected) ? "correct" : "incorrect";
  }
  // 文本填空(无选项,答案存 answerText,如听后填空 L_LONG_FILL):按归一化文本精确比较。
  if (format === "fill" && !item.correctOptionId && item.answerText) {
    return normalizeText(answer) === normalizeText(item.answerText) ? "correct" : "incorrect";
  }
  // 选项键相等(judge/mc3/mc4/mc_image/fill 选词/match 降级)。
  return answer === item.correctOptionId ? "correct" : "incorrect";
}

// 按 section 统计 {correct,total}(纯函数)。total 只算可自动判分的题
// (主观书写/口语不计入分母),与 mock/supabase 的 sectionBreakdown 口径一致。
// 这是判分的唯一实现:两套 repository 与「快照评分」均复用本函数,消除三重复制
// (此前 mock/supabase 各自重写一份逻辑等价的本地 scoreSection,靠人工同步口径)。
// 判分算法不变(仍走 gradeResponse / isAutoGradable);签名放宽到任意 SectionCode,
// 以支持 HSK4-9 的 writing/speaking/translation 分区,而非硬编码 listening+reading。
export type SectionScore = {
  sectionCode: SectionCode;
  correct: number;
  total: number;
};

export function scoreSection(
  items: ContentItem[],
  answers: Record<string, string>,
  sectionCode: SectionCode,
): SectionScore {
  const relevant = items.filter((item) => item.sectionCode === sectionCode);
  const correct = relevant.filter(
    (item) => gradeResponse(item, answers[item.id]) === "correct",
  ).length;
  const total = relevant.filter((item) => isAutoGradable(item)).length;
  return { sectionCode, correct, total };
}

// 按卷面实际出现的 section 通用聚合 sectionBreakdown(纯函数)。
// 取代两套 repository 各自硬编码 listening+reading 的写法:遍历 items 中实际出现的
// sectionCode(保持首次出现顺序),逐段调用 scoreSection。这样写作/口语/翻译分区
// (HSK4-9)也会进入 sectionBreakdown,而不是被两科时代的硬编码丢弃。
export function computeSectionBreakdown(
  items: ContentItem[],
  answers: Record<string, string>,
): SectionScore[] {
  const seen = new Set<SectionCode>();
  const orderedCodes: SectionCode[] = [];
  for (const item of items) {
    if (!seen.has(item.sectionCode)) {
      seen.add(item.sectionCode);
      orderedCodes.push(item.sectionCode);
    }
  }
  return orderedCodes.map((code) => scoreSection(items, answers, code));
}
