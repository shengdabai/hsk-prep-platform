import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { generateQuestions, type GenerateRequest } from "@/lib/ai-generate";
import { planSave } from "@/lib/admin-save";
import type { Question } from "@/lib/hsk-content";

const DOC_TYPES: readonly unknown[] = ["vocab_list", "article", "dialogue", "textbook"];
const QUESTIONS_JSON = path.join(process.cwd(), "../../output/web_import/questions.json");

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON。" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "请求体必须是 JSON 对象。" }, { status: 400 });
  }
  const { save, pregenerated, ...genReq } = body as GenerateRequest & { save?: unknown; pregenerated?: unknown };

  // 保存模式:只写入重建后的合法题目(强制 pending / draft),无论结果如何都不进入付费生成。
  if (save === true) {
    let existing: Question[] = [];
    try {
      if (fs.existsSync(QUESTIONS_JSON)) {
        existing = JSON.parse(fs.readFileSync(QUESTIONS_JSON, "utf-8")) as Question[];
      }
    } catch (e) {
      console.error("admin generate could not read the question bank", e);
      return NextResponse.json({ error: "读取题库失败。" }, { status: 500 });
    }
    const plan = planSave(pregenerated, new Set(existing.map((question) => question.id)));
    if (!plan.ok) return NextResponse.json({ error: plan.error }, { status: 400 });
    try {
      fs.writeFileSync(QUESTIONS_JSON, JSON.stringify([...existing, ...plan.items], null, 2), "utf-8");
      return NextResponse.json({ saved: true, count: plan.items.length, skipped: plan.skipped });
    } catch (e) {
      console.error("admin generate save failed", e);
      return NextResponse.json({ error: "保存失败。" }, { status: 500 });
    }
  }

  if (typeof genReq.content !== "string" || !genReq.content.trim()) {
    return NextResponse.json({ error: "content 不能为空" }, { status: 400 });
  }
  if (genReq.content.length > 20_000) {
    return NextResponse.json({ error: "content 过长(上限 20000 字)" }, { status: 413 });
  }
  if (!Number.isInteger(genReq.count) || genReq.count < 1 || genReq.count > 20) {
    return NextResponse.json({ error: "count 必须是 1-20 的整数" }, { status: 400 });
  }
  if (!DOC_TYPES.includes(genReq.docType)) {
    return NextResponse.json({ error: "docType 不在支持范围内" }, { status: 400 });
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
