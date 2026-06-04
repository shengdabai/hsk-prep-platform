// 级别总览加载骨架(服务端取 levels)。
export default function LevelsLoading() {
  return (
    <div className="page-wrapper animate-pulse space-y-14 py-16 lg:py-24">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded-full bg-stone-200" />
        <div className="h-9 w-2/3 rounded-full bg-stone-200" />
        <div className="h-4 w-1/2 rounded-full bg-stone-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 rounded-[1.8rem] bg-stone-200" />
        ))}
      </div>
    </div>
  );
}
