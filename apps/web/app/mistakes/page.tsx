import { getRepository } from "@hsk/db";

import { requireUser } from "@/lib/auth";
import { SiteShell, SectionTitle } from "@/components/site-shell";
import { MistakeReviewCard } from "@/components/mistake-review";

export default async function MistakesPage() {
  const user = await requireUser();
  const repo = getRepository();

  // Fetch both due-queue and full list in parallel.
  const [dueMistakes, allMistakes] = await Promise.all([
    repo.getDueMistakes(user.id),
    repo.getMistakes(user.id),
  ]);

  const dueIds = new Set(dueMistakes.map((m) => m.id));
  const notDue = allMistakes.filter((m) => !dueIds.has(m.id));

  return (
    <SiteShell user={user}>
      <div className="mx-auto max-w-7xl space-y-14 px-6 py-16 lg:px-10">
        <SectionTitle
          eyebrow="Mistake book"
          title="错题本"
          body="服务端在提交评分时自动写入错题记录。使用 SRS 间隔重复算法安排复习。"
        />

        {/* Due queue */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-stone-950">
              待复习队列
            </h2>
            {dueMistakes.length > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                {dueMistakes.length} 条到期
              </span>
            )}
          </div>

          {dueMistakes.length > 0 ? (
            <div className="grid gap-4">
              {dueMistakes.map((item) => (
                <MistakeReviewCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.8rem] border border-stone-900/10 bg-white/75 p-6 text-stone-600">
              目前没有到期的复习任务。保持这个节奏！
            </div>
          )}
        </section>

        {/* Non-due mistakes */}
        {notDue.length > 0 && (
          <section className="space-y-5">
            <h2 className="text-xl font-semibold text-stone-950">其他错题</h2>
            <div className="grid gap-4">
              {notDue.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.7rem] border border-stone-900/10 bg-white/80 p-5"
                >
                  <div className="text-xs uppercase tracking-[0.24em] text-stone-500">
                    {item.levelCode} / {item.sectionCode} / {item.setSlug}
                  </div>
                  <div className="mt-3 text-sm font-medium text-stone-950">
                    {item.itemId}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500">
                    <span>
                      状态：
                      {item.mastered ? (
                        <span className="font-medium text-green-600">
                          已掌握
                        </span>
                      ) : (
                        <span className="font-medium text-amber-600">
                          学习中
                        </span>
                      )}
                    </span>
                    {item.repetitions !== undefined && (
                      <span>已复习 {item.repetitions} 次</span>
                    )}
                    {item.dueAt && (
                      <span>
                        下次复习：
                        {new Date(item.dueAt).toLocaleDateString("zh-CN", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {allMistakes.length === 0 && (
          <div className="rounded-[1.8rem] border border-stone-900/10 bg-white/75 p-6 text-stone-600">
            还没有错题记录。完成一套模考或专项练习后会自动生成。
          </div>
        )}
      </div>
    </SiteShell>
  );
}
