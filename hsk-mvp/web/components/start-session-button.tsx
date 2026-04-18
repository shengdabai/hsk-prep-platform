"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function StartSessionButton({
  sourceKind,
  sourceSlug,
  allowed,
  needsLogin = false,
}: {
  sourceKind: "mock_exam" | "practice_set";
  sourceSlug: string;
  allowed: boolean;
  needsLogin?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (needsLogin) {
      router.push(`/login?next=/practice/mock-exams/${sourceSlug}`);
      return;
    }
    if (!allowed) {
      router.push("/pricing");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceKind, sourceSlug }),
      });

      const data = (await response.json()) as { sessionId?: string; error?: string };

      if (!response.ok || !data.sessionId) {
        setError(data.error ?? "无法创建会话，请稍后重试。");
        setPending(false);
        return;
      }

      startTransition(() => {
        router.push(`/session/${data.sessionId}`);
      });
    } catch {
      setError("网络异常，请稍后重试。");
      setPending(false);
    }
  }

  function buttonLabel() {
    if (pending) return "正在创建会话...";
    if (needsLogin) return "登录后开始";
    if (!allowed) return "升级后开始";
    return "开始本组练习";
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleStart}
        disabled={pending}
        className="rounded-full bg-[#9f3215] px-6 py-3 text-sm font-medium text-[#fff3df] transition hover:bg-[#84240f] disabled:cursor-wait disabled:opacity-70"
      >
        {buttonLabel()}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
