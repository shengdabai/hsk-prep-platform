import { requireRole } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { SiteShell } from "@/components/site-shell";

export default async function AdminMediaPage() {
  const user = await requireRole(["reviewer", "admin"]);

  return (
    <SiteShell user={user}>
      <AdminShell title="媒体管理" body="后续接 Supabase Storage 后，这里管理图片、音频和裁图素材。">
        <div className="rounded-[1.8rem] border border-stone-900/10 bg-[#fbf8f3] p-5 text-sm leading-7 text-stone-600">
          当前为 MVP 占位页，已为 Storage bucket 和 media_assets 表预留结构。
        </div>
      </AdminShell>
    </SiteShell>
  );
}

