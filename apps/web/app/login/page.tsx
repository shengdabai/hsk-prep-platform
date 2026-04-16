import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { SiteShell } from "@/components/site-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  return (
    <SiteShell user={user}>
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:px-10">
        <div className="space-y-5">
          <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Login</div>
          <h1 className="text-5xl font-semibold tracking-tight text-stone-950">登录后开始做题。</h1>
          <p className="max-w-lg text-lg leading-8 text-stone-600">Demo 账户：`learner@demo.local / demo1234`</p>
        </div>
        <div className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-8">
          <AuthForm mode="login" />
          <p className="mt-5 text-sm text-stone-500">
            还没有账户？<Link href="/signup" className="text-[var(--brand)]">创建一个</Link>
          </p>
        </div>
      </div>
    </SiteShell>
  );
}

