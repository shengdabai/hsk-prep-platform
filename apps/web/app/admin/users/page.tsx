import { getRepository } from "@hsk/db";

import { requireRole } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { SiteShell } from "@/components/site-shell";

export default async function AdminUsersPage() {
  const user = await requireRole(["reviewer", "admin"]);
  const users = await getRepository().listUsers();

  return (
    <SiteShell user={user}>
      <AdminShell title="用户列表（只读）" body="MVP 只展示用户角色、计划和邮箱。">
        <div className="overflow-hidden rounded-[1.8rem] border border-stone-900/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f3ede4] text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Plan</th>
              </tr>
            </thead>
            <tbody className="bg-white/80">
              {users.map((entry) => (
                <tr key={entry.id} className="border-t border-stone-900/10">
                  <td className="px-4 py-3">{entry.fullName}</td>
                  <td className="px-4 py-3 text-stone-600">{entry.email}</td>
                  <td className="px-4 py-3 text-stone-600">{entry.role}</td>
                  <td className="px-4 py-3 text-stone-600">{entry.plan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminShell>
    </SiteShell>
  );
}
