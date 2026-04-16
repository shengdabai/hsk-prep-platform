import { getRepository } from "@hsk/db";

import { requireRole } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { SiteShell } from "@/components/site-shell";

export default async function AdminSetsPage() {
  const user = await requireRole(["reviewer", "admin"]);
  const repo = getRepository();
  const exams = await repo.getMockExams();
  const sets = await repo.getPracticeSets();

  return (
    <SiteShell user={user}>
      <AdminShell title="套卷管理" body="模考和专项练习集统一管理。">
        <div className="grid gap-4">
          {[...exams, ...sets].map((set) => (
            <div key={set.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] border border-stone-900/10 bg-[#fbf8f3] p-5">
              <div>
                <div className="text-lg font-medium text-stone-950">{set.title}</div>
                <div className="mt-1 text-sm text-stone-500">{set.mode} / {set.slug}</div>
              </div>
              <div className="text-sm text-stone-600">{set.access} / {set.minutes} min</div>
            </div>
          ))}
        </div>
      </AdminShell>
    </SiteShell>
  );
}

