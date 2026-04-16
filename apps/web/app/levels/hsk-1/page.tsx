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
      <div className="mx-auto grid max-w-7xl gap-14 px-6 py-16 lg:px-10">
        <SectionTitle
          eyebrow="HSK1"
          title="Starter 阶段的所有入口都收敛到这一页。"
          body="HSK1 模考、专项练习、报告和错题本共同构成 MVP 的完整学习闭环。"
        />

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] bg-[var(--brand)] p-8 text-[var(--brand-soft)]">
            <div className="text-xs uppercase tracking-[0.28em] text-white/70">Mock exams</div>
            <div className="mt-3 text-4xl font-semibold">{exams.length} 套模考</div>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/80">
              整卷流程、服务端评分、报告页和错题入本都从这里启动。
            </p>
            <Link href="/practice/mock-exams" className="mt-6 inline-flex rounded-full bg-[var(--brand-soft)] px-5 py-3 text-sm font-medium text-[var(--brand)]">
              查看模考列表
            </Link>
          </div>
          <div className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-8">
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Practice sets</div>
            <div className="mt-3 text-4xl font-semibold">{sets.length} 个专项练习集</div>
            <div className="mt-6 grid gap-3">
              {sets.map((set) => (
                <div key={set.id} className="border-b border-stone-900/10 pb-3">
                  <div className="text-xl font-medium">{set.title}</div>
                  <div className="mt-1 text-sm text-stone-500">{set.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

