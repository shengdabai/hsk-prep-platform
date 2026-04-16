import Link from "next/link";

import { getRepository } from "@hsk/db";

import { getCurrentUser } from "@/lib/auth";
import { SiteShell, SectionTitle } from "@/components/site-shell";

export default async function LevelsPage() {
  const user = await getCurrentUser();
  const levels = await getRepository().getLevels();

  return (
    <SiteShell user={user}>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:px-10">
        <SectionTitle
          eyebrow="Levels"
          title="当前开放 HSK1，其他级别预留扩展位。"
          body="页面先把可用入口和待上线状态区分清楚，不拿空数据占坑。"
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {levels.map((level) => (
            <div key={level.id} className="rounded-[2rem] border border-stone-900/10 bg-white/70 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-semibold">{level.name}</div>
                  <div className="mt-1 text-sm text-stone-500">{level.title}</div>
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">{level.status}</div>
              </div>
              <p className="mt-4 text-base leading-7 text-stone-600">{level.description}</p>
              {level.code === "hsk-1" ? (
                <Link href="/levels/hsk-1" className="mt-6 inline-flex rounded-full bg-[var(--brand)] px-5 py-3 text-sm text-[var(--brand-soft)]">
                  打开 HSK1
                </Link>
              ) : (
                <div className="mt-6 text-sm text-stone-500">即将上线</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}

