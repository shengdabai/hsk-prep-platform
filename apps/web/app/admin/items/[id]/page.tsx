import { notFound } from "next/navigation";

import { getRepository } from "@hsk/db";

import { requireRole } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { SiteShell } from "@/components/site-shell";

export default async function AdminItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(["reviewer", "admin"]);
  const item = await getRepository().getItem(id);

  if (!item) {
    notFound();
  }

  return (
    <SiteShell user={user}>
      <AdminShell title={`题目详情 / 审核页 · ${item.id}`} body="MVP 先做只读详情和审核状态展示，后续可补编辑表单。">
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Review", item.reviewStatus],
              ["Publish", item.publishStatus],
              ["Source", item.sourceType],
              ["Copyright", item.copyrightCleared ? "cleared" : "pending"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.6rem] border border-stone-900/10 bg-[#fbf8f3] p-5">
                <div className="text-xs uppercase tracking-[0.26em] text-stone-500">{label}</div>
                <div className="mt-3 text-2xl font-semibold">{value}</div>
              </div>
            ))}
          </div>
          <div className="rounded-[1.8rem] border border-stone-900/10 bg-white/80 p-6">
            <div className="text-sm text-stone-500">{item.stem}</div>
            <div className="mt-3 text-2xl text-stone-950">{item.prompt}</div>
            <div className="mt-5 grid gap-2">
              {item.options.map((option) => (
                <div key={option.id} className="rounded-2xl bg-[#f6f1ea] px-4 py-3 text-stone-700">
                  {option.label}. {option.text}
                </div>
              ))}
            </div>
            <div className="mt-5 text-sm leading-7 text-stone-600">解析：{item.explanation}</div>
          </div>
        </div>
      </AdminShell>
    </SiteShell>
  );
}

