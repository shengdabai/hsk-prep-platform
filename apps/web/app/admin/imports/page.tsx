import { requireRole } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { SiteShell } from "@/components/site-shell";

export default async function AdminImportsPage() {
  const user = await requireRole(["reviewer", "admin"]);

  return (
    <SiteShell user={user}>
      <AdminShell title="导入管理" body="MVP 通过 scripts/import-items.ts 接收 JSON/CSV 结构化题库导入。">
        <div className="grid gap-4">
          <div className="rounded-[1.8rem] border border-stone-900/10 bg-[#fbf8f3] p-5">
            <div className="text-sm leading-7 text-stone-600">
              建议导入路径：
              <br />
              `content/imports/`
              <br />
              当前脚本入口：
              <br />
              `apps/web/scripts/import-items.ts`
            </div>
          </div>
        </div>
      </AdminShell>
    </SiteShell>
  );
}

