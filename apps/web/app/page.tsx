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
      <section className="relative overflow-hidden">
        <div className="mx-auto grid min-h-[calc(100svh-73px)] max-w-7xl items-end gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-20">
          <div className="space-y-8 pb-4">
            <div className="inline-flex rounded-full border border-stone-900/10 bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.28em] text-stone-500">
              HSK-aligned exam prep
            </div>
            <div className="space-y-5">
              <div className="text-sm uppercase tracking-[0.26em] text-stone-500">HSK Prep Platform / MVP</div>
              <h1 className="max-w-4xl text-5xl leading-[0.96] tracking-tight text-stone-950 md:text-7xl lg:text-[5.35rem]">
                为 HSK 冲刺，
                <br />
                不再靠 PDF 堆练习。
              </h1>
              <p className="max-w-xl text-lg leading-8 text-stone-600 md:text-xl">
                先上线 HSK1，用模考、专项练习、错题本和审核后的已发布内容，搭成一个可持续扩展到 HSK1–9 的备考平台。
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/levels/hsk-1" className="rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-medium text-[var(--brand-soft)]">
                进入 HSK1
              </Link>
              <Link href="/practice/mock-exams" className="rounded-full border border-stone-900/10 px-6 py-3 text-sm">
                免费体验模考
              </Link>
            </div>
          </div>

          <div className="relative min-h-[520px] rounded-[2.7rem] border border-stone-900/10 bg-[linear-gradient(145deg,#3e1309,#8e2d13_42%,#d8792d_120%)] p-8 text-[#fff2df] shadow-[0_40px_120px_rgba(71,28,10,0.22)]">
            <div className="grid h-full content-between gap-8">
              <div className="grid gap-4">
                <div className="text-xs uppercase tracking-[0.28em] text-white/65">MVP scope</div>
                <div className="max-w-sm text-4xl leading-tight">一个完整的 HSK1 学习闭环。</div>
              </div>
              <div className="grid gap-5">
                <div className="grid gap-2 border-b border-white/12 pb-4">
                  <div className="text-sm text-white/60">1. 模考</div>
                  <div className="text-2xl">{exams.length} 套 HSK1 模考，服务端评分和报告生成。</div>
                </div>
                <div className="grid gap-2 border-b border-white/12 pb-4">
                  <div className="text-sm text-white/60">2. 专项</div>
                  <div className="text-2xl">{sets.length} 个练习集，按 section 拆分。</div>
                </div>
                <div className="grid gap-2">
                  <div className="text-sm text-white/60">3. 后台</div>
                  <div className="text-2xl">审核、导入、发布、用户只读都在同一个后台。</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-10">
        <SectionTitle
          eyebrow="Levels"
          title="从 HSK1 开始，但架构不只服务于 HSK1。"
          body="当前前台只开放 HSK1，其他级别清楚标为即将上线，避免空壳页面。"
        />
        <div className="grid gap-4 md:grid-cols-2">
          {levels.map((level) => (
            <Link
              key={level.id}
              href={level.code === "hsk-1" ? "/levels/hsk-1" : "/levels"}
              className="border-b border-stone-900/10 pb-4"
            >
              <div className="flex items-center justify-between">
                <div className="text-2xl font-semibold">{level.name}</div>
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
                  {level.status === "live" ? "Open" : "Soon"}
                </div>
              </div>
              <div className="mt-2 text-base leading-7 text-stone-600">{level.description}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-3 lg:px-10">
        {[
          ["模考", "按真实考试结构整卷完成，提交后自动生成报告。"],
          ["专项", "按 section 和题型分组，便于集中补弱项。"],
          ["错题本", "自动沉淀做错的题目，并支持后续复习。"],
        ].map(([title, body]) => (
          <div key={title} className="border-b border-stone-900/10 pb-5">
            <div className="text-2xl font-semibold text-stone-950">{title}</div>
            <p className="mt-3 text-base leading-7 text-stone-600">{body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="grid gap-6 border-t border-stone-900/10 pt-10 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Compliance</div>
            <div className="mt-3 text-3xl font-semibold">非官方声明与内容发布边界已纳入产品设计。</div>
          </div>
          <div className="space-y-6 text-base leading-7 text-stone-600">
            <p>{nonOfficialStatement}</p>
            <p>平台只读取已审核、已发布、版权已清理的内容，不直接对外搬运原始真题 PDF。</p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

