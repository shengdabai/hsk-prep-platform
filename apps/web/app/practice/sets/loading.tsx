// 专项练习列表加载骨架(服务端取 practice sets)。
export default function SetsLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-14 px-6 py-16 lg:px-10">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded-full bg-stone-200" />
        <div className="h-9 w-1/2 rounded-full bg-stone-200" />
        <div className="h-4 w-2/3 rounded-full bg-stone-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-[1.8rem] bg-stone-200" />
        ))}
      </div>
    </div>
  );
}
