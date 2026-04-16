"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);

    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      fullName: String(formData.get("fullName") ?? ""),
    };

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "请求失败，请重试。");
      return;
    }

    const next = searchParams.get("next") ?? "/account";
    startTransition(() => {
      router.push(next);
      router.refresh();
    });
  }

  return (
    <form
      action={(formData) => {
        void handleSubmit(formData);
      }}
      className="grid gap-4"
    >
      {mode === "signup" ? (
        <label className="grid gap-2">
          <span className="text-sm text-stone-600">姓名</span>
          <input
            required
            name="fullName"
            className="rounded-3xl border border-stone-900/10 bg-white px-4 py-3 outline-none focus:border-stone-900/30"
            placeholder="例如：Alice"
          />
        </label>
      ) : null}

      <label className="grid gap-2">
        <span className="text-sm text-stone-600">邮箱</span>
        <input
          required
          type="email"
          name="email"
          className="rounded-3xl border border-stone-900/10 bg-white px-4 py-3 outline-none focus:border-stone-900/30"
          placeholder={mode === "login" ? "learner@demo.local" : "you@example.com"}
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm text-stone-600">密码</span>
        <input
          required
          type="password"
          name="password"
          className="rounded-3xl border border-stone-900/10 bg-white px-4 py-3 outline-none focus:border-stone-900/30"
          placeholder={mode === "login" ? "demo1234" : "至少 6 位"}
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-medium text-[var(--brand-soft)] disabled:opacity-70"
      >
        {isPending ? "提交中..." : mode === "login" ? "登录" : "注册"}
      </button>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}

