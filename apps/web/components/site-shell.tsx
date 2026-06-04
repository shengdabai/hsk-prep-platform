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
    <div className="min-h-screen hero-gradient text-stone-900">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[var(--surface-border)] bg-[var(--bg-overlay)] backdrop-blur-md">
        <div className="page-wrapper flex items-center justify-between py-3.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="flex size-9 items-center justify-center rounded-xl text-sm font-bold text-[var(--brand-soft)] shadow-[var(--shadow-brand)] transition-transform group-hover:scale-105"
              style={{ background: "linear-gradient(135deg, var(--brand-dark), var(--brand-light))" }}
            >
              H
            </div>
            <div className="leading-none">
              <div className="eyebrow" style={{ fontSize: "0.62rem", letterSpacing: "0.24em" }}>HSK Prep</div>
              <div className="mt-0.5 text-[0.95rem] font-semibold tracking-tight text-stone-900">中文备考平台</div>
            </div>
          </Link>

          {/* Nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {[
              { href: "/levels",               label: "级别" },
              { href: "/practice/mock-exams",  label: "模考" },
              { href: "/practice/sets",        label: "专项" },
              { href: "/pricing",              label: "价格" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface)] hover:text-stone-900"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Auth CTA */}
          <div className="flex items-center gap-2 text-sm">
            {user ? (
              <>
                <div className="hidden text-right leading-tight md:block">
                  <div className="text-sm font-medium text-stone-900">{user.fullName}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{user.plan}</div>
                </div>
                <Link href="/account" className="btn btn-ghost-soft text-xs">
                  账户
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost-soft text-xs">
                  登录
                </Link>
                <Link href="/signup" className="btn btn-primary text-xs">
                  免费开始
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────────── */}
      <main>{children}</main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--surface-border)] bg-[var(--bg-subtle)]">
        <div className="page-wrapper grid gap-10 py-12 md:grid-cols-[1.3fr_0.7fr_0.7fr] lg:py-16">
          {/* Brand + disclaimer */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div
                className="flex size-8 items-center justify-center rounded-lg text-xs font-bold text-[var(--brand-soft)]"
                style={{ background: "linear-gradient(135deg, var(--brand-dark), var(--brand-light))" }}
              >
                H
              </div>
              <span className="text-sm font-semibold text-stone-800">中文备考平台</span>
            </div>
            <p className="max-w-sm text-xs leading-6 text-[var(--text-tertiary)]">{nonOfficialStatement}</p>
          </div>

          {/* Practice links */}
          <div>
            <div className="eyebrow mb-4" style={{ fontSize: "0.62rem" }}>练习</div>
            <nav className="grid gap-2.5 text-sm text-[var(--text-secondary)]">
              <Link href="/practice/mock-exams" className="hover:text-stone-900">模考列表</Link>
              <Link href="/practice/sets"       className="hover:text-stone-900">专项列表</Link>
              <Link href="/levels"              className="hover:text-stone-900">级别总览</Link>
            </nav>
          </div>

          {/* Account / pricing */}
          <div>
            <div className="eyebrow mb-4" style={{ fontSize: "0.62rem" }}>账户</div>
            <nav className="grid gap-2.5 text-sm text-[var(--text-secondary)]">
              <Link href="/pricing"   className="hover:text-stone-900">价格页</Link>
              <Link href="/signup"    className="hover:text-stone-900">注册</Link>
              <Link href="/login"     className="hover:text-stone-900">登录</Link>
            </nav>
          </div>
        </div>

        <div className="border-t border-[var(--surface-border)] py-5">
          <div className="page-wrapper flex items-center justify-between text-xs text-[var(--text-tertiary)]">
            <span>© {new Date().getFullYear()} HSK Prep Platform</span>
            <span className="badge" style={{ fontSize: "0.62rem" }}>非官方第三方备考工具</span>
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
  center,
}: {
  eyebrow: string;
  title: string;
  body: string;
  center?: boolean;
}) {
  return (
    <div className={`max-w-2xl space-y-4 ${center ? "mx-auto text-center" : ""}`}>
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">{title}</h2>
      <p className="text-base leading-7 text-[var(--text-secondary)] md:text-lg">{body}</p>
    </div>
  );
}
