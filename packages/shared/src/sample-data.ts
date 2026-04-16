import type {
  ContentItem,
  LevelSummary,
  PracticeSet,
  QuestionTypeCode,
  SectionSummary,
} from "./types";

export const nonOfficialStatement =
  "本平台为独立开发的中文学习与备考服务，相关练习依据公开考试标准和教学目标设计，并非官方出题或报名系统。";

export const levels: LevelSummary[] = [
  {
    id: "level_hsk1",
    code: "hsk-1",
    name: "HSK1",
    title: "HSK1 Starter",
    status: "live",
    description: "已开放 HSK1 模考、专项练习、报告和错题复习。",
  },
  {
    id: "level_hsk2",
    code: "hsk-2",
    name: "HSK2",
    title: "HSK2 Basic",
    status: "coming_soon",
    description: "架构已预留，内容正在整理。",
  },
  {
    id: "level_hsk3",
    code: "hsk-3",
    name: "HSK3",
    title: "HSK3 Bridge",
    status: "coming_soon",
    description: "后续按同一发布流扩展。",
  },
];

export const sections: SectionSummary[] = [
  { id: "section_l1", code: "listening", name: "听力", levelCode: "hsk-1", sortOrder: 1 },
  { id: "section_r1", code: "reading", name: "阅读", levelCode: "hsk-1", sortOrder: 2 },
];

type RawQuestion = {
  id: string;
  title: string;
  sectionCode: "listening" | "reading";
  questionTypeCode: QuestionTypeCode;
  prompt: string;
  stem: string;
  explanation: string;
  options: string[];
  answer: string;
  tags: string[];
};

const rawQuestions: RawQuestion[] = [
  {
    id: "item_hsk1_001",
    title: "听力图片判断 1",
    sectionCode: "listening",
    questionTypeCode: "image_true_false",
    stem: "看图判断",
    prompt: "你听到：他在喝茶。",
    explanation: "图片和句子都在描述男生喝茶。",
    options: ["一致", "不一致"],
    answer: "A",
    tags: ["饮品", "动作"],
  },
  {
    id: "item_hsk1_002",
    title: "听力图片判断 2",
    sectionCode: "listening",
    questionTypeCode: "image_true_false",
    stem: "看图判断",
    prompt: "你听到：她在医院上班。",
    explanation: "图中是护士站场景，和句子一致。",
    options: ["一致", "不一致"],
    answer: "A",
    tags: ["医院", "工作"],
  },
  {
    id: "item_hsk1_003",
    title: "听力选图 1",
    sectionCode: "listening",
    questionTypeCode: "image_choice",
    stem: "听句子选图",
    prompt: "你听到：我去超市买苹果。",
    explanation: "只有 A 同时对应超市和苹果。",
    options: ["女生在超市挑苹果", "男生在教室上课", "两个人在公园散步"],
    answer: "A",
    tags: ["超市", "苹果"],
  },
  {
    id: "item_hsk1_004",
    title: "听力单选 1",
    sectionCode: "listening",
    questionTypeCode: "single_choice",
    stem: "听对话回答",
    prompt: "女：你去哪儿？ 男：我去学校上课。 问：男的去哪儿？",
    explanation: "对话中直接说去学校上课。",
    options: ["学校", "饭店", "医院"],
    answer: "A",
    tags: ["学校", "地点"],
  },
  {
    id: "item_hsk1_005",
    title: "听力单选 2",
    sectionCode: "listening",
    questionTypeCode: "single_choice",
    stem: "听短文回答",
    prompt: "短文：今天下雨了，我们没有去公园。 问：为什么没去公园？",
    explanation: "原因是下雨。",
    options: ["太忙了", "下雨了", "公园关门了"],
    answer: "B",
    tags: ["天气", "原因"],
  },
  {
    id: "item_hsk1_006",
    title: "阅读选词 1",
    sectionCode: "reading",
    questionTypeCode: "fill_blank",
    stem: "选词填空",
    prompt: "我今天很____，想早点回家休息。",
    explanation: "表示身体不舒服，用“病”。",
    options: ["忙", "病", "贵"],
    answer: "B",
    tags: ["健康"],
  },
  {
    id: "item_hsk1_007",
    title: "阅读匹配 1",
    sectionCode: "reading",
    questionTypeCode: "matching",
    stem: "匹配对话",
    prompt: "你好吗？",
    explanation: "常见问候的自然回答是“我很好，谢谢”。",
    options: ["我很好，谢谢。", "在图书馆。", "星期三。"],
    answer: "A",
    tags: ["问候"],
  },
  {
    id: "item_hsk1_008",
    title: "阅读单选 1",
    sectionCode: "reading",
    questionTypeCode: "single_choice",
    stem: "选词填空",
    prompt: "今天很热，我们去喝____吧。",
    explanation: "语义上应是可喝的饮品。",
    options: ["牛奶", "雨", "桌子"],
    answer: "A",
    tags: ["饮品"],
  },
  {
    id: "item_hsk1_009",
    title: "阅读图片词义 1",
    sectionCode: "reading",
    questionTypeCode: "image_choice",
    stem: "看图选词",
    prompt: "句子：老师在黑板上写汉字。",
    explanation: "黑板最符合句子的场景。",
    options: ["黑板", "汽车", "饭桌"],
    answer: "A",
    tags: ["教室", "汉字"],
  },
  {
    id: "item_hsk1_010",
    title: "阅读单选 2",
    sectionCode: "reading",
    questionTypeCode: "single_choice",
    stem: "阅读短句回答",
    prompt: "玛丽是学生。她每天七点起床，八点上课。 问：玛丽几点上课？",
    explanation: "短句中明确写了八点上课。",
    options: ["七点", "八点", "九点"],
    answer: "B",
    tags: ["时间", "上课"],
  },
];

export const sampleItems: ContentItem[] = rawQuestions.map((item) => ({
  id: item.id,
  levelCode: "hsk-1",
  sectionCode: item.sectionCode,
  questionTypeCode: item.questionTypeCode,
  title: item.title,
  stem: item.stem,
  prompt: item.prompt,
  explanation: item.explanation,
  reviewStatus: "approved",
  publishStatus: "published",
  sourceType: "original",
  copyrightCleared: true,
  options: item.options.map((text, index) => ({
    id: ["A", "B", "C", "D"][index] ?? `O${index + 1}`,
    label: ["A", "B", "C", "D"][index] ?? `O${index + 1}`,
    text,
  })),
  correctOptionId: item.answer,
  tags: item.tags,
}));

export const sampleSets: PracticeSet[] = [
  {
    id: "set_hsk1_mock_01",
    slug: "hsk1-mock-01",
    title: "HSK1 Mock Exam 01",
    description: "HSK1 模拟整卷，覆盖听力与阅读。",
    levelCode: "hsk-1",
    mode: "mock_exam",
    access: "free",
    minutes: 40,
    itemIds: sampleItems.map((item) => item.id),
  },
  {
    id: "set_hsk1_listening_core",
    slug: "hsk1-listening-core",
    title: "HSK1 听力专项",
    description: "聚焦听力图片判断、听句选图和短对话。",
    levelCode: "hsk-1",
    mode: "practice_set",
    sectionCode: "listening",
    access: "pro",
    minutes: 15,
    itemIds: sampleItems.filter((item) => item.sectionCode === "listening").map((item) => item.id),
  },
  {
    id: "set_hsk1_reading_core",
    slug: "hsk1-reading-core",
    title: "HSK1 阅读专项",
    description: "聚焦选词、匹配和短句理解。",
    levelCode: "hsk-1",
    mode: "practice_set",
    sectionCode: "reading",
    access: "pro",
    minutes: 15,
    itemIds: sampleItems.filter((item) => item.sectionCode === "reading").map((item) => item.id),
  },
];
