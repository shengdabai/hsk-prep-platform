import type { Question, QuestionKind } from "@/lib/hsk-content";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export type DocType = "vocab_list" | "article" | "dialogue" | "textbook";
export type GenerateRequest = {
  content: string;
  docType: DocType;
  count: number;
  level: "HSK1";
};

export type GenerateResult = {
  questions: Question[];
  rawResponse?: string;
  error?: string;
};

function buildPrompt(req: GenerateRequest): string {
  const kindMap: Record<DocType, QuestionKind[]> = {
    vocab_list: ["image_true_false", "fill_blank"],
    article: ["single_choice", "fill_blank"],
    dialogue: ["single_choice", "matching"],
    textbook: ["single_choice", "fill_blank", "image_true_false"],
  };
  const kinds = kindMap[req.docType];
  const kindStr = kinds.join(" / ");

  return `你是一名专业的HSK1级中文考试题目编写者。请根据以下${req.docType === "vocab_list" ? "词汇表" : req.docType === "article" ? "文章" : req.docType === "dialogue" ? "对话" : "教材内容"}，生成${req.count}道HSK1级练习题。

【内容】
${req.content}

【要求】
1. 题型只能是：${kindStr}
2. 难度严格控制在HSK1级别（150个基础词汇范围内）
3. 每道题必须有明确的唯一正确答案
4. image_true_false题：prompt是一个陈述句，options为[{id:"A",label:"A",text:"√"},{id:"B",label:"B",text:"×"}]，answer是"A"或"B"
5. fill_blank题：prompt是含___的句子，options为4个选项（A/B/C/D），answer是选项id
6. single_choice题：prompt是问题，options为3个选项（A/B/C），answer是选项id
7. matching题：prompt描述匹配任务，options为5个左侧项，answer是逗号分隔的右侧序号如"3,1,4,2,5"

【输出格式】
严格输出JSON数组，不要任何markdown包裹，直接输出：
[
  {
    "id": "AI_GEN_{唯一6位随机字母数字}",
    "title": "题目标题",
    "level": "HSK1",
    "section": "阅读",
    "part": 1,
    "kind": "fill_blank",
    "prompt": "题干",
    "context": null,
    "visualHint": null,
    "options": [{"id":"A","label":"A","text":"选项文字"},{"id":"B","label":"B","text":"选项文字"},{"id":"C","label":"C","text":"选项文字"},{"id":"D","label":"D","text":"选项文字"}],
    "answer": "A",
    "explanation": "解析说明",
    "estimatedSeconds": 30,
    "vocabFocus": ["关键词"],
    "sourceType": "original",
    "reviewStatus": "pending",
    "publishStatus": "draft",
    "copyrightStatus": "cleared",
    "tags": ["hsk1", "ai-generated"]
  }
]`;
}

export async function generateQuestions(req: GenerateRequest): Promise<GenerateResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return { questions: [], error: "DEEPSEEK_API_KEY 未配置，请在 .env.local 中设置" };
  }

  const prompt = buildPrompt(req);

  let rawResponse = "";
  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { questions: [], error: `DeepSeek API 错误 ${res.status}: ${err}` };
    }

    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    rawResponse = data.choices[0]?.message?.content ?? "";

    // 提取 JSON 数组（去除可能的 markdown 包裹）
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { questions: [], rawResponse, error: "AI 返回内容无法解析为 JSON 数组" };
    }

    const parsed = JSON.parse(jsonMatch[0]) as Question[];
    // 确保每题 id 唯一
    const now = Date.now();
    const questions = parsed.map((q, i) => ({
      ...q,
      id: q.id?.startsWith("AI_GEN_") ? q.id : `AI_GEN_${now}_${i}`,
    }));

    return { questions, rawResponse };
  } catch (e) {
    return {
      questions: [],
      rawResponse,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
