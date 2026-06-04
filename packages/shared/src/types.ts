export type UserRole = "anonymous" | "learner" | "reviewer" | "admin";
export type PlanCode = "free" | "pro" | "institution";
export type ReviewStatus = "pending" | "approved" | "rejected" | "needs_fix";
export type PublishStatus = "draft" | "ready" | "published" | "unpublished";
export type SourceType = "reference_only" | "re_authored" | "original";
export type LevelCode =
  | "hsk-1"
  | "hsk-2"
  | "hsk-3"
  | "hsk-4"
  | "hsk-5"
  | "hsk-6"
  | "hsk-7"
  | "hsk-8"
  | "hsk-9";
// HSK 3.0 全科技能。listening/reading 为现有成员(保留),writing/speaking/translation 为追加。
export type SectionCode =
  | "listening"
  | "reading"
  | "writing"
  | "speaking"
  | "translation";

// 作答形式枚举(spec 第六节作答形式代码归一化)。
export type AnswerFormat =
  | "judge" // TF 判断对错(✓/✗)
  | "mc3" // MC-A/B/C 单选三选一
  | "mc4" // MC-A/B/C/D 单选四选一
  | "mc_image" // MC-选图 听/读后从若干图中选对应图
  | "match" // MATCH 配对/连线
  | "order" // ORDER 排序
  | "fill" // FILL 选词填空 / 听写填空
  | "write_char" // WRITE-CHAR 书写汉字
  | "write_sentence" // WRITE-SENT 书写句子(含词语排序造句)
  | "write_essay" // WRITE-PARA / WRITE-LONG 书写短文/长文/缩写/笔译
  | "speak"; // REC-* 录音口述(复述/回答/朗读/口译)

// 评分策略(用于阅卷分流:客观题自动判分,书写/口语需人工或自动文本评分)。
export type GradingStrategy =
  | "single_choice"
  | "judge"
  | "match"
  | "order"
  | "manual"
  | "auto_text";

// HSK 3.0 全部题型代码。
// 现有 5 个旧值(image_true_false/image_choice/single_choice/matching/fill_blank)保留为兼容别名;
// 其余为 spec 第六节 36 个权威题型代码(听力/阅读/书写/翻译/口语)。
export type QuestionTypeCode =
  // ---- 兼容旧值(现有 sample-data / mock-repository 仍在用,勿删)----
  // image_true_false ↔ L_WORD_IMG_TF / R_IMG_WORD_TF
  | "image_true_false"
  // image_choice ↔ L_SENT_IMG_MC / L_DIALOG_IMG_MC / R_SENT_IMG_MC
  | "image_choice"
  // single_choice ↔ L_QA_MC3 / L_QA_MC4 / R_TEXT_MC3 / R_TEXT_MC4 等单选
  | "single_choice"
  // matching ↔ R_QA_MATCH / R_PARA_MATCH
  | "matching"
  // fill_blank ↔ R_SENT_FILL_MC / R_TEXT_FILL_MC
  | "fill_blank"
  // ---- 听力 listening (spec 第六节)----
  | "L_WORD_IMG_TF" // 听词判断图文
  | "L_SENT_IMG_MC" // 听句选图
  | "L_DIALOG_IMG_MC" // 听对话选图
  | "L_SENT_TF" // 听句判断
  | "L_QA_MC3" // 听问答选择(三选一)
  | "L_QA_MC4" // 听问答选择(四选一)
  | "L_LONG_MC4" // 听长材料选择
  | "L_CONSIST_MC4" // 听内容一致选择
  | "L_NEWS_TF" // 听新闻判断
  | "L_LONG_FILL" // 听长对话填空
  // ---- 阅读 reading (spec 第六节)----
  | "R_IMG_WORD_TF" // 看图判断词语
  | "R_SENT_IMG_MC" // 读句选图
  | "R_QA_MATCH" // 问答配对
  | "R_SENT_FILL_MC" // 句子选词填空
  | "R_PARA_MATCH" // 句子配对/连线
  | "R_TEXT_FILL_MC" // 短文选词填空
  | "R_SENT_ORDER" // 句子排序
  | "R_TEXT_MC3" // 短文阅读三选一
  | "R_TEXT_MC4" // 短文阅读四选一
  | "R_ERROR_MC" // 选病句
  | "R_SENT_FILL_CONTEXT" // 上下文句子填空
  // ---- 书写 writing (spec 第六节)----
  | "W_PINYIN_CHAR" // 看拼音写汉字
  | "W_WORD_ORDER_SENT" // 词语排序造句
  | "W_WORD_SENT" // 用词语造句
  | "W_IMG_WORD_SENT" // 看图用词造句
  | "W_IMG_WORD_PARA" // 看图用词写短文
  | "W_SUMMARIZE" // 缩写长文
  // ---- 翻译 translation (spec 第六节)----
  | "T_L2C_WRITTEN" // 外译中笔译
  | "T_L2C_INTERPRET" // 外译中口译
  // ---- 口语 speaking (spec 第六节,含 HSKK)----
  | "S_HSKK_REPEAT" // HSKK 听后重复
  | "S_HSKK_RETELL" // HSKK 听后复述
  | "S_HSKK_QA" // HSKK 听后回答
  | "S_HSKK_READ" // HSKK 朗读
  | "S_HSKK_FREE_QA" // HSKK 自由作答
  | "S_OPINION"; // 观点阐述

// 题型元数据表。键为完整 QuestionTypeCode union;skill 用 SectionCode。
// needsImage/needsAudio 依据 spec 第六、第七节。
export type QuestionTypeMeta = {
  labelZh: string;
  skill: SectionCode;
  needsImage: boolean;
  needsAudio: boolean;
  answerFormat: AnswerFormat;
};

export const QUESTION_TYPE_META: Record<QuestionTypeCode, QuestionTypeMeta> = {
  // ---- 兼容旧值(沿用 spec 中最贴近的语义)----
  image_true_false: {
    labelZh: "图文判断(兼容旧值)",
    skill: "listening",
    needsImage: true,
    needsAudio: true,
    answerFormat: "judge",
  },
  image_choice: {
    labelZh: "选图(兼容旧值)",
    skill: "listening",
    needsImage: true,
    needsAudio: true,
    answerFormat: "mc_image",
  },
  single_choice: {
    labelZh: "单选(兼容旧值)",
    skill: "reading",
    needsImage: false,
    needsAudio: false,
    answerFormat: "mc3",
  },
  matching: {
    labelZh: "配对(兼容旧值)",
    skill: "reading",
    needsImage: false,
    needsAudio: false,
    answerFormat: "match",
  },
  fill_blank: {
    labelZh: "选词填空(兼容旧值)",
    skill: "reading",
    needsImage: false,
    needsAudio: false,
    answerFormat: "fill",
  },
  // ---- 听力 listening ----
  L_WORD_IMG_TF: {
    labelZh: "听词判断图文",
    skill: "listening",
    needsImage: true,
    needsAudio: true,
    answerFormat: "judge",
  },
  L_SENT_IMG_MC: {
    labelZh: "听句选图",
    skill: "listening",
    needsImage: true,
    needsAudio: true,
    answerFormat: "mc_image",
  },
  L_DIALOG_IMG_MC: {
    labelZh: "听对话选图",
    skill: "listening",
    needsImage: true,
    needsAudio: true,
    answerFormat: "mc_image",
  },
  L_SENT_TF: {
    labelZh: "听句判断",
    skill: "listening",
    needsImage: false,
    needsAudio: true,
    answerFormat: "judge",
  },
  L_QA_MC3: {
    labelZh: "听问答选择(三选一)",
    skill: "listening",
    needsImage: false,
    needsAudio: true,
    answerFormat: "mc3",
  },
  L_QA_MC4: {
    labelZh: "听问答选择(四选一)",
    skill: "listening",
    needsImage: false,
    needsAudio: true,
    answerFormat: "mc4",
  },
  L_LONG_MC4: {
    labelZh: "听长材料选择",
    skill: "listening",
    needsImage: false,
    needsAudio: true,
    answerFormat: "mc4",
  },
  L_CONSIST_MC4: {
    labelZh: "听内容一致选择",
    skill: "listening",
    needsImage: false,
    needsAudio: true,
    answerFormat: "mc4",
  },
  L_NEWS_TF: {
    labelZh: "听新闻判断",
    skill: "listening",
    needsImage: false,
    needsAudio: true,
    answerFormat: "judge",
  },
  L_LONG_FILL: {
    labelZh: "听长对话填空",
    skill: "listening",
    needsImage: false,
    needsAudio: true,
    answerFormat: "fill",
  },
  // ---- 阅读 reading ----
  R_IMG_WORD_TF: {
    labelZh: "看图判断词语",
    skill: "reading",
    needsImage: true,
    needsAudio: false,
    answerFormat: "judge",
  },
  R_SENT_IMG_MC: {
    labelZh: "读句选图",
    skill: "reading",
    needsImage: true,
    needsAudio: false,
    answerFormat: "mc_image",
  },
  R_QA_MATCH: {
    labelZh: "问答配对",
    skill: "reading",
    needsImage: false,
    needsAudio: false,
    answerFormat: "match",
  },
  R_SENT_FILL_MC: {
    labelZh: "句子选词填空",
    skill: "reading",
    needsImage: false,
    needsAudio: false,
    answerFormat: "fill",
  },
  R_PARA_MATCH: {
    labelZh: "句子配对/连线",
    skill: "reading",
    needsImage: false,
    needsAudio: false,
    answerFormat: "match",
  },
  R_TEXT_FILL_MC: {
    labelZh: "短文选词填空",
    skill: "reading",
    needsImage: false,
    needsAudio: false,
    answerFormat: "fill",
  },
  R_SENT_ORDER: {
    labelZh: "句子排序",
    skill: "reading",
    needsImage: false,
    needsAudio: false,
    answerFormat: "order",
  },
  R_TEXT_MC3: {
    labelZh: "短文阅读三选一",
    skill: "reading",
    needsImage: false,
    needsAudio: false,
    answerFormat: "mc3",
  },
  R_TEXT_MC4: {
    labelZh: "短文阅读四选一",
    skill: "reading",
    needsImage: false,
    needsAudio: false,
    answerFormat: "mc4",
  },
  R_ERROR_MC: {
    labelZh: "选病句",
    skill: "reading",
    needsImage: false,
    needsAudio: false,
    answerFormat: "mc4",
  },
  R_SENT_FILL_CONTEXT: {
    labelZh: "上下文句子填空",
    skill: "reading",
    needsImage: false,
    needsAudio: false,
    answerFormat: "fill",
  },
  // ---- 书写 writing ----
  W_PINYIN_CHAR: {
    labelZh: "看拼音写汉字",
    skill: "writing",
    needsImage: false,
    needsAudio: false,
    answerFormat: "write_char",
  },
  W_WORD_ORDER_SENT: {
    labelZh: "词语排序造句",
    skill: "writing",
    needsImage: false,
    needsAudio: false,
    answerFormat: "write_sentence",
  },
  W_WORD_SENT: {
    labelZh: "用词语造句",
    skill: "writing",
    needsImage: false,
    needsAudio: false,
    answerFormat: "write_sentence",
  },
  W_IMG_WORD_SENT: {
    labelZh: "看图用词造句",
    skill: "writing",
    needsImage: true,
    needsAudio: false,
    answerFormat: "write_sentence",
  },
  W_IMG_WORD_PARA: {
    labelZh: "看图用词写短文",
    skill: "writing",
    needsImage: true,
    needsAudio: false,
    answerFormat: "write_essay",
  },
  W_SUMMARIZE: {
    labelZh: "缩写长文",
    skill: "writing",
    needsImage: false,
    needsAudio: false,
    answerFormat: "write_essay",
  },
  // ---- 翻译 translation ----
  T_L2C_WRITTEN: {
    labelZh: "外译中笔译",
    skill: "translation",
    needsImage: false,
    needsAudio: false,
    answerFormat: "write_essay",
  },
  T_L2C_INTERPRET: {
    labelZh: "外译中口译",
    skill: "translation",
    needsImage: false,
    needsAudio: true, // 外语音频
    answerFormat: "speak",
  },
  // ---- 口语 speaking ----
  S_HSKK_REPEAT: {
    labelZh: "HSKK 听后重复",
    skill: "speaking",
    needsImage: false,
    needsAudio: true,
    answerFormat: "speak",
  },
  S_HSKK_RETELL: {
    labelZh: "HSKK 听后复述",
    skill: "speaking",
    needsImage: false,
    needsAudio: true,
    answerFormat: "speak",
  },
  S_HSKK_QA: {
    labelZh: "HSKK 听后回答",
    skill: "speaking",
    needsImage: false,
    needsAudio: true,
    answerFormat: "speak",
  },
  S_HSKK_READ: {
    labelZh: "HSKK 朗读",
    skill: "speaking",
    needsImage: false,
    needsAudio: false,
    answerFormat: "speak",
  },
  S_HSKK_FREE_QA: {
    labelZh: "HSKK 自由作答",
    skill: "speaking",
    needsImage: false,
    needsAudio: false,
    answerFormat: "speak",
  },
  S_OPINION: {
    labelZh: "观点阐述",
    skill: "speaking",
    needsImage: false,
    needsAudio: true,
    answerFormat: "speak",
  },
};

export type AppUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  plan: PlanCode;
};

export type SubscriptionStatus = "active" | "inactive" | "past_due" | "canceled";

export type Subscription = {
  userId: string;
  plan: PlanCode;
  status: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEndsAt?: string | null;
  updatedAt: string;
};

// 付费门槛单一判定来源:订阅 active 且套餐为 pro / institution。
export function hasPaidAccess(subscription: Subscription | null | undefined): boolean {
  if (!subscription) {
    return false;
  }
  return subscription.status === "active" && subscription.plan !== "free";
}

// 给定套卷所需访问级别,判断当前用户(结合订阅)是否可进入。
export function canAccessSet(
  requiredAccess: PlanCode,
  subscription: Subscription | null | undefined,
): boolean {
  if (requiredAccess === "free") {
    return true;
  }
  return hasPaidAccess(subscription);
}

export type LevelSummary = {
  id: string;
  code: LevelCode;
  name: string;
  title: string;
  status: "live" | "coming_soon";
  description: string;
};

export type SectionSummary = {
  id: string;
  code: SectionCode;
  name: string;
  levelCode: LevelCode;
  sortOrder: number;
};

export type QuestionOption = {
  id: string;
  label: string;
  text: string;
  // 选图题(mc_image)的选项图 URL;无则为空(选项退化为纯文本)。
  imageUrl?: string | null;
};

// ─── 共享选项池(A-F 六选共享)─────────────────────────────────────────────
// 真实 HSK 阅读"句子配对"(R_PARA_MATCH / R_QA_MATCH)是一组题干共用一个
// A-F 选项池:每个选项在组内只能被选一次,选过的不能再选。
// 现有实现是每题独立 3 选 1(每题 options 各不相同)。本字段是**纯增量、可选**:
//   - 题没有 sharedOptionPool → 前端走原渲染、评分走原 answer===correctOptionId,完全不变。
//   - 题带 sharedOptionPool → 该题的 options 即为完整共享池;前端按 groupId 聚合同组题,
//     渲染公共选项区、禁用已被同组其他题选走的选项、强制组内唯一。
// 评分**不变**:每题仍各自持有 correctOptionId(指向池内某个字母),
// 用户提交的仍是池选项 id,沿用现有 match/选项键相等判分,无需新分支逻辑改动。
export type SharedOptionPool = {
  // 同一池组的稳定标识:同 groupId 的题共用一个 A-F 选项池(组内互斥唯一)。
  groupId: string;
  // 本池组的选项 id 全集(如 ["A","B","C","D","E","F"])。与每题 options 的 id 对齐。
  // 显式列出便于前端校验"组内唯一"与渲染顺序,不依赖 options 数组顺序。
  poolOptionIds: string[];
};

export type ContentItem = {
  id: string;
  levelCode: LevelCode;
  sectionCode: SectionCode;
  questionTypeCode: QuestionTypeCode;
  title: string;
  stem: string;
  prompt: string;
  explanation: string;
  reviewStatus: ReviewStatus;
  publishStatus: PublishStatus;
  sourceType: SourceType;
  copyrightCleared: boolean;
  options: QuestionOption[];
  correctOptionId: string;
  tags: string[];
  // ---- HSK 3.0 全科扩展(全部 optional,旧数据/旧构造仍合法)----
  audioAssetId?: string | null; // 音频资产 ID(指向资产库)
  imageAssetId?: string | null; // 图片资产 ID
  audioUrl?: string; // 音频直链(已渲染可播放)
  imageUrl?: string; // 图片直链
  context?: string; // 听力对话/短文原文,或阅读篇章原文
  part?: number; // 该题在所属 section 中的分部序号(spec 各级"第N部分")
  estimatedSeconds?: number; // 预估作答/播放时长(秒)
  vocabFocus?: string[]; // 该题重点考查词汇
  answerText?: string | null; // 主观题/书写/口语的参考答案文本
  gradingStrategy?: GradingStrategy; // 阅卷分流策略
  sharedOptionPool?: SharedOptionPool; // 共享选项池(A-F 六选共享);无则走原独立选项逻辑
};

export type PracticeSet = {
  id: string;
  slug: string;
  title: string;
  description: string;
  levelCode: LevelCode;
  mode: "mock_exam" | "practice_set";
  sectionCode?: SectionCode;
  access: PlanCode;
  minutes: number;
  itemIds: string[];
};

export type SessionQuestion = Omit<ContentItem, "correctOptionId">;

export type ExamSession = {
  id: string;
  userId: string;
  setId: string;
  setSlug: string;
  mode: "mock_exam" | "practice_set";
  status: "active" | "submitted";
  startedAt: string;
  submittedAt?: string;
  answers: Record<string, string>;
};

// 多维聚合的单个分桶(按某维度的 key 聚合 correct/total)。
export type ReportDimensionBucket = {
  key: string; // 维度取值(sectionCode / questionTypeCode / tag 字面值)
  correct: number;
  total: number;
};

// 多维报告:在 sectionBreakdown 之上扩展,可按技能/题型/标签聚合。
// 全部 optional,旧报告(无该字段)仍合法。
export type ReportDimensions = {
  bySection?: ReportDimensionBucket[]; // 按 sectionCode 聚合
  byQuestionType?: ReportDimensionBucket[]; // 按 questionTypeCode 聚合
  byTag?: ReportDimensionBucket[]; // 按 tag 聚合(一题多 tag 时计入每个 tag)
};

export type ExamReport = {
  id: string;
  sessionId: string;
  userId: string;
  setSlug: string;
  score: number;
  total: number;
  accuracy: number;
  durationSeconds: number;
  mistakes: Array<{
    itemId: string;
    yourAnswer: string | null;
    correctAnswer: string;
  }>;
  sectionBreakdown: Array<{
    sectionCode: SectionCode;
    correct: number;
    total: number;
  }>;
  // 多维报告聚合(optional,不破坏现有 report 构造与读回)。
  dimensions?: ReportDimensions;
  createdAt: string;
};

// 错题复习评分(SM-2 四档)。
export type ReviewGrade = "again" | "hard" | "good" | "easy";

export type MistakeEntry = {
  id: string;
  userId: string;
  itemId: string;
  setSlug: string;
  levelCode: LevelCode;
  sectionCode: SectionCode;
  mastered: boolean;
  createdAt: string;
  // ---- SRS(SM-2 间隔重复)字段,全部 optional,不破坏现有构造 ----
  easeFactor?: number; // 难度系数(默认 2.5,下限 1.3)
  intervalDays?: number; // 当前复习间隔(天)
  repetitions?: number; // 连续答对次数(answered correctly streak)
  dueAt?: string; // 下次到期时间(ISO);首次入库 = 今日
  lastReviewedAt?: string; // 最近一次复习时间(ISO)
};

export type AdminListItem = Pick<
  ContentItem,
  | "id"
  | "title"
  | "levelCode"
  | "sectionCode"
  | "questionTypeCode"
  | "reviewStatus"
  | "publishStatus"
  | "sourceType"
  | "copyrightCleared"
>;

export type ImportPayload = {
  items: Array<{
    id: string;
    title: string;
    stem: string;
    prompt: string;
    levelCode: LevelCode;
    sectionCode: SectionCode;
    questionTypeCode: QuestionTypeCode;
    explanation: string;
    reviewStatus: ReviewStatus;
    publishStatus: PublishStatus;
    sourceType: SourceType;
    copyrightCleared: boolean;
    options: QuestionOption[];
    correctOptionId: string;
    tags?: string[];
  }>;
  sets?: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    levelCode: LevelCode;
    mode: "mock_exam" | "practice_set";
    sectionCode?: SectionCode;
    access: PlanCode;
    minutes: number;
    itemIds: string[];
  }>;
};
