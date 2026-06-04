import Link from "next/link";

import { getRepository } from "@hsk/db";

import { getCurrentUser } from "@/lib/auth";
import { SiteShell, SectionTitle } from "@/components/site-shell";

export default async function Hsk1Page() {
  const user = await getCurrentUser();
  const repo = getRepository();
  const exams = await repo.getMockExams();
  const sets = await repo.getPracticeSets();

  return (
    <SiteShell user={user}>
      <div className="page-wrapper py-16 lg:py-24 space-y-16">

        <SectionTitle
          eyebrow="HSK 1"
          title="完整的 HSK1 学习闭环"
          body="模考、专项练习、报告和错题本四个模块协同运作，从测试到复习全程不中断。"
        />

        {/* ── Primary cards ──────────────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Mock exams — brand card */}
          <div className="card-brand relative overflow-hidden">
            <div className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full border border-white/8" />
            <div className="relative space-y-5">
              <div>
                <div className="eyebrow text-white/55">模考</div>
                <div className="mt-2 text-4xl font-semibold text-[var(--brand-soft)]">
                  {exams.length} 套整卷模考
                </div>
              </div>
              <p className="text-sm leading-6 text-white/70">
                按真实 HSK1 考试结构（听力 + 阅读 + 书写）排题，提交后服务端即时评分，
                自动生成分板块得分报告，错题一键入错题本。
              </p>
              <ul className="feature-list feature-list-inv text-xs">
                <li>全题型覆盖（听力选择、阅读判断/选词、书写填写）</li>
                <li>AI 自动生成配套图片与真人朗读音频</li>
                <li>提交后即时出详细报告</li>
              </ul>
              <Link
                href="/practice/mock-exams"
                className="btn bg-[var(--brand-soft)] text-[var(--brand)] hover:bg-white text-sm"
              >
                查看全部模考 →
              </Link>
            </div>
          </div>

          {/* Practice sets — light card */}
          <div className="card flex flex-col gap-6">
            <div>
              <div className="eyebrow">专项练习</div>
              <div className="mt-2 text-4xl font-semibold text-stone-950">
                {sets.length} 个练习集
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                按题型和板块拆分，专攻薄弱项。每次练习后同样生成报告并沉淀错题。
              </p>
            </div>

            {sets.length > 0 ? (
              <div className="flex-1 space-y-2 overflow-hidden">
                {sets.map((set) => (
                  <div
                    key={set.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-[var(--surface-border)] bg-[var(--bg-subtle)] px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-stone-900">{set.title}</div>
                      {set.description && (
                        <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">{set.description}</div>
                      )}
                    </div>
                    <span className="status-live flex-shrink-0">开放</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 rounded-xl border border-dashed border-[var(--surface-border-strong)] flex items-center justify-center py-8 text-sm text-[var(--text-tertiary)]">
                专项练习集即将上线
              </div>
            )}

            <Link href="/practice/sets" className="btn btn-ghost text-sm">
              进入专项练习 →
            </Link>
          </div>
        </div>

        {/* ── Secondary features ─────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: "📋",
              title: "错题本",
              body: "做错的题目自动收录，随时回来复习，不怕重蹈覆辙。",
              href: "/mistakes",
              cta: "查看错题本",
            },
            {
              icon: "📈",
              title: "成绩报告",
              body: "每次模考和专项练习后，按板块详细拆解得分情况。",
              href: "/practice/mock-exams",
              cta: "查看报告",
            },
            {
              icon: "🎯",
              title: "精准备考",
              body: "基于 HSK 3.0 官方词汇表和题型规格，备考方向精准不跑偏。",
              href: "/levels",
              cta: "了解更多",
            },
          ].map((f) => (
            <div key={f.title} className="card flex flex-col gap-4">
              <div className="text-2xl">{f.icon}</div>
              <div>
                <h3 className="text-base font-semibold text-stone-950">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{f.body}</p>
              </div>
              <Link href={f.href} className="mt-auto text-xs font-medium text-[var(--brand)] hover:underline">
                {f.cta} →
              </Link>
            </div>
          ))}
        </div>

        {/* ── Upgrade nudge (unauthenticated or free plan) ──────────── */}
        {(!user || user.plan === "free") && (
          <div
            className="flex flex-col items-start gap-5 rounded-[var(--radius-xl)] border border-[var(--surface-border)] bg-[var(--bg-raised)] px-8 py-7 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="eyebrow">升级到 Pro</div>
              <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)] max-w-md">
                解锁全部模考套卷、专项练习集、报告历史和错题本复习功能。
              </p>
            </div>
            <Link href="/pricing" className="btn btn-primary flex-shrink-0 text-sm">
              查看价格方案
            </Link>
          </div>
        )}

      </div>
    </SiteShell>
  );
}
