import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { generateQuestions, type GenerateRequest } from "@/lib/ai-generate";
import type { Question } from "@/lib/hsk-content";

const QUESTIONS_JSON = path.join(process.cwd(), "../../output/web_import/questions.json");

// 轻量校验:写入题库前过滤掉结构不合法的 pregenerated 项,防注入污染题库。
function isValidQuestion(q: unknown): q is Question {
  if (!q || typeof q !== "object") return false;
  const o = q as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.prompt === "string" &&
    Array.isArray(o.options) &&
    typeof o.answer === "string"
  );
}

export async function POST(req: NextRequest) {
  // 鉴权门禁:该遗留端点会触发付费 DeepSeek 调用并写题库,必须配置并提供管理员 token。
  // (注:此 hsk-mvp 为遗留 scaffold,主平台已改用 services/content-engine 生产内容。)
  const adminToken = process.env.HSK_MVP_ADMIN_TOKEN;
  if (!adminToken || req.headers.get("x-admin-token") !== adminToken) {
    return NextResponse.json(
      { error: "未授权:该端点需配置 HSK_MVP_ADMIN_TOKEN 并在 x-admin-token 头中提供。" },
      { status: 401 },
    );
  }

  const body = (await req.json()) as GenerateRequest & { save?: boolean; pregenerated?: Question[] };
  const { save = false, pregenerated, ...genReq } = body;

  // 直接保存已生成题目（跳过 AI 调用）
  if (save && pregenerated && pregenerated.length > 0) {
    try {
      const validated = pregenerated.filter(isValidQuestion);
      if (validated.length === 0) {
        return NextResponse.json({ error: "pregenerated 中无结构合法的题目。" }, { status: 400 });
      }
      let existing: Question[] = [];
      if (fs.existsSync(QUESTIONS_JSON)) {
        existing = JSON.parse(fs.readFileSync(QUESTIONS_JSON, "utf-8")) as Question[];
      }
      const merged = [...existing, ...validated];
      fs.writeFileSync(QUESTIONS_JSON, JSON.stringify(merged, null, 2), "utf-8");
      return NextResponse.json({ saved: true, count: validated.length });
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
