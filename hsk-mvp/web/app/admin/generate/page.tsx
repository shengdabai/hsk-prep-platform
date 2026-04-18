"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import type { Question } from "@/lib/hsk-content";
import type { DocType } from "@/lib/ai-generate";

const DOC_TYPES: { value: DocType; label: string; hint: string }[] = [
  { value: "vocab_list", label: "词汇表", hint: "每行一个词，如：你好、谢谢、再见…" },
  { value: "article", label: "文章段落", hint: "粘贴一段中文文章或阅读材料" },
  { value: "dialogue", label: "对话情景", hint: "粘贴一段对话或场景描述" },
  { value: "textbook", label: "教材章节", hint: "粘贴教材内容或学习笔记" },
];

export default function GeneratePage() {
  const [content, setContent] = useState("");
  const [docType, setDocType] = useState<DocType>("vocab_list");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ questions: Question[]; warning?: string } | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedType = DOC_TYPES.find((t) => t.value === docType)!;

  async function handleGenerate() {
    if (!content.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, docType, count, level: "HSK1" }),
      });
      const data = (await res.json()) as { questions?: Question[]; error?: string; warning?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "生成失败");
        return;
      }
      setResult({ questions: data.questions ?? [], warning: data.warning });
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result?.questions.length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          docType,
          count,
          level: "HSK1",
          save: true,
          pregenerated: result.questions,
        }),
      });
      const data = (await res.json()) as { saved?: boolean; error?: string };
      if (data.saved) setSaved(true);
      else setError(data.error ?? "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="AI 题目生成" body="上传文档内容，自动生成 HSK1 练习题。生成后可预览，确认后保存到题库（reviewStatus=pending，需审核后发布）。">
      <div className="space-y-6">
        {/* 文档类型 */}
        <div>
          <div className="mb-2 text-sm font-medium text-stone-700">文档类型</div>
          <div className="flex flex-wrap gap-2">
            {DOC_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setDocType(t.value)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  docType === t.value
                    ? "bg-[#9f3215] text-white"
                    : "border border-stone-900/15 bg-white text-stone-600 hover:border-stone-900/30"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="mt-1 text-xs text-stone-400">{selectedType.hint}</div>
        </div>

        {/* 内容输入 */}
        <div>
          <div className="mb-2 text-sm font-medium text-stone-700">文档内容</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder={selectedType.hint}
            className="w-full rounded-[1.2rem] border border-stone-900/15 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-900/40 focus:outline-none"
          />
        </div>

        {/* 题目数量 */}
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-stone-700">生成题数</div>
          {[3, 5, 8, 10].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={`rounded-full px-3 py-1 text-sm transition ${
                count === n
                  ? "bg-stone-900 text-white"
                  : "border border-stone-900/15 bg-white text-stone-600 hover:border-stone-900/30"
              }`}
            >
              {n} 道
            </button>
          ))}
        </div>

        {/* 生成按钮 */}
        <button
          onClick={handleGenerate}
          disabled={loading || !content.trim()}
          className="rounded-[1.2rem] bg-[#9f3215] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#852a10] disabled:opacity-40"
        >
          {loading ? "AI 生成中…" : "开始生成"}
        </button>

        {/* 错误 */}
        {error && (
          <div className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 结果预览 */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-stone-700">
                生成了 {result.questions.length} 道题目（预览）
              </div>
              {!saved ? (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-[1rem] bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-40"
                >
                  {saving ? "保存中…" : "保存到题库"}
                </button>
              ) : (
                <span className="rounded-[1rem] bg-emerald-100 px-4 py-2 text-sm text-emerald-700">
                  ✓ 已保存，前往审核
                </span>
              )}
            </div>
            {result.warning && (
              <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
                {result.warning}
              </div>
            )}
            <div className="space-y-3">
              {result.questions.map((q, i) => (
                <div key={q.id} className="rounded-[1.2rem] border border-stone-900/10 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">#{i + 1}</span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">{q.kind}</span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">{q.section} P{q.part}</span>
                    </div>
                    <span className="text-xs text-stone-400">{q.id}</span>
                  </div>
                  <div className="mt-2 text-sm font-medium text-stone-800">{q.prompt}</div>
                  {q.context && <div className="mt-1 text-xs text-stone-500">{q.context}</div>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {q.options.map((opt) => (
                      <span
                        key={opt.id}
                        className={`rounded-lg px-2 py-0.5 text-xs ${
                          opt.id === q.answer
                            ? "bg-emerald-100 text-emerald-700 font-medium"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {opt.label}. {opt.text}
                      </span>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="mt-1.5 text-xs text-stone-400">💡 {q.explanation}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
