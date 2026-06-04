"use client";

import Link from "next/link";

// 账户页错误边界。
export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center">
      <div className="text-xs uppercase tracking-[0.28em] text-stone-500">账户出错</div>
      <h1 className="mt-3 text-3xl font-semibold text-stone-950">无法加载账户信息</h1>
      <p className="mt-3 text-sm leading-7 text-stone-600">
        载入账户数据时出错,请重试。
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-stone-400">错误编号:{error.digest}</p>
      ) : null}
      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white"
        >
          重试
        </button>
        <Link
          href="/"
          className="rounded-full border border-stone-900/10 px-6 py-3 text-sm font-medium text-stone-700"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
