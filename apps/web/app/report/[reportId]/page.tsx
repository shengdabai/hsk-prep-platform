import Link from "next/link";
import { notFound } from "next/navigation";

import { getRepository } from "@hsk/db";

import { getCurrentUser } from "@/lib/auth";
import { SiteShell } from "@/components/site-shell";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const user = await getCurrentUser();
  const repo = getRepository();
  const report = await repo.getReport(reportId);

  if (!report) {
    notFound();
  }

  return (
    <SiteShell user={user}>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_360px] lg:px-10">
        <div className="space-y-8">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Report</div>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight text-stone-950">报告页</h1>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["得分", `${report.score} / ${report.total}`],
              ["正确率", `${Math.round(report.accuracy * 100)}%`],
              ["用时", `${Math.round(report.durationSeconds / 60)} 分钟`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-6">
                <div className="text-xs uppercase tracking-[0.26em] text-stone-500">{label}</div>
                <div className="mt-3 text-4xl font-semibold text-stone-950">{value}</div>
              </div>
            ))}
          </div>
          <div className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-6">
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Section breakdown</div>
            <div className="mt-5 grid gap-4">
              {report.sectionBreakdown.map((section) => (
                <div key={section.sectionCode} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-stone-600">
                    <span>{section.sectionCode}</span>
                    <span>{section.correct} / {section.total}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${(section.correct / section.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-6">
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Mistakes</div>
            <div className="mt-5 grid gap-4">
              {report.mistakes.map((mistake) => (
                <div key={mistake.itemId} className="border-b border-stone-900/10 pb-4 text-sm leading-7 text-stone-600">
                  <div>题目：{mistake.itemId}</div>
                  <div>你的答案：{mistake.yourAnswer ?? "未作答"}</div>
                  <div>正确答案：{mistake.correctAnswer}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-stone-900/10 bg-[#1f160e] p-7 text-[#f6ecde]">
          <div className="text-xs uppercase tracking-[0.28em] text-white/55">Next step</div>
          <div className="mt-3 text-3xl font-semibold">继续练习</div>
          <p className="mt-4 text-sm leading-7 text-white/70">错题已经自动进入错题本，建议回到专项练习继续补强。</p>
          <div className="mt-8 flex flex-col gap-3">
            <Link href="/mistakes" className="rounded-full bg-[var(--brand-soft)] px-5 py-3 text-sm font-medium text-[var(--brand)]">
              打开错题本
            </Link>
            <Link href="/practice/sets" className="rounded-full border border-white/15 px-5 py-3 text-sm text-white">
              返回专项练习
            </Link>
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}

