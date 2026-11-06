/**
 * services/content-engine/src/adapters/llm.ts
 *
 * 文本出题 adapter —— DeepSeek / OpenAI 兼容端点。
 *
 * 环境变量:
 *   LLM_API_KEY      — API 密钥 (DeepSeek 或 OpenAI 格式)
 *   LLM_BASE_URL     — 端点基础 URL，默认 https://api.deepseek.com
 *   LLM_MODEL        — 模型名，默认 deepseek-chat
 *
 * dry-run: LLM_API_KEY 缺失或传入 dryRun=true 时返回确定性 mock 数据，不真调外部。
 */

import type { LevelCode, QuestionTypeSlug, QuestionOption, AnswerFormat } from "../types.js";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

export type LLMQuestionResult = {
  stem: string;
  prompt: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  vocabFocus: string[];
  tags: string[];
  answerFormat: AnswerFormat;
  imagePromptHint?: string; // 若该题需要图片，给 gpt-image 的提示语素材
  audioTextHint?: string;   // 若该题需要音频，待 TTS 的文本
};

export type LLMGenerateOptions = {
  levelCode: LevelCode;
  questionTypeSlug: QuestionTypeSlug;
  count: number;
  dryRun?: boolean;
};

// ─── 词汇量上下文表 ───────────────────────────────────────────────────────────

const LEVEL_VOCAB_CONTEXT: Record<LevelCode, string> = {
  "hsk-1":            "HSK 1 级，词汇量约 500 词（新版）/ 150 词（旧版），句子结构极简，全用常见日常词",
  "hsk-2":            "HSK 2 级，词汇量约 1000 词，句子稍复杂，可用简单时间/地点/数量表达",
  "hsk-3":            "HSK 3 级，词汇量约 2245 词，可出现简单复合句和常见副词",
  "hsk-4":            "HSK 4 级，词汇量约 3245 词，可讨论日常社会话题，语法较多样",
  "hsk-5":            "HSK 5 级，词汇量约 4316 词，可处理新闻/学术语料，语境复杂",
  "hsk-6":            "HSK 6 级，词汇量约 5456 词，近义词辨析、病句、长篇缩写",
  "hsk-7-9":          "HSK 7-9 高等级，词汇量 11092 词，学术/专业语料，新闻/翻译/口语",
  "hskk-beginner":    "HSKK 初级，对应 HSK 1-2 级，约 200 词，口语简答",
  "hskk-intermediate":"HSKK 中级，对应 HSK 3-4 级，约 900 词，朗读/简短问答",
  "hskk-advanced":    "HSKK 高级，对应 HSK 5-6 级，约 3000 词，复述/观点阐述",
};

// ─── 题型 → prompt 指令 ───────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `你是专业 HSK 考试题目编写专家。请严格按照指定题型和级别生成题目。
输出规则：
1. 必须输出合法 JSON 数组，不加 markdown 包裹
2. 每题必须有唯一确定的正确答案
3. 严格控制词汇量在目标级别范围内
4. options 数组中每项格式: {"id":"A","label":"A","text":"..."}
5. 选项干扰项要有区分度，但不要超出本级词汇范围`;
}

function buildUserPrompt(opts: LLMGenerateOptions): string {
  const ctx = LEVEL_VOCAB_CONTEXT[opts.levelCode];
  return `请生成 ${opts.count} 道题型为 ${opts.questionTypeSlug} 的 ${opts.levelCode} 级 HSK 练习题。

级别背景：${ctx}

题型说明：${QUESTION_TYPE_INSTRUCTIONS[opts.questionTypeSlug] ?? "标准选择题"}

输出 JSON 数组，每题字段：
{
  "stem": "题干说明文字（考官提示语，如：请选出正确答案）",
  "prompt": "题目核心内容（句子/对话/短文等）",
  "options": [{"id":"A","label":"A","text":"..."},...],
  "correctAnswer": "A",
  "explanation": "解析，说明为何选 A，其他选项错误原因",
  "vocabFocus": ["重点词汇1","重点词汇2"],
  "tags": ["${opts.levelCode}","${opts.questionTypeSlug.toLowerCase()}","ai-generated"],
  "answerFormat": "${getAnswerFormat(opts.questionTypeSlug)}",
  "imagePromptHint": "（仅需图题型填写）给图片生成 AI 的简短英文提示，描述图片内容",
  "audioTextHint": "（仅需音频题型填写）待 TTS 朗读的完整文本"
}`;
}

const QUESTION_TYPE_INSTRUCTIONS: Partial<Record<QuestionTypeSlug, string>> = {
  L_WORD_IMG_TF:   "听词/短语判断图文是否对应。prompt 为一个词语或短语，options:[A:√, B:×]，answer 为 A 或 B。audioTextHint 填写该词语的朗读文本。imagePromptHint 描述对应图片",
  L_SENT_IMG_MC:   "听句子从3图选对应图。prompt 为一个句子，options 为3个图片描述选项，answer 为正确图选项id。audioTextHint 填写句子全文",
  L_DIALOG_IMG_MC: "听对话从图中选对应图。prompt 为两人对话，audioTextHint 填写对话全文，imagePromptHint 描述正确对应图",
  L_SENT_TF:       "听句判断对错。prompt 为一段话+一个判断句，options:[A:√, B:×]。audioTextHint 填写完整听力材料",
  L_QA_MC3:        "听对话和问题，从A/B/C三项选答案。prompt 为对话+问题，options 三项，audioTextHint 填写完整音频文本",
  L_QA_MC4:        "听对话/语段和问题，从A/B/C/D四项选答案。audioTextHint 必填",
  L_LONG_MC4:      "听长材料（采访/讲座）回答多题，四选一。audioTextHint 为长材料全文",
  L_CONSIST_MC4:   "听材料，选出与内容一致的一项，四选一。audioTextHint 为材料全文",
  R_IMG_WORD_TF:   "图片+词语判断对错。prompt 为一个词语，options:[A:√, B:×]。imagePromptHint 描述图片",
  R_SENT_IMG_MC:   "读句子从图选对应图。prompt 为句子，options 为图片描述，imagePromptHint 描述正确图",
  R_QA_MATCH:      "问答配对，A-F六项含1干扰。prompt 列5个问句，options 为6个回答(A-F)，correctAnswer 为以逗号分隔的对应id如'C,A,F,B,D'",
  R_SENT_FILL_MC:  "句子选词填空。prompt 为含___的句子，options 四项词语，answer 为正确词的id",
  R_PARA_MATCH:    "句子配对连线。prompt 列10个句子(奇数为左侧,偶数为右侧)，correctAnswer 为左右配对关系",
  R_TEXT_FILL_MC:  "短文选词填空。prompt 为含多处___的短文，options 为备选词，answer 为各空正确词id以逗号分隔",
  R_SENT_ORDER:    "句子排序。prompt 列5个打乱的句子片段(A-E)，correctAnswer 为正确顺序如'B,D,A,E,C'",
  R_TEXT_MC3:      "短文阅读三选一。prompt 为短文，stem 为问题，options 三项，answer 为正确项id",
  R_TEXT_MC4:      "短文阅读四选一。prompt 为短文+问题，options 四项，answer 为正确项id",
  R_ERROR_MC:      "选出有语病的句子。options 四个句子(A-D)，correctAnswer 为语病句的id，explanation 说明语病类型",
  W_PINYIN_CHAR:   "看拼音写汉字。prompt 为一个拼音（如：péngyou），options 四个汉字选项，answer 为正确汉字选项id",
  W_WORD_ORDER_SENT:"词语排序造句。prompt 列4-5个词语(打乱顺序)，correctAnswer 为正确句子全文",
  W_WORD_SENT:     "用词造句。prompt 为一个词语，correctAnswer 为示范造句，explanation 说明用法",
  W_IMG_WORD_SENT: "看图用词造句。prompt 为一个词语，imagePromptHint 描述图片场景，correctAnswer 为示范造句",
  W_IMG_WORD_PARA: "看图用词写短文（约80字）。prompt 为提示词语，imagePromptHint 描述图片，correctAnswer 为示范短文",
  W_SUMMARIZE:     "缩写长文。prompt 为约300字短文（用于练习，实考1000字），correctAnswer 为约100字缩写示范",
};

function getAnswerFormat(slug: QuestionTypeSlug): AnswerFormat {
  const map: Partial<Record<QuestionTypeSlug, AnswerFormat>> = {
    L_WORD_IMG_TF: "TF", L_SENT_TF: "TF", R_IMG_WORD_TF: "TF", L_NEWS_TF: "TF",
    L_SENT_IMG_MC: "MC-IMAGE", L_DIALOG_IMG_MC: "MC-IMAGE", R_SENT_IMG_MC: "MC-IMAGE",
    L_QA_MC3: "MC-ABC", R_TEXT_MC3: "MC-ABC", L_QA_MC4: "MC-ABCD",
    L_LONG_MC4: "MC-ABCD", L_CONSIST_MC4: "MC-ABCD", R_TEXT_FILL_MC: "FILL",
    R_SENT_FILL_MC: "FILL", R_SENT_FILL_CONTEXT: "FILL", L_LONG_FILL: "FILL",
    R_QA_MATCH: "MATCH", R_PARA_MATCH: "MATCH",
    R_SENT_ORDER: "ORDER", W_WORD_ORDER_SENT: "ORDER",
    W_PINYIN_CHAR: "WRITE-CHAR", W_WORD_SENT: "WRITE-SENT",
    W_IMG_WORD_SENT: "WRITE-SENT", W_IMG_WORD_PARA: "WRITE-PARA",
    W_SUMMARIZE: "WRITE-LONG",
    S_HSKK_REPEAT: "REC-REPEAT", S_HSKK_RETELL: "REC-REPEAT",
    S_HSKK_QA: "REC-ANSWER", S_HSKK_FREE_QA: "REC-ANSWER", S_OPINION: "REC-ANSWER",
    S_HSKK_READ: "REC-READ",
    T_L2C_WRITTEN: "WRITE-LONG", T_L2C_INTERPRET: "REC-TRANSLATE",
  };
  return map[slug] ?? "MC-ABCD";
}

// ─── Mock 数据生成 ─────────────────────────────────────────────────────────────

function mockItem(
  levelCode: LevelCode,
  questionTypeSlug: QuestionTypeSlug,
  index: number,
): LLMQuestionResult {
  const af = getAnswerFormat(questionTypeSlug);
  const baseOptions: QuestionOption[] =
    af === "TF"
      ? [{ id: "A", label: "A", text: "√" }, { id: "B", label: "B", text: "×" }]
      : af === "MC-ABC"
      ? [
          { id: "A", label: "A", text: `[mock] 选项 A-${index}` },
          { id: "B", label: "B", text: `[mock] 选项 B-${index}` },
          { id: "C", label: "C", text: `[mock] 选项 C-${index}` },
        ]
      : [
          { id: "A", label: "A", text: `[mock] 选项 A-${index}` },
          { id: "B", label: "B", text: `[mock] 选项 B-${index}` },
          { id: "C", label: "C", text: `[mock] 选项 C-${index}` },
          { id: "D", label: "D", text: `[mock] 选项 D-${index}` },
        ];

  return {
    stem: `[DRY-RUN] ${questionTypeSlug} 题干说明`,
    prompt: `[DRY-RUN ${levelCode}] 这是第 ${index + 1} 题的题目内容。`,
    options: baseOptions,
    correctAnswer: "A",
    explanation: `[DRY-RUN] 解析：本题考查 ${levelCode} 级别 ${questionTypeSlug} 题型。正确答案为 A。`,
    vocabFocus: ["示例词汇", "mock"],
    tags: [levelCode, questionTypeSlug.toLowerCase(), "ai-generated", "dry-run"],
    answerFormat: af,
    imagePromptHint: questionTypeSlug.includes("IMG")
      ? `A simple illustration for ${questionTypeSlug} at ${levelCode} level, item ${index}`
      : undefined,
    audioTextHint: questionTypeSlug.startsWith("L_") || questionTypeSlug.startsWith("S_")
      ? `[DRY-RUN] 这是第 ${index + 1} 题的音频文本内容。`
      : undefined,
  };
}

// ─── 重试工具 ─────────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 800,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

// ─── 主导出 ───────────────────────────────────────────────────────────────────

export async function generateQuestionsViaLLM(
  opts: LLMGenerateOptions,
): Promise<{ results: LLMQuestionResult[]; error?: string }> {
  const apiKey = process.env.LLM_API_KEY;

  // dry-run 或无 key
  if (opts.dryRun || !apiKey || apiKey === "your_key_here") {
    const results = Array.from({ length: opts.count }, (_, i) =>
      mockItem(opts.levelCode, opts.questionTypeSlug, i),
    );
    return { results };
  }

  const baseUrl = process.env.LLM_BASE_URL ?? DEFAULT_BASE_URL;
  const model = process.env.LLM_MODEL ?? DEFAULT_MODEL;
  const url = `${baseUrl}/chat/completions`;

  try {
    const rawText = await withRetry(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user", content: buildUserPrompt(opts) },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`LLM API ${res.status}: ${errText}`);
      }
      const data = (await res.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      return data.choices[0]?.message?.content ?? "";
    });

    // 提取 JSON 数组
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { results: [], error: `LLM 返回内容无法解析为 JSON 数组: ${rawText.slice(0, 200)}` };
    }
    const parsed = JSON.parse(jsonMatch[0]) as LLMQuestionResult[];
    return { results: parsed };
  } catch (err) {
    return {
      results: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
