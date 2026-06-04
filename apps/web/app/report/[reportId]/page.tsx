import Link from "next/link";
import { notFound } from "next/navigation";

import { getRepository } from "@hsk/db";

import { requireUser } from "@/lib/auth";
import { SiteShell } from "@/components/site-shell";
import { ReportCharts } from "@/components/report-charts";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  // 必须登录,且只能查看自己的报告(资源归属校验,堵 IDOR + 答案 key 泄露)。
  const user = await requireUser();
  const repo = getRepository();

  const report = await repo.getReport(reportId);

  // 非本人报告一律 notFound(不泄露 reportId 是否存在),与 /api/reports/[id] 同口径。
  if (!report || report.userId !== user.id) {
    notFound();
  }

  // Fetch full item details for each mistake (for stem/options/explanation).
  const mistakeItems = await Promise.all(
    report.mistakes.map(async (m) => {
      const item = await repo.getItem(m.itemId);
      return { ...m, item };
    }),
  );

  return (
    <SiteShell user={user}>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_360px] lg:px-10">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">
              Report
            </div>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight text-stone-950">
              考试报告
            </h1>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {(
              [
                ["得分", `${report.score} / ${report.total}`],
                ["正确率", `${Math.round(report.accuracy * 100)}%`],
                ["用时", `${Math.round(report.durationSeconds / 60)} 分钟`],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-6"
              >
                <div className="text-xs uppercase tracking-[0.26em] text-stone-500">
                  {label}
                </div>
                <div className="mt-3 text-4xl font-semibold text-stone-950">
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Section breakdown */}
          <div className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-6">
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">
              Section breakdown
            </div>
            <div className="mt-5 grid gap-4">
              {report.sectionBreakdown.map((section) => {
                const pct =
                  section.total > 0
                    ? (section.correct / section.total) * 100
                    : 0;
                return (
                  <div key={section.sectionCode} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-stone-600">
                      <span>{section.sectionCode}</span>
                      <span>
                        {section.correct} / {section.total}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-[var(--brand)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multi-dimensional analysis (only when dimensions exist) */}
          <ReportCharts dimensions={report.dimensions} />

          {/* Mistakes list — full detail */}
          <div className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-6">
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">
              错题解析
            </div>
            <div className="mt-5 space-y-6">
              {mistakeItems.length === 0 && (
                <p className="text-sm text-stone-600">本次没有错题，恭喜！</p>
              )}
              {mistakeItems.map(({ itemId, yourAnswer, correctAnswer, item }) => (
                <div
                  key={itemId}
                  className="border-b border-stone-900/10 pb-6 last:border-0 last:pb-0"
                >
                  {item ? (
                    <>
                      {/* Stem */}
                      <p className="text-sm font-medium leading-7 text-stone-900">
                        {item.stem || item.title}
                      </p>
                      {item.prompt && item.prompt !== item.stem && (
                        <p className="mt-1 text-sm leading-7 text-stone-600">
                          {item.prompt}
                        </p>
                      )}

                      {/* Options */}
                      {item.options.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                          {item.options.map((opt) => {
                            const isCorrect = opt.id === correctAnswer;
                            const isYours = opt.id === yourAnswer;
                            return (
                              <li
                                key={opt.id}
                                className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${
                                  isCorrect
                                    ? "bg-green-50 text-green-800"
                                    : isYours && !isCorrect
                                      ? "bg-red-50 text-red-700"
                                      : "text-stone-600"
                                }`}
                              >
                                <span className="shrink-0 font-medium">
                                  {opt.label}.
                                </span>
                                <span>{opt.text}</span>
                                {isCorrect && (
                                  <span className="ml-auto shrink-0 text-xs font-medium text-green-700">
                                    ✓ 正确
                                  </span>
                                )}
                                {isYours && !isCorrect && (
                                  <span className="ml-auto shrink-0 text-xs font-medium text-red-600">
                                    ✗ 你的答案
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {/* Answer summary when no options list */}
                      {item.options.length === 0 && (
                        <div className="mt-3 space-y-1 text-sm text-stone-600">
                          <div>
                            你的答案：
                            <span className="font-medium text-red-600">
                              {yourAnswer ?? "未作答"}
                            </span>
                          </div>
                          <div>
                            正确答案：
                            <span className="font-medium text-green-700">
                              {correctAnswer}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      {item.explanation && (
                        <div className="mt-3 rounded-xl bg-stone-50 px-4 py-3 text-xs leading-6 text-stone-600">
                          <span className="font-medium text-stone-700">
                            解析：
                          </span>
                          {item.explanation}
                        </div>
                      )}
                    </>
                  ) : (
                    // Fallback when item not found
                    <div className="text-sm leading-7 text-stone-600">
                      <div>题目：{itemId}</div>
                      <div>
                        你的答案：
                        <span className="font-medium text-red-600">
                          {yourAnswer ?? "未作答"}
                        </span>
                      </div>
                      <div>
                        正确答案：
                        <span className="font-medium text-green-700">
                          {correctAnswer}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="rounded-[2rem] border border-stone-900/10 bg-[#1f160e] p-7 text-[#f6ecde]">
          <div className="text-xs uppercase tracking-[0.28em] text-white/55">
            Next step
          </div>
          <div className="mt-3 text-3xl font-semibold">继续练习</div>
          <p className="mt-4 text-sm leading-7 text-white/70">
            错题已经自动进入错题本，建议回到专项练习继续补强。
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/mistakes"
              className="rounded-full bg-[var(--brand-soft)] px-5 py-3 text-center text-sm font-medium text-[var(--brand)]"
            >
              打开错题本
            </Link>
            <Link
              href="/practice/sets"
              className="rounded-full border border-white/15 px-5 py-3 text-center text-sm text-white"
            >
              返回专项练习
            </Link>
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}
