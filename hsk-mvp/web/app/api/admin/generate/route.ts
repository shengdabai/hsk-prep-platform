import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { generateQuestions, type GenerateRequest } from "@/lib/ai-generate";
import type { Question } from "@/lib/hsk-content";

const QUESTIONS_JSON = path.join(process.cwd(), "../../output/web_import/questions.json");

export async function POST(req: NextRequest) {
  const body = (await req.json()) as GenerateRequest & { save?: boolean; pregenerated?: Question[] };
  const { save = false, pregenerated, ...genReq } = body;

  // 直接保存已生成题目（跳过 AI 调用）
  if (save && pregenerated && pregenerated.length > 0) {
    try {
      let existing: Question[] = [];
      if (fs.existsSync(QUESTIONS_JSON)) {
        existing = JSON.parse(fs.readFileSync(QUESTIONS_JSON, "utf-8")) as Question[];
      }
      const merged = [...existing, ...pregenerated];
      fs.writeFileSync(QUESTIONS_JSON, JSON.stringify(merged, null, 2), "utf-8");
      return NextResponse.json({ saved: true, count: pregenerated.length });
    } catch (e) {
      return NextResponse.json({ error: `保存失败: ${String(e)}` }, { status: 500 });
    }
  }

  if (!genReq.content?.trim()) {
    return NextResponse.json({ error: "content 不能为空" }, { status: 400 });
  }
  if (!genReq.count || genReq.count < 1 || genReq.count > 20) {
    return NextResponse.json({ error: "count 必须在 1-20 之间" }, { status: 400 });
  }

  const result = await generateQuestions(genReq);

  if (result.error && result.questions.length === 0) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    questions: result.questions,
    saved: false,
    warning: result.error,
  });
}
