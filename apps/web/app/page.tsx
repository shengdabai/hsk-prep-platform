import Link from "next/link";

import { getRepository } from "@hsk/db";
import { nonOfficialStatement } from "@hsk/shared";

import { getCurrentUser } from "@/lib/auth";
import { SiteShell, SectionTitle } from "@/components/site-shell";

export default async function HomePage() {
  const user = await getCurrentUser();
  const repo = getRepository();
  const levels = await repo.getLevels();
  const exams = await repo.getMockExams();
  const sets = await repo.getPracticeSets();

  return (
    <SiteShell user={user}>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="page-wrapper grid min-h-[calc(100svh-60px)] items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">

          {/* Left: copy */}
          <div className="space-y-8 lg:pb-8">
            <div className="badge badge-brand">
              <span className="inline-block size-1.5 rounded-full bg-[var(--brand)]" />
              对齐 HSK 3.0 新版考试标准
            </div>

            <div className="space-y-5">
              <h1
                className="font-display text-stone-950"
                style={{ fontSize: "var(--text-display)", lineHeight: 1.04, letterSpacing: "-0.03em" }}
              >
                AI 驱动的
                <br />
                <span style={{ color: "var(--brand)" }}>HSK 自动模考</span>
                <br />
                平台
              </h1>
              <p className="max-w-lg text-lg leading-8 text-[var(--text-secondary)]">
                全科覆盖（听力、阅读、写作），AI 自动生成配套图片与音频，
                题库持续扩充——告别手动拼 PDF，直接进入结构化训练闭环。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/levels/hsk-1" className="btn btn-primary px-7 py-3.5 text-sm">
                免费体验 HSK1
              </Link>
              <Link href="/pricing" className="btn btn-ghost px-7 py-3.5 text-sm">
                查看价格方案
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-6 border-t border-[var(--surface-border)] pt-6">
              {[
                ["HSK 3.0", "新版题型全覆盖"],
                ["AI 图/音", "自动生成配套媒体"],
                ["HSK 1–9", "完整级别架构"],
              ].map(([val, lbl]) => (
                <div key={val} className="leading-tight">
                  <div className="text-base font-semibold text-stone-900">{val}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: feature card */}
          <div className="card-brand relative overflow-hidden">
            {/* Decorative rings */}
            <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full border border-white/8 opacity-60" />
            <div className="pointer-events-none absolute -right-8 -top-8 size-48 rounded-full border border-white/10 opacity-50" />

            <div className="relative grid h-full gap-8 content-between">
              <div>
                <div className="eyebrow text-white/55">当前已上线</div>
                <div className="mt-3 text-3xl font-semibold leading-snug text-[var(--brand-soft)]">
                  一个完整的<br />HSK1 学习闭环
                </div>
              </div>

              <div className="grid gap-4">
                {[
                  {
                    num: `${exams.length} 套`,
                    label: "模考",
                    desc: "整卷流程 · 服务端评分 · 自动生成报告",
                  },
                  {
                    num: `${sets.length} 个`,
                    label: "专项练习集",
                    desc: "按 section 拆分 · 集中补弱项",
                  },
                  {
                    num: "全自动",
                    label: "AI 媒体生成",
                    desc: "图片与音频随题自动生成",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/12 bg-white/8 px-5 py-4 backdrop-blur-sm"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-semibold text-[var(--brand-soft)]">{item.num}</span>
                      <span className="text-sm font-medium text-white/70">{item.label}</span>
                    </div>
                    <div className="mt-1 text-xs leading-5 text-white/50">{item.desc}</div>
                  </div>
                ))}
              </div>

              <Link
                href="/levels/hsk-1"
                className="btn w-full justify-center bg-[var(--brand-soft)] text-[var(--brand)] hover:bg-white"
              >
                立即进入 HSK1 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── What makes it different ───────────────────────────────────── */}
      <section className="section border-t border-[var(--surface-border)] bg-[var(--bg-subtle)]">
        <div className="page-wrapper space-y-14">
          <SectionTitle
            eyebrow="核心优势"
            title="独一无二的自动化模考体验"
            body="不是把 PDF 搬上网——从出题逻辑、媒体生成到评分报告，每一环都重新设计。"
          />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "🎯",
                title: "对齐 HSK 3.0",
                body: "完全按照汉考国际 2021 年发布的新版标准设计题型结构，涵盖听力、阅读、书写三大板块。",
              },
              {
                icon: "🤖",
                title: "AI 自动生成图片与音频",
                body: "配套媒体资源全部由 AI 按题目语境自动生成，无需手工制作，题库扩充成本极低。",
              },
              {
                icon: "📊",
                title: "服务端评分与详细报告",
                body: "提交后服务端即时批改，自动产出分板块得分报告，错题一键入本方便复习。",
              },
              {
                icon: "📚",
                title: "全科结构覆盖",
                body: "听力选项题、阅读判断题、阅读选词填空、书写填写题——所有 HSK1 题型全部覆盖。",
              },
              {
                icon: "🔁",
                title: "可持续扩展架构",
                body: "从 HSK1 到 HSK9 的数据模型在首个版本就预先设计好，未来升级无需重建底层。",
              },
              {
                icon: "🔒",
                title: "版权清晰，合规内容",
                body: "题库经人工审核和版权清理，平台只上线已确认合规的内容，不直接搬运原始真题 PDF。",
              },
            ].map((f) => (
              <div key={f.title} className="card">
                <div className="mb-4 text-2xl">{f.icon}</div>
                <h3 className="text-lg font-semibold tracking-tight text-stone-950">{f.title}</h3>
                <p className="mt-2.5 text-sm leading-6 text-[var(--text-secondary)]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Levels ────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="page-wrapper grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionTitle
            eyebrow="考试级别"
            title="从 HSK1 开始，架构支持 HSK1–9"
            body="当前 HSK1 全功能上线；其他级别内容正在生产中，架构已全部预留。"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {levels.map((level) => {
              const isLive = level.code === "hsk-1";
              return (
                <Link
                  key={level.id}
                  href={isLive ? "/levels/hsk-1" : "/levels"}
                  className={`group rounded-2xl border p-5 transition-all ${
                    isLive
                      ? "border-[var(--surface-border-strong)] bg-[var(--surface)] hover:shadow-[var(--shadow-md)]"
                      : "border-[var(--surface-border)] bg-[var(--bg-subtle)] opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xl font-semibold text-stone-950">{level.name}</div>
                    <span className={isLive ? "status-live" : "status-soon"}>
                      {isLive ? "开放" : "即将上线"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{level.description}</p>
                  {isLive && (
                    <div className="mt-3 text-xs font-medium text-[var(--brand)] opacity-0 transition-opacity group-hover:opacity-100">
                      进入 →
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Stats banner ─────────────────────────────────────────────── */}
      <section className="border-y border-[var(--surface-border)] bg-[var(--bg-subtle)]">
        <div className="page-wrapper py-14">
          <div className="grid gap-10 text-center sm:grid-cols-3">
            {[
              { value: `${exams.length}+`, label: "模考套卷" },
              { value: `${sets.length}+`, label: "专项练习集" },
              { value: "HSK 3.0", label: "新版标准对齐" },
            ].map((s) => (
              <div key={s.label}>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compliance ───────────────────────────────────────────────── */}
      <section className="section">
        <div className="page-wrapper">
          <div className="card grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="eyebrow">合规声明</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950 md:text-3xl">
                非官方声明与内容<br />发布边界已纳入产品设计
              </h2>
            </div>
            <div className="space-y-4 text-sm leading-7 text-[var(--text-secondary)]">
              <p>{nonOfficialStatement}</p>
              <p>平台只读取已审核、已发布、版权已清理的内容，不直接对外搬运原始真题 PDF。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="page-wrapper">
          <div
            className="relative overflow-hidden rounded-[var(--radius-xl)] px-8 py-14 text-center text-[var(--brand-soft)] md:px-16 md:py-20"
            style={{ background: "linear-gradient(135deg, #3e1309 0%, #8e2d13 50%, #c44820 100%)", boxShadow: "var(--shadow-xl)" }}
          >
            <div className="pointer-events-none absolute -left-20 -top-20 size-80 rounded-full border border-white/8" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 size-64 rounded-full border border-white/8" />
            <div className="relative space-y-6">
              <div className="eyebrow text-white/55">立即开始</div>
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                免费体验完整的 HSK1 模考
              </h2>
              <p className="mx-auto max-w-md text-base leading-7 text-white/70">
                注册即可免费体验一套完整模考，无需信用卡，全程中文界面。
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/signup" className="btn bg-white text-[var(--brand)] hover:bg-[var(--brand-soft)] px-8 py-3.5">
                  免费注册
                </Link>
                <Link href="/practice/mock-exams" className="btn border border-white/30 text-white hover:bg-white/10 px-8 py-3.5">
                  先看模考列表
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </SiteShell>
  );
}
