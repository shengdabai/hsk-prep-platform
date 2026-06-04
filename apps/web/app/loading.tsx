// 根级加载兜底骨架。任何未提供自身 loading.tsx 的路由在数据加载时回退到此。
export default function RootLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-3xl animate-pulse space-y-6">
        <div className="h-8 w-1/3 rounded-full bg-stone-200" />
        <div className="h-4 w-2/3 rounded-full bg-stone-200" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 rounded-[1.8rem] bg-stone-200" />
          <div className="h-28 rounded-[1.8rem] bg-stone-200" />
          <div className="h-28 rounded-[1.8rem] bg-stone-200" />
        </div>
      </div>
    </div>
  );
}
