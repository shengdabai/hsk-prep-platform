import type { LevelCode, QuestionTypeCode, SectionCode } from "./types";

// 一个 section 内的有序题型块(spec 各级"第N部分")。
export type ExamSectionBlock = {
  part: number; // 分部序号(对应 spec 第N部分)
  questionTypeCode: QuestionTypeCode;
  count: number; // 该块题量
  note: string; // 块说明(题型描述/作答形式)
};

// 一个考试科目(技能 section)的有序题型块集合。
export type ExamSectionBlueprint = {
  sectionCode: SectionCode;
  blocks: ExamSectionBlock[];
};

// 单级考试蓝图。
// 1-6 级数字以官方样题 PDF 校准为准(docs/_research/pdf-structure.md),
// 词汇量以官方大纲 PDF 为准(docs/_research/pdf-syllabus-overview.md)。
export type ExamBlueprint = {
  levelCode: LevelCode;
  totalQuestions: number;
  durationMinutes: number; // 含填写个人信息时间(官方PDF原文)
  totalScore: number;
  passScore: number | null; // 7-9 级不设单一及格线,按能力值划档
  vocabTarget: number; // HSK 3.0 累计词汇量目标(官方大纲PDF数字)
  sections: ExamSectionBlueprint[];
};

// HSK 各级考试蓝图。
// 1-6 级题量/题型/顺序/时长/分值已按新版 HSK 3.0 官方样题 PDF 校准(官方PDF, 2025-12 发布, 2026-07 实施),
//   见 docs/_research/pdf-structure.md(笔试)与 docs/_research/pdf-oral.md(口语)。
// 词汇量(vocabTarget)采用官方大纲 PDF 累计词汇量(官方PDF),见 docs/_research/pdf-syllabus-overview.md。
// 新版每题 1 分,满分 = 题数(官方PDF:结构表"题数"列与"分值"列相同)。
// HSK 3-6 级新增 speaking 科目(新版绑定口语,官方PDF口语样卷)。
// 7-9 级为"一卷三级"(IRT 划档),三级共用同一份试卷蓝图,部分分部题数仍 TBD,见 spec 第九节。
export const HSK_BLUEPRINTS: Record<LevelCode, ExamBlueprint> = {
  // ===== HSK 一级 (官方PDF: 40 题, 40 分, 约 40 分钟, 听力+阅读) =====
  "hsk-1": {
    levelCode: "hsk-1",
    totalQuestions: 40,
    durationMinutes: 40, // 官方PDF:约 40 分钟
    totalScore: 40, // 官方PDF:每题 1 分,满分 = 题数(旧版 200)
    passScore: null, // 官方PDF未列合格线(旧版 120),新版待官方通知确认
    vocabTarget: 300, // 官方大纲PDF累计 300(旧 blueprint 误写 500)
    sections: [
      {
        sectionCode: "listening",
        blocks: [
          // 官方PDF:第一部分听词/短语,从 3 图中选 1(选图单选),非 TF 判断。
          { part: 1, questionTypeCode: "L_SENT_IMG_MC", count: 5, note: "听短语/词,从3张图中选对应图(官方PDF:选图单选,非判断题)" },
          { part: 2, questionTypeCode: "L_QA_MC3", count: 5, note: "听问句,从3个文字选项(含拼音)中选答案" },
          { part: 3, questionTypeCode: "L_DIALOG_IMG_MC", count: 5, note: "听简短对话,从6张图(A-F)中配对选图" },
          { part: 4, questionTypeCode: "L_QA_MC3", count: 5, note: "听短段话+问句,从3个文字选项(含拼音)中选答案" },
        ],
      },
      {
        sectionCode: "reading",
        blocks: [
          { part: 1, questionTypeCode: "R_SENT_IMG_MC", count: 5, note: "读句子(含拼音),从6张图(A-F)中选对应图" },
          { part: 2, questionTypeCode: "R_QA_MATCH", count: 5, note: "句子与回答配对(A-F,含1个干扰项)" },
          { part: 3, questionTypeCode: "R_SENT_FILL_MC", count: 5, note: "句子选词填空(A-F词语选1)" },
          { part: 4, questionTypeCode: "R_TEXT_MC3", count: 5, note: "一段话+问句,从3个文字选项(含拼音)中选答案" },
        ],
      },
    ],
  },

  // ===== HSK 二级 (官方PDF: 60 题, 60 分, 约 60 分钟, 听力+阅读+书写) =====
  "hsk-2": {
    levelCode: "hsk-2",
    totalQuestions: 60,
    durationMinutes: 60, // 官方PDF:约 60 分钟(旧 blueprint 误写 55)
    totalScore: 60, // 官方PDF:每题 1 分(旧版 200)
    passScore: null, // 官方PDF未列合格线(旧版 120)
    vocabTarget: 500, // 官方大纲PDF累计 500(旧 blueprint 误写 1000)
    sections: [
      {
        sectionCode: "listening",
        // 官方PDF:听力 3 部分 5+10+10=25(旧 blueprint 误为 4 部分 35 题)。
        blocks: [
          { part: 1, questionTypeCode: "L_SENT_IMG_MC", count: 5, note: "听短句,从3张图中选对应图(官方PDF)" },
          { part: 2, questionTypeCode: "L_DIALOG_IMG_MC", count: 10, note: "听短对话,从6张图(A-F)中选对应图(官方PDF)" },
          { part: 3, questionTypeCode: "L_QA_MC3", count: 10, note: "听对话+问句,从3个文字选项(含拼音)中选答案(官方PDF)" },
        ],
      },
      {
        sectionCode: "reading",
        // 官方PDF:阅读 4 部分 5+5+10+5=25(旧 blueprint 各分部题数误为 10+5+5+5)。
        blocks: [
          { part: 1, questionTypeCode: "R_SENT_IMG_MC", count: 5, note: "读句子(含拼音),从6张图(A-F)中选对应图(官方PDF)" },
          { part: 2, questionTypeCode: "R_SENT_FILL_MC", count: 5, note: "句子选词填空(A-F词语选1)(官方PDF)" },
          { part: 3, questionTypeCode: "R_PARA_MATCH", count: 10, note: "句子配对(A-F,含干扰项)(官方PDF)" },
          { part: 4, questionTypeCode: "R_TEXT_MC3", count: 5, note: "短段话+问句,3个文字选项(含拼音)选答案(官方PDF)" },
        ],
      },
      {
        sectionCode: "writing",
        // 官方PDF:新版二级新增书写科目 2 部分 5+5=10(旧 blueprint 完全缺失)。
        blocks: [
          { part: 1, questionTypeCode: "W_PINYIN_CHAR", count: 5, note: "汉字笔画拆分图+拼音提示,配对到A-F正确汉字(官方PDF:辨认笔画)" },
          { part: 2, questionTypeCode: "W_PINYIN_CHAR", count: 5, note: "含空白句子(含拼音),填写正确汉字(官方PDF:主观填空)" },
        ],
      },
    ],
  },

  // ===== HSK 三级 (官方PDF: 笔试 70 题, 70 分, 约 83 分钟, 听力+阅读+书写; 另含绑定口语) =====
  "hsk-3": {
    levelCode: "hsk-3",
    totalQuestions: 70, // 官方PDF:笔试 70 题(旧 blueprint 误写 80);口语为独立绑定科目,不计入笔试总数
    durationMinutes: 83, // 官方PDF:约 83 分钟(旧 blueprint 误写 90)
    totalScore: 70, // 官方PDF:每题 1 分(旧版 300)
    passScore: null, // 官方PDF未列合格线(旧版 180)
    vocabTarget: 1000, // 官方大纲PDF累计 1000(旧 blueprint 误写 2245)
    sections: [
      {
        sectionCode: "listening",
        // 官方PDF:听力 3 部分 10+10+10=30(旧 blueprint 误为 4 部分 40 题)。
        blocks: [
          { part: 1, questionTypeCode: "L_DIALOG_IMG_MC", count: 10, note: "听对话,从6张图(A-F)中选对应图(官方PDF)" },
          { part: 2, questionTypeCode: "L_QA_MC3", count: 10, note: "听较短/较长对话+问句,3个文字选项选答案(官方PDF)" },
          { part: 3, questionTypeCode: "L_QA_MC3", count: 10, note: "听短段话+问句,3个文字选项选答案(官方PDF)" },
        ],
      },
      {
        sectionCode: "reading",
        // 官方PDF:阅读 3 部分 10+10+10=30。
        blocks: [
          { part: 1, questionTypeCode: "R_PARA_MATCH", count: 10, note: "句子配对(A-F,含干扰项)(官方PDF)" },
          { part: 2, questionTypeCode: "R_SENT_FILL_MC", count: 10, note: "句子/对话选词填空(A-F选1)(官方PDF)" },
          { part: 3, questionTypeCode: "R_TEXT_MC3", count: 10, note: "段落+问句(★),3个文字选项选答案(官方PDF)" },
        ],
      },
      {
        sectionCode: "writing",
        // 官方PDF:书写 2 部分 5+5=10,时长 20 分钟;第二部分由"看拼音写汉字"改为"看图写句"。
        blocks: [
          { part: 1, questionTypeCode: "W_PINYIN_CHAR", count: 5, note: "句子空白处给拼音(无汉字),写出对应汉字(官方PDF:手写汉字)" },
          { part: 2, questionTypeCode: "W_IMG_WORD_SENT", count: 5, note: "看图+给定词语,写一句话(官方PDF:由旧版看拼音写汉字改为看图写句)" },
        ],
      },
      // 官方PDF口语样卷:HSK 三级口语 3 部分 8+5+2=15,约 15 分钟(含准备 6 分钟),绑定科目。
      {
        sectionCode: "speaking",
        blocks: [
          { part: 1, questionTypeCode: "S_HSKK_REPEAT", count: 8, note: "听后重复:听一句话,10秒内重复(官方PDF口语:音频,无文字提示)" },
          { part: 2, questionTypeCode: "S_HSKK_FREE_QA", count: 5, note: "看图说话:每题1张图,15秒内描述(官方PDF口语:无音频,无文字提示)" },
          { part: 3, questionTypeCode: "S_HSKK_FREE_QA", count: 2, note: "回答问题:试卷印文字问题,1.5分钟作答(官方PDF口语:无音频)" },
        ],
      },
    ],
  },

  // ===== HSK 四级 (官方PDF: 笔试 70 题, 70 分, 约 85 分钟, 听力+阅读+写作; 另含绑定口语) =====
  // 变化最大的一级:总题数 100→70,听力 45→32,写作 15→6,分部结构全改(官方PDF)。
  "hsk-4": {
    levelCode: "hsk-4",
    totalQuestions: 70, // 官方PDF:笔试 70 题(旧 blueprint 误写 100)
    durationMinutes: 85, // 官方PDF:约 85 分钟(旧 blueprint 误写 105)
    totalScore: 70, // 官方PDF:每题 1 分(旧版 300)
    passScore: null, // 官方PDF未列合格线(旧版 180)
    vocabTarget: 2000, // 官方大纲PDF累计 2000(旧 blueprint 误写 3245)
    sections: [
      {
        sectionCode: "listening",
        // 官方PDF:听力 2 部分 14+18=32(旧 blueprint 误为 3 部分 45 题)。
        blocks: [
          { part: 1, questionTypeCode: "L_QA_MC4", count: 14, note: "听两句/多轮对话+问句,4个文字选项选答案(官方PDF)" },
          { part: 2, questionTypeCode: "L_LONG_MC4", count: 18, note: "听较长段落+1至多个问句,4个文字选项选答案(官方PDF)" },
        ],
      },
      {
        sectionCode: "reading",
        // 官方PDF:阅读 3 部分 10+15+7=32(旧 blueprint 误为 10+10+20)。
        blocks: [
          { part: 1, questionTypeCode: "R_SENT_FILL_MC", count: 10, note: "句子/对话选词填空(A-E选1)(官方PDF)" },
          { part: 2, questionTypeCode: "R_TEXT_MC4", count: 15, note: "段落+问句(★)/长段每段2题,4个文字选项选答案(官方PDF)" },
          { part: 3, questionTypeCode: "R_SENT_FILL_CONTEXT", count: 7, note: "段落内3个编号空白,从3句选项(A/B/C)各选1句填入(官方PDF)" },
        ],
      },
      {
        sectionCode: "writing",
        // 官方PDF:写作 2 部分 5+1=6,时长 25 分钟(旧 blueprint 误为 10+5=15)。
        blocks: [
          { part: 1, questionTypeCode: "W_IMG_WORD_SENT", count: 5, note: "看图+给定词语写一句话(官方PDF:由旧版词语排序改为看图写句)" },
          { part: 2, questionTypeCode: "W_IMG_WORD_PARA", count: 1, note: "命题作文,写不少于80字短文(官方PDF:单一短文题)" },
        ],
      },
      // 官方PDF口语样卷:HSK 四级口语 3 部分 2+1+2=5,约 20 分钟(含准备 10 分钟),绑定科目。
      {
        sectionCode: "speaking",
        blocks: [
          { part: 1, questionTypeCode: "S_HSKK_RETELL", count: 2, note: "听后复述:听一段话,40秒内复述(官方PDF口语:音频,无文字提示)" },
          { part: 2, questionTypeCode: "S_HSKK_FREE_QA", count: 1, note: "看图说话:3张连续图,2分钟描述叙事(官方PDF口语:无音频)" },
          { part: 3, questionTypeCode: "S_HSKK_FREE_QA", count: 2, note: "回答问题:试卷印文字问题,2分钟作答(官方PDF口语:无音频)" },
        ],
      },
    ],
  },

  // ===== HSK 五级 (官方PDF: 笔试 72 题, 72 分, 约 110 分钟, 听力+阅读+写作; 另含绑定口语) =====
  "hsk-5": {
    levelCode: "hsk-5",
    totalQuestions: 72, // 官方PDF:笔试 72 题(旧 blueprint 误写 100)
    durationMinutes: 110, // 官方PDF:约 110 分钟(旧 blueprint 误写 125)
    totalScore: 72, // 官方PDF:每题 1 分(旧版 300)
    passScore: null, // 官方PDF未列合格线(旧版 180)
    vocabTarget: 3600, // 官方大纲PDF累计 3600(旧 blueprint 误写 4316)
    sections: [
      {
        sectionCode: "listening",
        // 官方PDF:听力 2 部分 19+16=35(旧 blueprint 误为 20+25=45)。
        blocks: [
          { part: 1, questionTypeCode: "L_QA_MC4", count: 19, note: "听多轮对话+问句,4个文字选项选答案(官方PDF)" },
          { part: 2, questionTypeCode: "L_LONG_MC4", count: 16, note: "听长篇叙述/故事,每段多题,4个文字选项(官方PDF)" },
        ],
      },
      {
        sectionCode: "reading",
        // 官方PDF:阅读 3 部分 10+10+15=35(旧 blueprint 误为 15+10+20)。
        blocks: [
          { part: 1, questionTypeCode: "R_TEXT_FILL_MC", count: 10, note: "段落内编号空白,4个词语选项(A/B/C/D)选填(官方PDF)" },
          { part: 2, questionTypeCode: "R_SENT_ORDER", count: 10, note: "5个标号段落(A-E)排成故事顺序(官方PDF:排序)" },
          { part: 3, questionTypeCode: "R_TEXT_MC4", count: 15, note: "较长文章(每篇4题),4个文字选项选答案(官方PDF)" },
        ],
      },
      {
        sectionCode: "writing",
        // 官方PDF:写作 2 部分 1+1=2,均为作文,时长 40 分钟(旧 blueprint 误为 8+2=10)。
        blocks: [
          { part: 1, questionTypeCode: "W_IMG_WORD_PARA", count: 1, note: "4张连环图,写不少于100字作文(官方PDF:由旧版造句改为连环图作文)" },
          { part: 2, questionTypeCode: "W_SUMMARIZE", count: 1, note: "话题作文,写不少于200字(官方PDF:议论/分享类命题作文)" },
        ],
      },
      // 官方PDF口语样卷:HSK 五级口语 3 部分 2+1+2=5,约 23 分钟(含准备 10 分钟),绑定科目。
      {
        sectionCode: "speaking",
        blocks: [
          { part: 1, questionTypeCode: "S_HSKK_RETELL", count: 2, note: "听后复述:听一段话,1.5分钟内复述(官方PDF口语:音频)" },
          { part: 2, questionTypeCode: "S_HSKK_FREE_QA", count: 1, note: "看图说话:3张连续图,2分钟描述叙事(官方PDF口语:无音频)" },
          { part: 3, questionTypeCode: "S_HSKK_FREE_QA", count: 2, note: "回答问题:试卷印文字问题,2.5分钟作答(官方PDF口语:无音频)" },
        ],
      },
    ],
  },

  // ===== HSK 六级 (官方PDF: 笔试 82 题, 82 分, 约 125 分钟, 听力+阅读+写作; 另含绑定口语) =====
  "hsk-6": {
    levelCode: "hsk-6",
    totalQuestions: 82, // 官方PDF:笔试 82 题(旧 blueprint 误写 101)
    durationMinutes: 125, // 官方PDF:约 125 分钟(旧 blueprint 误写 140)
    totalScore: 82, // 官方PDF:每题 1 分(旧版 300)
    passScore: null, // 官方PDF未列合格线(旧版 180)
    vocabTarget: 5400, // 官方大纲PDF累计 5400(旧 blueprint 误写 5456)
    sections: [
      {
        sectionCode: "listening",
        // 官方PDF:听力 3 部分 8+20+12=40(旧 blueprint 误为 15+15+20=50)。
        blocks: [
          { part: 1, questionTypeCode: "L_CONSIST_MC4", count: 8, note: "听新闻/报道,4个文字选项选与内容一致的一项(官方PDF)" },
          { part: 2, questionTypeCode: "L_LONG_MC4", count: 20, note: "听较长叙事/专题段落,每段多个问句,4个文字选项(官方PDF)" },
          { part: 3, questionTypeCode: "L_LONG_MC4", count: 12, note: "听长访谈/对话,每段多个问句,4个文字选项(官方PDF)" },
        ],
      },
      {
        sectionCode: "reading",
        // 官方PDF:阅读 3 部分 10+10+20=40(旧 blueprint 误为 4 部分 50 题)。
        blocks: [
          { part: 1, questionTypeCode: "R_TEXT_FILL_MC", count: 10, note: "段落内编号空白,4个词语选项(A/B/C/D)选填(官方PDF)" },
          { part: 2, questionTypeCode: "R_SENT_FILL_CONTEXT", count: 10, note: "文章内5个空白,从6个句子选项(A-F)选5(每篇5题,1个干扰项)(官方PDF)" },
          { part: 3, questionTypeCode: "R_TEXT_MC4", count: 20, note: "4-5篇较长文章,每篇多题,4个文字选项选答案(官方PDF)" },
        ],
      },
      {
        sectionCode: "writing",
        // 官方PDF:写作 2 部分 1+1=2(旧 blueprint 误为 1 题缩写)。取消缩写题,改为应用文+议论文。
        blocks: [
          { part: 1, questionTypeCode: "W_SUMMARIZE", count: 1, note: "应用文(招租启事/通知/建议信等),写不少于150字(官方PDF:取消旧版缩写题)" },
          { part: 2, questionTypeCode: "W_SUMMARIZE", count: 1, note: "议论文/感想类作文,写不少于300字(官方PDF)" },
        ],
      },
      // 官方PDF口语样卷:HSK 六级口语 3 部分 2+1+2=5,约 23 分钟(含准备 10 分钟),绑定科目。
      {
        sectionCode: "speaking",
        blocks: [
          { part: 1, questionTypeCode: "S_HSKK_RETELL", count: 2, note: "听后复述:听一段话,1.5分钟内复述(官方PDF口语:音频)" },
          { part: 2, questionTypeCode: "S_HSKK_FREE_QA", count: 1, note: "看图说话:4张连续图,2分钟描述叙事(官方PDF口语:无音频)" },
          { part: 3, questionTypeCode: "S_HSKK_FREE_QA", count: 2, note: "回答问题:试卷印文字问题,2.5分钟作答(官方PDF口语:无音频)" },
        ],
      },
    ],
  },

  // ===== HSK 七~九级 (spec 第三节) =====
  // "一卷三级":7/8/9 级共用同一份试卷,依 IRT 分数划档,不设单一及格线。
  // hsk-7/8/9 三个 LevelCode 共用相同蓝图。
  // 阅读中间分部、翻译、口语的精确题数未查到权威数字,见 spec 第九节 TBD-2/TBD-3。
  "hsk-7": buildHsk79("hsk-7"),
  "hsk-8": buildHsk79("hsk-8"),
  "hsk-9": buildHsk79("hsk-9"),
};

// HSK 7-9 共用试卷蓝图工厂(三级共卷,IRT 划档)。
function buildHsk79(levelCode: LevelCode): ExamBlueprint {
  return {
    levelCode,
    totalQuestions: 91, // 听40 + 读47 + 写1 + 译2 + 口1 = 91(与 spec 一致;旧值 98 为占位误差)
    durationMinutes: 210,
    totalScore: 500, // 听/读/写/译/口 五分项各满分100
    passScore: null, // 不设单一及格线,按能力值划 7/8/9 档
    vocabTarget: 11000, // 官方大纲PDF累计 11000(末条序号 11000;旧 blueprint 误写 11092)
    sections: [
      {
        sectionCode: "listening",
        blocks: [
          { part: 1, questionTypeCode: "L_NEWS_TF", count: 10, note: "听2段新闻(每段5句),判断是否符合原文" },
          { part: 2, questionTypeCode: "L_QA_MC4", count: 9, note: "听2个长篇对话(每段6题)中的9题单选(4选1)" },
          { part: 2, questionTypeCode: "L_LONG_FILL", count: 3, note: "听2个长篇对话中的3题填空" },
          { part: 3, questionTypeCode: "L_LONG_MC4", count: 15, note: "听3段材料(每段5-7题)中的15题单选" },
          { part: 3, questionTypeCode: "L_LONG_FILL", count: 3, note: "听3段材料中的3题填空" },
        ],
      },
      {
        sectionCode: "reading",
        // 第一部分28题、第四部分20题有权威来源;中间分部(第二、三部分)题数未查到,见 spec 第九节 TBD-2。
        blocks: [
          { part: 1, questionTypeCode: "R_TEXT_MC4", count: 28, note: "4篇材料(每篇7题),4选1" },
          { part: 4, questionTypeCode: "R_TEXT_MC4", count: 19, note: "其余分部合计(权威仅给末段20题/4选1);中间分部题数 TBD: 见 spec 第九节" },
        ],
      },
      {
        sectionCode: "writing",
        blocks: [
          { part: 1, questionTypeCode: "W_SUMMARIZE", count: 1, note: "约1000字文章缩写为约400字短文,标题自拟" },
        ],
      },
      {
        sectionCode: "translation",
        // 翻译精确题数未查到权威数字,占位各1题,见 spec 第九节 TBD-3。
        blocks: [
          { part: 1, questionTypeCode: "T_L2C_WRITTEN", count: 1, note: "外语笔译为中文(英/西/日/韩等7种之一);题量 TBD: 见 spec 第九节" },
          { part: 2, questionTypeCode: "T_L2C_INTERPRET", count: 1, note: "听外语音频口译为中文;题量 TBD: 见 spec 第九节" },
        ],
      },
      {
        sectionCode: "speaking",
        // 口语完整结构(分部数与每部题数)未查到权威数字,占位1题,见 spec 第九节 TBD-3。
        blocks: [
          { part: 1, questionTypeCode: "S_OPINION", count: 1, note: "听材料+问题(仅播放一次),口头阐述观点;题量 TBD: 见 spec 第九节" },
        ],
      },
    ],
  };
}
