// 模拟考列表页加载骨架。
export default function MockExamsLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-10 px-6 py-16 lg:px-10">
      <div className="space-y-4">
        <div className="h-4 w-32 rounded-full bg-stone-200" />
        <div className="h-12 w-1/2 rounded-full bg-stone-200" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-56 rounded-[2rem] bg-stone-200" />
        ))}
      </div>
    </div>
  );
}
