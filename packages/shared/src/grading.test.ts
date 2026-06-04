import { describe, expect, it } from "vitest";
import {
  gradeResponse,
  isAutoGradable,
  scoreSection,
  type GradeOutcome,
} from "./grading";
import { computeReportDimensions } from "./report";
import type {
  ContentItem,
  QuestionTypeCode,
  SectionCode,
  SharedOptionPool,
} from "./types";

// ─── 测试工厂 ───────────────────────────────────────────────────────────────
// 用最小必填字段构造一个 ContentItem。questionTypeCode 决定 answerFormat,
// 是判分分流的真正驱动,因此每个用例显式指定它,其余字段给合理占位。
function makeItem(overrides: Partial<ContentItem> & { questionTypeCode: QuestionTypeCode }): ContentItem {
  const sectionCode: SectionCode =
    overrides.sectionCode ?? "reading";
  return {
    id: overrides.id ?? "item_1",
    levelCode: "hsk-1",
    sectionCode,
    questionTypeCode: overrides.questionTypeCode,
    title: "t",
    stem: "s",
    prompt: "p",
    explanation: "e",
    reviewStatus: "approved",
    publishStatus: "published",
    sourceType: "original",
    copyrightCleared: true,
    options: overrides.options ?? [],
    correctOptionId: overrides.correctOptionId ?? "",
    tags: overrides.tags ?? [],
    answerText: overrides.answerText,
    sharedOptionPool: overrides.sharedOptionPool,
    context: overrides.context,
  };
}

describe("gradeResponse — single_choice (mc3/mc4, 选项键相等)", () => {
  // single_choice 元数据 answerFormat = mc3 → 走选项键相等比较分支。
  it("正确选项 → correct", () => {
    const item = makeItem({ questionTypeCode: "single_choice", correctOptionId: "B" });
    expect(gradeResponse(item, "B")).toBe<GradeOutcome>("correct");
  });
  it("错误选项 → incorrect", () => {
    const item = makeItem({ questionTypeCode: "single_choice", correctOptionId: "B" });
    expect(gradeResponse(item, "A")).toBe("incorrect");
  });
  it("未作答(undefined)→ incorrect", () => {
    const item = makeItem({ questionTypeCode: "single_choice", correctOptionId: "B" });
    expect(gradeResponse(item, undefined)).toBe("incorrect");
  });
  it("未作答(null)→ incorrect", () => {
    const item = makeItem({ questionTypeCode: "single_choice", correctOptionId: "B" });
    expect(gradeResponse(item, null)).toBe("incorrect");
  });
  it("未作答(空串)→ incorrect", () => {
    const item = makeItem({ questionTypeCode: "single_choice", correctOptionId: "B" });
    expect(gradeResponse(item, "")).toBe("incorrect");
  });
  it("mc4 四选一同样走选项键相等", () => {
    const item = makeItem({ questionTypeCode: "L_QA_MC4", sectionCode: "listening", correctOptionId: "D" });
    expect(gradeResponse(item, "D")).toBe("correct");
    expect(gradeResponse(item, "C")).toBe("incorrect");
  });
  it("judge 判断题(answerFormat=judge)走选项键相等", () => {
    const item = makeItem({ questionTypeCode: "L_SENT_TF", sectionCode: "listening", correctOptionId: "T" });
    expect(gradeResponse(item, "T")).toBe("correct");
    expect(gradeResponse(item, "F")).toBe("incorrect");
  });
});

describe("gradeResponse — order(序列归一化比较)", () => {
  // R_SENT_ORDER → answerFormat=order。正确序列优先存 answerText,回退 correctOptionId。
  it("序列完全一致 → correct", () => {
    const item = makeItem({ questionTypeCode: "R_SENT_ORDER", answerText: "B,A,C" });
    expect(gradeResponse(item, "B,A,C")).toBe("correct");
  });
  it("序列乱序 → incorrect", () => {
    const item = makeItem({ questionTypeCode: "R_SENT_ORDER", answerText: "B,A,C" });
    expect(gradeResponse(item, "A,B,C")).toBe("incorrect");
  });
  it("空白容错:答案带多余空格,归一化后相等 → correct", () => {
    const item = makeItem({ questionTypeCode: "R_SENT_ORDER", answerText: "B,A,C" });
    expect(gradeResponse(item, " B , A , C ")).toBe("correct");
  });
  it("尾随逗号/空段被过滤,归一化后相等 → correct", () => {
    const item = makeItem({ questionTypeCode: "R_SENT_ORDER", answerText: "B,A,C" });
    expect(gradeResponse(item, "B,A,C,")).toBe("correct");
  });
  it("无 answerText 时回退用 correctOptionId 作为期望序列", () => {
    const item = makeItem({ questionTypeCode: "R_SENT_ORDER", answerText: null, correctOptionId: "A,B" });
    expect(gradeResponse(item, "A,B")).toBe("correct");
    expect(gradeResponse(item, "B,A")).toBe("incorrect");
  });
  it("未作答 → incorrect", () => {
    const item = makeItem({ questionTypeCode: "R_SENT_ORDER", answerText: "B,A,C" });
    expect(gradeResponse(item, undefined)).toBe("incorrect");
  });
});

describe("gradeResponse — fill(无选项文本填空,answerText 归一化)", () => {
  // L_LONG_FILL → answerFormat=fill,且无 correctOptionId、有 answerText → 走文本归一化比较。
  it("文本精确匹配 → correct", () => {
    const item = makeItem({
      questionTypeCode: "L_LONG_FILL",
      sectionCode: "listening",
      correctOptionId: "",
      answerText: "图书馆",
    });
    expect(gradeResponse(item, "图书馆")).toBe("correct");
  });
  it("内部/首尾空格被去除后相等 → correct", () => {
    const item = makeItem({
      questionTypeCode: "L_LONG_FILL",
      sectionCode: "listening",
      correctOptionId: "",
      answerText: "图书馆",
    });
    expect(gradeResponse(item, " 图 书 馆 ")).toBe("correct");
  });
  it("内容不同 → incorrect", () => {
    const item = makeItem({
      questionTypeCode: "L_LONG_FILL",
      sectionCode: "listening",
      correctOptionId: "",
      answerText: "图书馆",
    });
    expect(gradeResponse(item, "体育馆")).toBe("incorrect");
  });
  it("未作答 → incorrect", () => {
    const item = makeItem({
      questionTypeCode: "L_LONG_FILL",
      sectionCode: "listening",
      correctOptionId: "",
      answerText: "图书馆",
    });
    expect(gradeResponse(item, "")).toBe("incorrect");
  });
  it("选词填空 fill 但带 correctOptionId → 走选项键相等(非文本分支)", () => {
    // R_SENT_FILL_MC → answerFormat=fill,有 correctOptionId → 不进文本分支,按选项比较。
    const item = makeItem({ questionTypeCode: "R_SENT_FILL_MC", correctOptionId: "C" });
    expect(gradeResponse(item, "C")).toBe("correct");
    expect(gradeResponse(item, "A")).toBe("incorrect");
  });
});

describe("gradeResponse — write_char(看拼音写汉字,繁简/全半角/空格容错)", () => {
  // W_PINYIN_CHAR → answerFormat=write_char。
  it("简体精确匹配 → correct", () => {
    const item = makeItem({ questionTypeCode: "W_PINYIN_CHAR", sectionCode: "writing", answerText: "复" });
    expect(gradeResponse(item, "复")).toBe("correct");
  });
  it("繁体输入被映射为简体 → correct(復→复)", () => {
    const item = makeItem({ questionTypeCode: "W_PINYIN_CHAR", sectionCode: "writing", answerText: "复" });
    expect(gradeResponse(item, "復")).toBe("correct");
  });
  it("参考答案为繁体、用户答简体 → correct(两侧都归一化)", () => {
    const item = makeItem({ questionTypeCode: "W_PINYIN_CHAR", sectionCode: "writing", answerText: "環" });
    expect(gradeResponse(item, "环")).toBe("correct");
  });
  it("空格容错:答案含空格归一化后相等 → correct", () => {
    const item = makeItem({ questionTypeCode: "W_PINYIN_CHAR", sectionCode: "writing", answerText: "学" });
    expect(gradeResponse(item, " 学 ")).toBe("correct");
  });
  it("全角字母→半角后相等 → correct", () => {
    const item = makeItem({ questionTypeCode: "W_PINYIN_CHAR", sectionCode: "writing", answerText: "A" });
    expect(gradeResponse(item, "Ａ")).toBe("correct"); // 全角 A
  });
  it("错字 → incorrect", () => {
    const item = makeItem({ questionTypeCode: "W_PINYIN_CHAR", sectionCode: "writing", answerText: "复" });
    expect(gradeResponse(item, "夏")).toBe("incorrect");
  });
  it("未作答 → incorrect", () => {
    const item = makeItem({ questionTypeCode: "W_PINYIN_CHAR", sectionCode: "writing", answerText: "复" });
    expect(gradeResponse(item, "")).toBe("incorrect");
  });
  it("无 answerText 的 write_char → ungraded(无参考答案不冤判)", () => {
    const item = makeItem({ questionTypeCode: "W_PINYIN_CHAR", sectionCode: "writing", answerText: null });
    expect(gradeResponse(item, "复")).toBe("ungraded");
  });
  it("answerText 全空白的 write_char → ungraded", () => {
    const item = makeItem({ questionTypeCode: "W_PINYIN_CHAR", sectionCode: "writing", answerText: "   " });
    expect(gradeResponse(item, "复")).toBe("ungraded");
  });
});

describe("gradeResponse — match(配对,选项键相等降级)", () => {
  // R_QA_MATCH → answerFormat=match → 走选项键相等比较。
  it("匹配正确 → correct", () => {
    const item = makeItem({ questionTypeCode: "R_QA_MATCH", correctOptionId: "E" });
    expect(gradeResponse(item, "E")).toBe("correct");
  });
  it("匹配错误 → incorrect", () => {
    const item = makeItem({ questionTypeCode: "R_QA_MATCH", correctOptionId: "E" });
    expect(gradeResponse(item, "F")).toBe("incorrect");
  });
});

describe("gradeResponse — sharedOptionPool(共享选项池前置分支)", () => {
  const pool: SharedOptionPool = { groupId: "g1", poolOptionIds: ["A", "B", "C", "D", "E", "F"] };
  it("池内选中正确答案 → correct", () => {
    const item = makeItem({ questionTypeCode: "R_PARA_MATCH", correctOptionId: "D", sharedOptionPool: pool });
    expect(gradeResponse(item, "D")).toBe("correct");
  });
  it("池内选错 → incorrect", () => {
    const item = makeItem({ questionTypeCode: "R_PARA_MATCH", correctOptionId: "D", sharedOptionPool: pool });
    expect(gradeResponse(item, "A")).toBe("incorrect");
  });
  it("未作答 → incorrect", () => {
    const item = makeItem({ questionTypeCode: "R_PARA_MATCH", correctOptionId: "D", sharedOptionPool: pool });
    expect(gradeResponse(item, null)).toBe("incorrect");
    expect(gradeResponse(item, "")).toBe("incorrect");
  });
  it("sharedOptionPool 分支优先于 manual 分支:即便是主观题型也按池比较", () => {
    // 验证前置:带池的题不会落入 ungraded(分支顺序正确)。
    const item = makeItem({
      questionTypeCode: "W_WORD_SENT", // 本是主观 write_sentence
      sectionCode: "writing",
      correctOptionId: "C",
      sharedOptionPool: pool,
    });
    expect(gradeResponse(item, "C")).toBe("correct");
    expect(gradeResponse(item, "A")).toBe("incorrect");
  });
});

describe("gradeResponse — 主观题 ungraded", () => {
  it("write_sentence → ungraded", () => {
    const item = makeItem({ questionTypeCode: "W_WORD_SENT", sectionCode: "writing", answerText: "随便写的句子" });
    expect(gradeResponse(item, "我写了一句话")).toBe("ungraded");
  });
  it("write_essay → ungraded", () => {
    const item = makeItem({ questionTypeCode: "W_SUMMARIZE", sectionCode: "writing" });
    expect(gradeResponse(item, "一大段缩写")).toBe("ungraded");
  });
  it("speak(口语)→ ungraded", () => {
    const item = makeItem({ questionTypeCode: "S_HSKK_REPEAT", sectionCode: "speaking" });
    expect(gradeResponse(item, "audio-blob")).toBe("ungraded");
  });
  it("主观题即便未作答也 ungraded(不记错)", () => {
    const item = makeItem({ questionTypeCode: "S_HSKK_REPEAT", sectionCode: "speaking" });
    expect(gradeResponse(item, undefined)).toBe("ungraded");
  });
});

describe("isAutoGradable", () => {
  it("客观题(single_choice)→ true", () => {
    expect(isAutoGradable(makeItem({ questionTypeCode: "single_choice" }))).toBe(true);
  });
  it("order → true", () => {
    expect(isAutoGradable(makeItem({ questionTypeCode: "R_SENT_ORDER" }))).toBe(true);
  });
  it("主观 write_sentence → false", () => {
    expect(isAutoGradable(makeItem({ questionTypeCode: "W_WORD_SENT", sectionCode: "writing" }))).toBe(false);
  });
  it("speak → false", () => {
    expect(isAutoGradable(makeItem({ questionTypeCode: "S_HSKK_QA", sectionCode: "speaking" }))).toBe(false);
  });
  it("write_char 有 answerText → true", () => {
    expect(
      isAutoGradable(makeItem({ questionTypeCode: "W_PINYIN_CHAR", sectionCode: "writing", answerText: "复" })),
    ).toBe(true);
  });
  it("write_char 无 answerText → false", () => {
    expect(
      isAutoGradable(makeItem({ questionTypeCode: "W_PINYIN_CHAR", sectionCode: "writing", answerText: null })),
    ).toBe(false);
  });
});

describe("scoreSection — 分段聚合", () => {
  it("只统计指定 section,total 排除主观题", () => {
    const items: ContentItem[] = [
      makeItem({ id: "l1", questionTypeCode: "L_QA_MC4", sectionCode: "listening", correctOptionId: "A" }),
      makeItem({ id: "l2", questionTypeCode: "L_QA_MC4", sectionCode: "listening", correctOptionId: "B" }),
      // 主观口语题混入 listening:可计入分母吗?它 sectionCode=speaking,不属 listening,被 filter 掉。
      makeItem({ id: "s1", questionTypeCode: "S_HSKK_QA", sectionCode: "speaking" }),
      makeItem({ id: "r1", questionTypeCode: "single_choice", sectionCode: "reading", correctOptionId: "C" }),
    ];
    const answers = { l1: "A", l2: "X", r1: "C" }; // l1 对, l2 错, r1 对
    const ls = scoreSection(items, answers, "listening");
    expect(ls).toEqual({ sectionCode: "listening", correct: 1, total: 2 });
    const rs = scoreSection(items, answers, "reading");
    expect(rs).toEqual({ sectionCode: "reading", correct: 1, total: 1 });
  });

  it("section 内含不可判分主观题:计入分母时被排除", () => {
    const items: ContentItem[] = [
      makeItem({ id: "a", questionTypeCode: "L_QA_MC4", sectionCode: "listening", correctOptionId: "A" }),
      // 一道无 answerText 的 write_char 归 listening(人为构造)→ 不可自动判分,不计入 total。
      makeItem({ id: "b", questionTypeCode: "W_PINYIN_CHAR", sectionCode: "listening", answerText: null }),
    ];
    const result = scoreSection(items, { a: "A" }, "listening");
    expect(result).toEqual({ sectionCode: "listening", correct: 1, total: 1 });
  });

  it("空 items → 0/0", () => {
    expect(scoreSection([], {}, "reading")).toEqual({ sectionCode: "reading", correct: 0, total: 0 });
  });
});

describe("computeReportDimensions — 多维报告聚合", () => {
  it("按 section / questionType / tag 三维聚合,主观题不计入任何桶", () => {
    const items: ContentItem[] = [
      makeItem({
        id: "i1",
        questionTypeCode: "single_choice",
        sectionCode: "reading",
        correctOptionId: "A",
        tags: ["grammar", "hsk1"],
      }),
      makeItem({
        id: "i2",
        questionTypeCode: "single_choice",
        sectionCode: "reading",
        correctOptionId: "B",
        tags: ["grammar"],
      }),
      makeItem({
        id: "i3",
        questionTypeCode: "L_QA_MC4",
        sectionCode: "listening",
        correctOptionId: "C",
        tags: ["vocab"],
      }),
      // 主观题:无法判分 → ungraded → 不进任何维度桶。
      makeItem({ id: "i4", questionTypeCode: "S_HSKK_QA", sectionCode: "speaking", tags: ["speaking-tag"] }),
    ];
    const answers = { i1: "A", i2: "Z", i3: "C", i4: "blob" }; // i1对 i2错 i3对

    const dims = computeReportDimensions(items, answers);

    // bySection:reading 2 题(1 对),listening 1 题(1 对);speaking 不计入。
    expect(dims.bySection).toEqual([
      { key: "listening", correct: 1, total: 1 },
      { key: "reading", correct: 1, total: 2 },
    ]);

    // byQuestionType:升序(L_QA_MC4 在 single_choice 前)。
    expect(dims.byQuestionType).toEqual([
      { key: "L_QA_MC4", correct: 1, total: 1 },
      { key: "single_choice", correct: 1, total: 2 },
    ]);

    // byTag:一题多 tag 计入每桶;speaking-tag 因主观题被跳过,不出现。升序 key。
    expect(dims.byTag).toEqual([
      { key: "grammar", correct: 1, total: 2 },
      { key: "hsk1", correct: 1, total: 1 },
      { key: "vocab", correct: 1, total: 1 },
    ]);
    expect(dims.byTag?.find((b) => b.key === "speaking-tag")).toBeUndefined();
  });

  it("无 tag 的题不进 byTag", () => {
    const items: ContentItem[] = [
      makeItem({ id: "x", questionTypeCode: "single_choice", correctOptionId: "A", tags: [] }),
    ];
    const dims = computeReportDimensions(items, { x: "A" });
    expect(dims.byTag).toEqual([]);
    expect(dims.bySection).toEqual([{ key: "reading", correct: 1, total: 1 }]);
  });

  it("空 items → 全空桶", () => {
    const dims = computeReportDimensions([], {});
    expect(dims).toEqual({ bySection: [], byQuestionType: [], byTag: [] });
  });
});
