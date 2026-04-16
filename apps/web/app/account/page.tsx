import { getRepository } from "@hsk/db";

import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { SiteShell } from "@/components/site-shell";

export default async function AccountPage() {
  const user = await requireUser();
  const repo = getRepository();
  const exams = await repo.getMockExams();
  const sets = await repo.getPracticeSets();

  return (
    <SiteShell user={user}>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_320px] lg:px-10">
        <div className="space-y-8">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Account</div>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight text-stone-950">{user.fullName}</h1>
            <p className="mt-3 text-lg leading-8 text-stone-600">{user.email} / {user.role} / {user.plan}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["可做模考", `${exams.length}`],
              ["可做专项", `${sets.length}`],
              ["当前计划", user.plan],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-6">
                <div className="text-xs uppercase tracking-[0.26em] text-stone-500">{label}</div>
                <div className="mt-3 text-4xl font-semibold text-stone-950">{value}</div>
              </div>
            ))}
          </div>
        </div>
        <aside className="rounded-[2rem] border border-stone-900/10 bg-[#f2eadc] p-7">
          <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Settings</div>
          <div className="mt-3 text-3xl font-semibold text-stone-950">账户页</div>
          <p className="mt-4 text-sm leading-7 text-stone-600">后续可在这里接真实订阅状态、资料下载和偏好设置。</p>
          <div className="mt-8">
            <LogoutButton />
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}

