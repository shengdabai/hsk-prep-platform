/**
 * services/content-engine/src/blueprint.ts
 *
 * 按 HSK_3.0_EXAM_SPEC.md 编码各级 section → 题型 → 题量 → 时长。
 * HSK 1-3 完整；HSK 4-6 完整；HSK 7-9 / HSKK 占位（结构已建但题数标 TBD）。
 */

import type { LevelBlueprint, LevelCode, BlueprintSection } from "./types.js";

// ─── HSK 1 ────────────────────────────────────────────────────────────────────
// 总计 40 题，约 40 分钟（含填写 5 分钟）
const HSK1: LevelBlueprint = {
  levelCode: "hsk-1",
  totalQuestions: 40,
  totalMinutes: 35,
  sections: [
    // 听力 20 题，约 15 分钟
    { skill: "listening", part: 1, questionTypeSlug: "L_WORD_IMG_TF",   count: 5,  durationMinutes: 3,  requiresImage: true,  requiresAudio: true,  audioPlayCount: 2 },
    { skill: "listening", part: 2, questionTypeSlug: "L_SENT_IMG_MC",   count: 5,  durationMinutes: 4,  requiresImage: true,  requiresAudio: true,  audioPlayCount: 2 },
    { skill: "listening", part: 3, questionTypeSlug: "L_DIALOG_IMG_MC", count: 5,  durationMinutes: 4,  requiresImage: true,  requiresAudio: true,  audioPlayCount: 2 },
    { skill: "listening", part: 4, questionTypeSlug: "L_QA_MC3",        count: 5,  durationMinutes: 4,  requiresImage: false, requiresAudio: true,  audioPlayCount: 2 },
    // 阅读 20 题，15 分钟
    { skill: "reading",   part: 1, questionTypeSlug: "R_IMG_WORD_TF",   count: 5,  durationMinutes: 4,  requiresImage: true,  requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 2, questionTypeSlug: "R_SENT_IMG_MC",   count: 5,  durationMinutes: 4,  requiresImage: true,  requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 3, questionTypeSlug: "R_QA_MATCH",      count: 5,  durationMinutes: 4,  requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 4, questionTypeSlug: "R_SENT_FILL_MC",  count: 5,  durationMinutes: 3,  requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
  ],
};

// ─── HSK 2 ────────────────────────────────────────────────────────────────────
// 总计 60 题，约 55 分钟
const HSK2: LevelBlueprint = {
  levelCode: "hsk-2",
  totalQuestions: 60,
  totalMinutes: 50,
  sections: [
    // 听力 35 题，约 25 分钟
    { skill: "listening", part: 1, questionTypeSlug: "L_SENT_IMG_MC",   count: 10, durationMinutes: 7,  requiresImage: true,  requiresAudio: true,  audioPlayCount: 2 },
    { skill: "listening", part: 2, questionTypeSlug: "L_DIALOG_IMG_MC", count: 10, durationMinutes: 7,  requiresImage: true,  requiresAudio: true,  audioPlayCount: 2 },
    { skill: "listening", part: 3, questionTypeSlug: "L_QA_MC3",        count: 10, durationMinutes: 7,  requiresImage: false, requiresAudio: true,  audioPlayCount: 2 },
    { skill: "listening", part: 4, questionTypeSlug: "L_QA_MC3",        count: 5,  durationMinutes: 4,  requiresImage: false, requiresAudio: true,  audioPlayCount: 2, notes: "四到五句对话" },
    // 阅读 25 题，20 分钟
    { skill: "reading",   part: 1, questionTypeSlug: "R_SENT_IMG_MC",   count: 10, durationMinutes: 7,  requiresImage: true,  requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 2, questionTypeSlug: "R_PARA_MATCH",    count: 5,  durationMinutes: 4,  requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 3, questionTypeSlug: "R_SENT_FILL_MC",  count: 5,  durationMinutes: 5,  requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 4, questionTypeSlug: "R_TEXT_MC3",      count: 5,  durationMinutes: 4,  requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
  ],
};

// ─── HSK 3 ────────────────────────────────────────────────────────────────────
// 总计 80 题，约 90 分钟
const HSK3: LevelBlueprint = {
  levelCode: "hsk-3",
  totalQuestions: 80,
  totalMinutes: 85,
  sections: [
    // 听力 40 题，约 35 分钟
    { skill: "listening", part: 1, questionTypeSlug: "L_DIALOG_IMG_MC", count: 10, durationMinutes: 9,  requiresImage: true,  requiresAudio: true,  audioPlayCount: 2 },
    { skill: "listening", part: 2, questionTypeSlug: "L_SENT_TF",       count: 10, durationMinutes: 9,  requiresImage: false, requiresAudio: true,  audioPlayCount: 2 },
    { skill: "listening", part: 3, questionTypeSlug: "L_QA_MC3",        count: 10, durationMinutes: 9,  requiresImage: false, requiresAudio: true,  audioPlayCount: 2 },
    { skill: "listening", part: 4, questionTypeSlug: "L_QA_MC3",        count: 10, durationMinutes: 8,  requiresImage: false, requiresAudio: true,  audioPlayCount: 2, notes: "多轮对话" },
    // 阅读 30 题，30 分钟
    { skill: "reading",   part: 1, questionTypeSlug: "R_PARA_MATCH",    count: 10, durationMinutes: 10, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 2, questionTypeSlug: "R_SENT_FILL_MC",  count: 10, durationMinutes: 10, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 3, questionTypeSlug: "R_TEXT_MC3",      count: 10, durationMinutes: 10, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    // 书写 10 题，15 分钟
    { skill: "writing",   part: 1, questionTypeSlug: "W_WORD_ORDER_SENT", count: 5, durationMinutes: 8, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "writing",   part: 2, questionTypeSlug: "W_PINYIN_CHAR",     count: 5, durationMinutes: 7, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
  ],
};

// ─── HSK 4 ────────────────────────────────────────────────────────────────────
// 总计 100 题，约 105 分钟
const HSK4: LevelBlueprint = {
  levelCode: "hsk-4",
  totalQuestions: 100,
  totalMinutes: 100,
  sections: [
    // 听力 45 题，30 分钟
    { skill: "listening", part: 1, questionTypeSlug: "L_SENT_TF",    count: 10, durationMinutes: 8,  requiresImage: false, requiresAudio: true,  audioPlayCount: 2 },
    { skill: "listening", part: 2, questionTypeSlug: "L_QA_MC4",     count: 15, durationMinutes: 11, requiresImage: false, requiresAudio: true,  audioPlayCount: 2 },
    { skill: "listening", part: 3, questionTypeSlug: "L_LONG_MC4",   count: 20, durationMinutes: 11, requiresImage: false, requiresAudio: true,  audioPlayCount: 2 },
    // 阅读 40 题，40 分钟
    { skill: "reading",   part: 1, questionTypeSlug: "R_TEXT_FILL_MC", count: 10, durationMinutes: 12, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 2, questionTypeSlug: "R_SENT_ORDER",   count: 10, durationMinutes: 14, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 3, questionTypeSlug: "R_TEXT_MC4",     count: 20, durationMinutes: 14, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    // 书写 15 题，25 分钟
    { skill: "writing",   part: 1, questionTypeSlug: "W_WORD_ORDER_SENT", count: 10, durationMinutes: 15, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "writing",   part: 2, questionTypeSlug: "W_IMG_WORD_SENT",   count: 5,  durationMinutes: 10, requiresImage: true,  requiresAudio: false, audioPlayCount: 1 },
  ],
};

// ─── HSK 5 ────────────────────────────────────────────────────────────────────
// 总计 100 题，约 125 分钟
const HSK5: LevelBlueprint = {
  levelCode: "hsk-5",
  totalQuestions: 100,
  totalMinutes: 120,
  sections: [
    // 听力 45 题，30 分钟
    { skill: "listening", part: 1, questionTypeSlug: "L_QA_MC4",   count: 20, durationMinutes: 13, requiresImage: false, requiresAudio: true,  audioPlayCount: 2 },
    { skill: "listening", part: 2, questionTypeSlug: "L_LONG_MC4", count: 25, durationMinutes: 17, requiresImage: false, requiresAudio: true,  audioPlayCount: 2 },
    // 阅读 45 题，45 分钟
    { skill: "reading",   part: 1, questionTypeSlug: "R_TEXT_FILL_MC", count: 15, durationMinutes: 15, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 2, questionTypeSlug: "R_TEXT_MC4",     count: 10, durationMinutes: 15, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 3, questionTypeSlug: "R_TEXT_MC4",     count: 20, durationMinutes: 15, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    // 书写 10 题，40 分钟
    { skill: "writing",   part: 1, questionTypeSlug: "W_WORD_SENT",      count: 8, durationMinutes: 24, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "writing",   part: 2, questionTypeSlug: "W_IMG_WORD_PARA",  count: 2, durationMinutes: 16, requiresImage: true,  requiresAudio: false, audioPlayCount: 1 },
  ],
};

// ─── HSK 6 ────────────────────────────────────────────────────────────────────
// 总计 101 题，约 140 分钟
const HSK6: LevelBlueprint = {
  levelCode: "hsk-6",
  totalQuestions: 101,
  totalMinutes: 135,
  sections: [
    // 听力 50 题，35 分钟
    { skill: "listening", part: 1, questionTypeSlug: "L_CONSIST_MC4", count: 15, durationMinutes: 11, requiresImage: false, requiresAudio: true,  audioPlayCount: 2 },
    { skill: "listening", part: 2, questionTypeSlug: "L_LONG_MC4",    count: 15, durationMinutes: 12, requiresImage: false, requiresAudio: true,  audioPlayCount: 2, notes: "3段采访，每段5题" },
    { skill: "listening", part: 3, questionTypeSlug: "L_LONG_MC4",    count: 20, durationMinutes: 12, requiresImage: false, requiresAudio: true,  audioPlayCount: 2, notes: "新闻/讲座语段" },
    // 阅读 50 题，50 分钟
    { skill: "reading",   part: 1, questionTypeSlug: "R_ERROR_MC",          count: 10, durationMinutes: 12, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 2, questionTypeSlug: "R_TEXT_FILL_MC",      count: 10, durationMinutes: 12, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 3, questionTypeSlug: "R_SENT_FILL_CONTEXT", count: 10, durationMinutes: 12, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "reading",   part: 4, questionTypeSlug: "R_TEXT_MC4",          count: 20, durationMinutes: 14, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    // 书写 1 题，45 分钟
    { skill: "writing",   part: 1, questionTypeSlug: "W_SUMMARIZE", count: 1,  durationMinutes: 45, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
  ],
};

// ─── HSK 7-9 (占位) ───────────────────────────────────────────────────────────
// 总计 98 题，约 210 分钟（含口语/翻译，部分分部题数 TBD）
const HSK7_9: LevelBlueprint = {
  levelCode: "hsk-7-9",
  totalQuestions: 98,
  totalMinutes: 210,
  sections: [
    // 听力 40 题，约 30 分钟
    { skill: "listening", part: 1, questionTypeSlug: "L_NEWS_TF",    count: 10, durationMinutes: 8,  requiresImage: false, requiresAudio: true,  audioPlayCount: 1, notes: "新闻判断,仅播1次" },
    { skill: "listening", part: 2, questionTypeSlug: "L_LONG_FILL",  count: 12, durationMinutes: 12, requiresImage: false, requiresAudio: true,  audioPlayCount: 1, notes: "9题单选+3题填空,仅播1次" },
    { skill: "listening", part: 3, questionTypeSlug: "L_LONG_FILL",  count: 18, durationMinutes: 10, requiresImage: false, requiresAudio: true,  audioPlayCount: 1, notes: "15题单选+3题填空,仅播1次" },
    // 阅读 47 题，约 65 分钟
    { skill: "reading",   part: 1, questionTypeSlug: "R_TEXT_MC4", count: 28, durationMinutes: 35, requiresImage: false, requiresAudio: false, audioPlayCount: 1, notes: "4篇×7题" },
    { skill: "reading",   part: 4, questionTypeSlug: "R_TEXT_MC4", count: 20, durationMinutes: 30, requiresImage: false, requiresAudio: false, audioPlayCount: 1, notes: "5篇×4题;中间分部题数TBD" },
    // 写作 1 题，约 45 分钟
    { skill: "writing",   part: 1, questionTypeSlug: "W_SUMMARIZE",    count: 1, durationMinutes: 45, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    // 翻译 (TBD 精确题数)
    { skill: "translation", part: 1, questionTypeSlug: "T_L2C_WRITTEN",   count: 1, durationMinutes: 20, requiresImage: false, requiresAudio: false, audioPlayCount: 1, notes: "题数TBD" },
    { skill: "translation", part: 2, questionTypeSlug: "T_L2C_INTERPRET", count: 1, durationMinutes: 10, requiresImage: false, requiresAudio: true,  audioPlayCount: 1, notes: "题数TBD" },
    // 口语 (TBD)
    { skill: "speaking",  part: 1, questionTypeSlug: "S_OPINION", count: 1, durationMinutes: 10, requiresImage: false, requiresAudio: true, audioPlayCount: 1, notes: "完整结构TBD" },
  ],
};

// ─── HSKK 占位 ────────────────────────────────────────────────────────────────

const HSKK_BEGINNER: LevelBlueprint = {
  levelCode: "hskk-beginner",
  totalQuestions: 27,
  totalMinutes: 17,
  sections: [
    { skill: "speaking", part: 1, questionTypeSlug: "S_HSKK_REPEAT",  count: 15, durationMinutes: 6, requiresImage: false, requiresAudio: true,  audioPlayCount: 1 },
    { skill: "speaking", part: 2, questionTypeSlug: "S_HSKK_QA",      count: 10, durationMinutes: 6, requiresImage: false, requiresAudio: true,  audioPlayCount: 1 },
    { skill: "speaking", part: 3, questionTypeSlug: "S_HSKK_FREE_QA", count: 2,  durationMinutes: 5, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
  ],
};

const HSKK_INTERMEDIATE: LevelBlueprint = {
  levelCode: "hskk-intermediate",
  totalQuestions: 14,
  totalMinutes: 21,
  sections: [
    { skill: "speaking", part: 1, questionTypeSlug: "S_HSKK_REPEAT",  count: 10, durationMinutes: 8, requiresImage: false, requiresAudio: true,  audioPlayCount: 1 },
    { skill: "speaking", part: 2, questionTypeSlug: "S_HSKK_READ",    count: 2,  durationMinutes: 6, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "speaking", part: 3, questionTypeSlug: "S_HSKK_FREE_QA", count: 2,  durationMinutes: 7, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
  ],
};

const HSKK_ADVANCED: LevelBlueprint = {
  levelCode: "hskk-advanced",
  totalQuestions: 6,
  totalMinutes: 25,
  sections: [
    { skill: "speaking", part: 1, questionTypeSlug: "S_HSKK_RETELL",  count: 3, durationMinutes: 10, requiresImage: false, requiresAudio: true,  audioPlayCount: 1 },
    { skill: "speaking", part: 2, questionTypeSlug: "S_HSKK_READ",    count: 1, durationMinutes: 5,  requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
    { skill: "speaking", part: 3, questionTypeSlug: "S_HSKK_FREE_QA", count: 2, durationMinutes: 10, requiresImage: false, requiresAudio: false, audioPlayCount: 1 },
  ],
};

// ─── 注册表 ────────────────────────────────────────────────────────────────────

const BLUEPRINTS: Record<LevelCode, LevelBlueprint> = {
  "hsk-1": HSK1,
  "hsk-2": HSK2,
  "hsk-3": HSK3,
  "hsk-4": HSK4,
  "hsk-5": HSK5,
  "hsk-6": HSK6,
  "hsk-7-9": HSK7_9,
  "hskk-beginner": HSKK_BEGINNER,
  "hskk-intermediate": HSKK_INTERMEDIATE,
  "hskk-advanced": HSKK_ADVANCED,
};

export function getBlueprint(levelCode: LevelCode): LevelBlueprint {
  return BLUEPRINTS[levelCode];
}

export function getAllBlueprints(): LevelBlueprint[] {
  return Object.values(BLUEPRINTS);
}

/**
 * 从蓝图展开出 GenerationJobItem 列表（完整模拟卷）。
 */
export function blueprintToJobItems(
  blueprint: LevelBlueprint,
): Array<{ questionTypeSlug: import("./types.js").QuestionTypeSlug; count: number }> {
  return blueprint.sections.map((s) => ({
    questionTypeSlug: s.questionTypeSlug,
    count: s.count,
  }));
}
