"use client";

// 根级错误兜底。捕获任何未被更近边界处理的渲染错误,提供重试。
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-[2rem] border border-stone-900/10 bg-white/80 p-8 text-center">
        <div className="text-xs uppercase tracking-[0.28em] text-stone-500">出错了</div>
        <h1 className="mt-3 text-2xl font-semibold text-stone-950">页面加载失败</h1>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          发生了意外错误,请重试。如反复出现,请稍后再访问。
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-stone-400">错误编号:{error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white"
        >
          重试
        </button>
      </div>
    </div>
  );
}
