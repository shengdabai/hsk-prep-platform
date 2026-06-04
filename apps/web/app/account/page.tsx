import Link from "next/link";

import { getRepository } from "@hsk/db";

import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { SiteShell } from "@/components/site-shell";

export default async function AccountPage() {
  const user = await requireUser();
  const repo = getRepository();
  const exams = await repo.getMockExams();
  const sets = await repo.getPracticeSets();

  const isPro = user.plan !== "free";

  return (
    <SiteShell user={user}>
      <div className="page-wrapper py-16 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">

          {/* ── Main column ────────────────────────────────────────── */}
          <div className="space-y-10">

            {/* User header */}
            <div className="space-y-2">
              <div className="eyebrow">账户</div>
              <h1 className="text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">
                {user.fullName}
              </h1>
              <p className="text-base text-[var(--text-secondary)]">
                {user.email}
                <span className="mx-2 text-[var(--surface-border-strong)]">·</span>
                <span className="capitalize">{user.role}</span>
                <span className="mx-2 text-[var(--surface-border-strong)]">·</span>
                <span className={isPro ? "text-[var(--brand)] font-medium" : ""}>
                  {user.plan === "free" ? "免费版" : user.plan === "pro" ? "Pro" : user.plan}
                </span>
              </p>
            </div>

            {/* Stats row */}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "可做模考", value: `${exams.length}`, unit: "套" },
                { label: "可做专项", value: `${sets.length}`, unit: "个" },
                { label: "当前计划", value: isPro ? "Pro" : "免费版", unit: "" },
              ].map(({ label, value, unit }) => (
                <div key={label} className="card">
                  <div className="eyebrow">{label}</div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="stat-value text-3xl">{value}</span>
                    {unit && <span className="text-sm text-[var(--text-tertiary)]">{unit}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div className="space-y-4">
              <div className="eyebrow">快速入口</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { href: "/practice/mock-exams", label: "模考列表", desc: "开始或继续一套模考" },
                  { href: "/practice/sets",       label: "专项练习", desc: "针对性补弱项练习" },
                  { href: "/mistakes",            label: "错题本",   desc: "复习所有做错的题目" },
                  { href: "/levels/hsk-1",        label: "HSK1 总览", desc: "查看 HSK1 学习进度" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center justify-between rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-5 py-4 transition-all hover:border-[var(--surface-border-strong)] hover:shadow-[var(--shadow-sm)]"
                  >
                    <div>
                      <div className="text-sm font-medium text-stone-900 group-hover:text-[var(--brand)]">
                        {item.label}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">{item.desc}</div>
                    </div>
                    <span className="text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Upgrade nudge for free users */}
            {!isPro && (
              <div
                className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--brand)]/20 bg-[rgba(159,50,21,0.04)] px-7 py-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-stone-900">升级到 Pro，解锁全部功能</div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    全部模考套卷、专项练习、错题本复习——¥69 / 月起。
                  </p>
                </div>
                <Link href="/pricing" className="btn btn-primary flex-shrink-0 text-sm">
                  查看价格方案
                </Link>
              </div>
            )}
          </div>

          {/* ── Sidebar ────────────────────────────────────────────── */}
          <aside className="space-y-5">

            {/* Plan card */}
            <div className={`rounded-[var(--radius-xl)] p-6 space-y-4 ${
              isPro
                ? "bg-[linear-gradient(145deg,#3e1309,#8e2d13_42%,#c44820_100%)] text-[var(--brand-soft)]"
                : "border border-[var(--surface-border)] bg-[var(--bg-raised)]"
            }`}>
              <div className={`eyebrow ${isPro ? "text-white/55" : ""}`}>当前方案</div>
              <div className={`text-2xl font-semibold ${isPro ? "text-[var(--brand-soft)]" : "text-stone-950"}`}>
                {isPro ? "Pro 会员" : "免费版"}
              </div>
              <p className={`text-sm leading-6 ${isPro ? "text-white/65" : "text-[var(--text-secondary)]"}`}>
                {isPro
                  ? "感谢订阅！你已解锁全部 HSK1 内容，新增题库自动同步。"
                  : "免费版可体验 1 套模考。升级 Pro 解锁全部内容。"}
              </p>
              {!isPro && (
                <Link href="/pricing" className="btn btn-primary text-xs w-full justify-center py-3">
                  升级到 Pro
                </Link>
              )}
            </div>

            {/* Settings card */}
            <div className="card bg-[var(--bg-raised)] space-y-5">
              <div className="eyebrow">账户设置</div>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                后续可在这里管理订阅状态、下载个人数据和修改偏好设置。
              </p>
              <div className="border-t border-[var(--surface-border)] pt-4">
                <LogoutButton />
              </div>
            </div>

          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
