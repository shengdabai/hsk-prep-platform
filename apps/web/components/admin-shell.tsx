import Link from "next/link";
import type { ReactNode } from "react";

export function AdminShell({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-10">
      <aside className="space-y-2 rounded-[2rem] border border-stone-900/10 bg-[#f2e8da] p-5 text-sm">
        <div className="mb-3 text-xs uppercase tracking-[0.28em] text-stone-500">Admin</div>
        <Link href="/admin" className="block rounded-full px-4 py-2 hover:bg-white/70">总览</Link>
        <Link href="/admin/items" className="block rounded-full px-4 py-2 hover:bg-white/70">题目列表</Link>
        <Link href="/admin/review" className="block rounded-full px-4 py-2 hover:bg-white/70">审核队列</Link>
        <Link href="/admin/sets" className="block rounded-full px-4 py-2 hover:bg-white/70">套卷管理</Link>
        <Link href="/admin/imports" className="block rounded-full px-4 py-2 hover:bg-white/70">导入管理</Link>
        <Link href="/admin/media" className="block rounded-full px-4 py-2 hover:bg-white/70">媒体管理</Link>
        <Link href="/admin/users" className="block rounded-full px-4 py-2 hover:bg-white/70">用户列表</Link>
      </aside>
      <section className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_30px_80px_rgba(34,22,8,0.08)] md:p-8">
        <div className="border-b border-stone-900/10 pb-5">
          <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Back office</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">{title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">{body}</p>
        </div>
        <div className="pt-6">{children}</div>
      </section>
    </div>
  );
}
