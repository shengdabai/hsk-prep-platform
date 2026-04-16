import { getRepository } from "@hsk/db";

import { requireUser } from "@/lib/auth";
import { SiteShell, SectionTitle } from "@/components/site-shell";

export default async function MistakesPage() {
  const user = await requireUser();
  const repo = getRepository();
  const mistakes = await repo.getMistakes(user.id);

  return (
    <SiteShell user={user}>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:px-10">
        <SectionTitle
          eyebrow="Mistake book"
          title="错题本"
          body="服务端在提交评分时自动写入错题记录。"
        />
        <div className="grid gap-5">
          {mistakes.length ? (
            mistakes.map((item) => (
              <div key={item.id} className="rounded-[1.7rem] border border-stone-900/10 bg-white/80 p-5">
                <div className="text-xs uppercase tracking-[0.24em] text-stone-500">
                  {item.levelCode} / {item.sectionCode} / {item.setSlug}
                </div>
                <div className="mt-3 text-lg font-medium text-stone-950">{item.itemId}</div>
                <div className="mt-2 text-sm text-stone-600">状态：{item.mastered ? "已掌握" : "待复习"}</div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.8rem] border border-stone-900/10 bg-white/75 p-6 text-stone-600">
              还没有错题记录。完成一套模考或专项练习后会自动生成。
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}

