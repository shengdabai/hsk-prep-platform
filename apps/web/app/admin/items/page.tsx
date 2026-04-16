import Link from "next/link";

import { getRepository } from "@hsk/db";

import { requireRole } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { SiteShell } from "@/components/site-shell";

export default async function AdminItemsPage() {
  const user = await requireRole(["reviewer", "admin"]);
  const items = await getRepository().listAdminItems();

  return (
    <SiteShell user={user}>
      <AdminShell title="题目列表" body="展示题目审核状态、发布状态、来源类型与版权状态。">
        <div className="overflow-hidden rounded-[1.8rem] border border-stone-900/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f3ede4] text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Section</th>
                <th className="px-4 py-3 font-medium">Review</th>
                <th className="px-4 py-3 font-medium">Publish</th>
              </tr>
            </thead>
            <tbody className="bg-white/80">
              {items.map((item) => (
                <tr key={item.id} className="border-t border-stone-900/10">
                  <td className="px-4 py-3">
                    <Link href={`/admin/items/${item.id}`} className="font-medium text-stone-900 hover:text-[var(--brand)]">
                      {item.id}
                    </Link>
                    <div className="mt-1 text-stone-500">{item.title}</div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{item.sectionCode}</td>
                  <td className="px-4 py-3 text-stone-600">{item.reviewStatus}</td>
                  <td className="px-4 py-3 text-stone-600">{item.publishStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminShell>
    </SiteShell>
  );
}

