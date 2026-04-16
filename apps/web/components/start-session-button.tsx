"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function StartSessionButton({
  setId,
  mode,
}: {
  setId: string;
  mode: "mock_exam" | "practice_set";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setPending(true);
    setError(null);

    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setIdOrSlug: setId, mode }),
    });
    const data = (await response.json()) as { sessionId?: string; error?: string };

    if (!response.ok || !data.sessionId) {
      setPending(false);
      setError(data.error ?? "无法创建答题会话。");
      return;
    }

    startTransition(() => {
      router.push(`/session/${data.sessionId}`);
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          void handleStart();
        }}
        disabled={pending}
        className="rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-medium text-[var(--brand-soft)] disabled:opacity-70"
      >
        {pending ? "正在创建会话..." : "开始答题"}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

