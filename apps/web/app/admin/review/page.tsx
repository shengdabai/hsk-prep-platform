import Link from "next/link";

import { getRepository } from "@hsk/db";

import { requireRole } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { SiteShell } from "@/components/site-shell";

export default async function AdminReviewPage() {
  const user = await requireRole(["reviewer", "admin"]);
  const queue = (await getRepository().listAdminItems()).filter((item) => item.reviewStatus !== "approved");

  return (
    <SiteShell user={user}>
      <AdminShell title="审核页" body="只列出需要 reviewer/admin 处理的内容。">
        <div className="grid gap-4">
          {queue.map((item) => (
            <Link key={item.id} href={`/admin/items/${item.id}`} className="rounded-[1.6rem] border border-stone-900/10 bg-[#fbf8f3] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-medium text-stone-950">{item.id}</div>
                  <div className="mt-1 text-sm text-stone-500">{item.title}</div>
                </div>
                <div className="text-sm text-stone-500">{item.reviewStatus}</div>
              </div>
            </Link>
          ))}
        </div>
      </AdminShell>
    </SiteShell>
  );
}

