import { getRepository } from "@hsk/db";

import { getCurrentUser } from "@/lib/auth";
import { StartSessionButton } from "@/components/start-session-button";
import { SiteShell, SectionTitle } from "@/components/site-shell";

export default async function PracticeSetsPage() {
  const user = await getCurrentUser();
  const sets = await getRepository().getPracticeSets();

  return (
    <SiteShell user={user}>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:px-10">
        <SectionTitle
          eyebrow="Practice sets"
          title="HSK1 专项练习列表"
          body="先按 section 拆练习集，后续可继续细分到题型或标签。"
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sets.map((set) => (
            <div key={set.id} className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="text-2xl font-semibold">{set.title}</div>
                <div className="rounded-full bg-stone-100 px-3 py-1 text-xs uppercase tracking-[0.18em] text-stone-600">
                  {set.access}
                </div>
              </div>
              <p className="mt-4 text-base leading-7 text-stone-600">{set.description}</p>
              <div className="mt-6">
                <StartSessionButton setId={set.id} mode="practice_set" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
