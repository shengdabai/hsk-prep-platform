import { getRepository } from "@hsk/db";

import { requireRole } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { SiteShell } from "@/components/site-shell";

export default async function AdminPage() {
  const user = await requireRole(["reviewer", "admin"]);
  const repo = getRepository();
  const items = await repo.listAdminItems();
  const users = await repo.listUsers();

  return (
    <SiteShell user={user}>
      <AdminShell title="管理后台首页" body="总览内容量、审核状态和用户基础统计。">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Items", `${items.length}`],
            ["Pending review", `${items.filter((item) => item.reviewStatus !== "approved").length}`],
            ["Published", `${items.filter((item) => item.publishStatus === "published").length}`],
            ["Users", `${users.length}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.8rem] border border-stone-900/10 bg-[#fbf8f3] p-5">
              <div className="text-xs uppercase tracking-[0.26em] text-stone-500">{label}</div>
              <div className="mt-3 text-4xl font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </AdminShell>
    </SiteShell>
  );
}

