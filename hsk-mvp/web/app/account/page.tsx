import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { SiteShell } from "@/components/site-shell";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardSnapshot, getUserReports } from "@/lib/platform-store";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/account");
  }

  const [reports, snapshot] = await Promise.all([
    getUserReports(user.id).catch(() => [] as Awaited<ReturnType<typeof getUserReports>>),
    getDashboardSnapshot(user.id).catch(() => ({
      activeUsers: 0,
      proUsers: 0,
      reportCount: 0,
      pendingReviewCount: 0,
      readyToPublishCount: 0,
    })),
  ]);

  return (
    <SiteShell user={user}>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_320px] lg:px-10">
        <div className="space-y-8">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Account</div>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight text-stone-950">{user.name}</h1>
            <p className="mt-3 text-lg leading-8 text-stone-600">
              {user.email} / 当前计划：{user.plan}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["完成报告", `${snapshot.reportCount}`],
              ["待审核内容", `${snapshot.pendingReviewCount}`],
              ["可发布内容", `${snapshot.readyToPublishCount}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-6">
                <div className="text-xs uppercase tracking-[0.26em] text-stone-500">{label}</div>
                <div className="mt-3 text-4xl font-semibold text-stone-950">{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-6">
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Recent reports</div>
            <div className="mt-5 grid gap-4">
              {reports.length ? (
                reports.map((report) => (
                  <div key={report.id} className="border-b border-stone-900/10 pb-4">
                    <div className="text-lg font-medium text-stone-950">{report.sourceSlug}</div>
                    <div className="mt-1 text-sm text-stone-500">
                      {report.score} / {report.total} · {Math.round(report.correctRate * 100)}%
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-500">还没有完成任何模考或专项练习。</p>
              )}
            </div>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-stone-900/10 bg-[#f2eadc] p-7">
          <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Settings</div>
          <div className="mt-3 text-3xl font-semibold text-stone-950">基础设置页</div>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            MVP 先显示账户、计划和学习摘要；后续再接真实订阅状态和通知偏好。
          </p>
          <div className="mt-8">
            <LogoutButton />
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}

