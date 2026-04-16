import Link from "next/link";
import type { ReactNode } from "react";

import { nonOfficialStatement, type AppUser } from "@hsk/shared";

export function SiteShell({
  children,
  user,
}: {
  children: ReactNode;
  user?: AppUser | null;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff4e3,transparent_30%),radial-gradient(circle_at_82%_0%,#f5d4b4,transparent_25%),linear-gradient(180deg,#f8f3eb_0%,#f2ecdf_40%,#efe7db_100%)] text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-900/10 bg-[#f7f0e6]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-[var(--brand)] text-center text-lg font-semibold leading-[2.75rem] text-[var(--brand-soft)]">
              H
            </div>
            <div>
              <div className="text-[0.72rem] uppercase tracking-[0.28em] text-stone-500">HSK Prep</div>
              <div className="text-lg font-semibold">中文备考平台</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-stone-700 md:flex">
            <Link href="/levels">级别</Link>
            <Link href="/practice/mock-exams">模考</Link>
            <Link href="/practice/sets">专项</Link>
            <Link href="/pricing">价格</Link>
            <Link href="/admin">后台</Link>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <div className="hidden text-right md:block">
                  <div className="font-medium">{user.fullName}</div>
                  <div className="text-xs text-stone-500">{user.role} / {user.plan}</div>
                </div>
                <Link href="/account" className="rounded-full border border-stone-900/10 px-4 py-2 hover:border-stone-900/30">
                  账户
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-full border border-stone-900/10 px-4 py-2 hover:border-stone-900/30">
                  登录
                </Link>
                <Link href="/signup" className="rounded-full bg-[var(--brand)] px-4 py-2 text-[var(--brand-soft)]">
                  免费开始
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-stone-900/10 bg-[#efe6d8]">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 text-sm text-stone-600 lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Non-official statement</div>
            <p className="max-w-2xl leading-7">{nonOfficialStatement}</p>
          </div>
          <div className="grid gap-2">
            <Link href="/practice/mock-exams">模考列表</Link>
            <Link href="/practice/sets">专项列表</Link>
            <Link href="/pricing">价格页</Link>
            <Link href="/admin/items">题目管理</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-2xl space-y-3">
      <div className="text-xs uppercase tracking-[0.28em] text-stone-500">{eyebrow}</div>
      <h2 className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">{title}</h2>
      <p className="text-base leading-7 text-stone-600 md:text-lg">{body}</p>
    </div>
  );
}

