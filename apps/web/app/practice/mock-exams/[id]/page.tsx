import { notFound } from "next/navigation";

import { getRepository } from "@hsk/db";

import { getCurrentUser } from "@/lib/auth";
import { StartSessionButton } from "@/components/start-session-button";
import { SiteShell } from "@/components/site-shell";

export default async function MockExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const repo = getRepository();
  const exam = await repo.getMockExamById(id);

  if (!exam) {
    notFound();
  }

  const items = await repo.getPublishedItemsForSet(exam.id);

  return (
    <SiteShell user={user}>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_360px] lg:px-10">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Mock exam detail</div>
            <h1 className="text-5xl font-semibold tracking-tight text-stone-950">{exam.title}</h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-600">{exam.description}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["时长", `${exam.minutes} 分钟`],
              ["题量", `${items.length} 题`],
              ["访问计划", exam.access],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.8rem] border border-stone-900/10 bg-white/75 p-5">
                <div className="text-xs uppercase tracking-[0.26em] text-stone-500">{label}</div>
                <div className="mt-3 text-2xl font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </div>
        <aside className="rounded-[2rem] border border-stone-900/10 bg-[#1f160e] p-7 text-[#f6ecde]">
          <div className="text-xs uppercase tracking-[0.28em] text-white/55">Ready</div>
          <div className="mt-3 text-3xl font-semibold">开始整卷模拟</div>
          <p className="mt-4 text-sm leading-7 text-white/70">服务端评分，前端不暴露正确答案。</p>
          <div className="mt-7">
            <StartSessionButton setId={exam.id} mode="mock_exam" />
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}

