import Link from "next/link";

import { getRepository } from "@hsk/db";

import { getCurrentUser } from "@/lib/auth";
import { SiteShell, SectionTitle } from "@/components/site-shell";

export default async function LevelsPage() {
  const user = await getCurrentUser();
  const levels = await getRepository().getLevels();

  return (
    <SiteShell user={user}>
      <div className="page-wrapper py-16 lg:py-24 space-y-14">

        <SectionTitle
          eyebrow="考试级别"
          title="当前开放 HSK1，其他级别预留扩展位"
          body="HSK 3.0 共设 9 个级别，平台架构从第一天起就为全级别设计，避免后续重建。"
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {levels.map((level) => {
            const isLive = level.code === "hsk-1";
            return (
              <div
                key={level.id}
                className={`group relative rounded-[var(--radius-xl)] border p-7 transition-all ${
                  isLive
                    ? "border-[var(--surface-border-strong)] bg-[var(--surface)] hover:shadow-[var(--shadow-lg)] cursor-pointer"
                    : "border-[var(--surface-border)] bg-[var(--bg-subtle)]"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-3xl font-semibold tracking-tight text-stone-950">{level.name}</div>
                    {level.title && (
                      <div className="mt-0.5 text-sm text-[var(--text-tertiary)]">{level.title}</div>
                    )}
                  </div>
                  <span className={isLive ? "status-live flex-shrink-0" : "status-soon flex-shrink-0"}>
                    {isLive ? "开放" : "即将上线"}
                  </span>
                </div>

                {/* Description */}
                <p className={`mt-4 text-sm leading-6 ${isLive ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)]"}`}>
                  {level.description}
                </p>

                {/* CTA */}
                <div className="mt-6">
                  {isLive ? (
                    <Link
                      href="/levels/hsk-1"
                      className="btn btn-primary text-xs px-5 py-2.5"
                    >
                      进入 HSK1 →
                    </Link>
                  ) : (
                    <span className="text-xs text-[var(--text-tertiary)]">内容生产中，敬请期待</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info banner */}
        <div className="card flex flex-col gap-4 bg-[var(--bg-raised)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="eyebrow">关于 HSK 3.0</div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)] max-w-lg">
              汉考国际于 2021 年发布新版 HSK 标准，设立 HSK 1–9 九个级别，
              题型结构和词汇表均有较大调整。本平台题目及评分标准完全对齐新版。
            </p>
          </div>
          <Link href="/pricing" className="btn btn-ghost text-xs whitespace-nowrap flex-shrink-0">
            查看价格方案
          </Link>
        </div>

      </div>
    </SiteShell>
  );
}
