// Admin 区加载骨架(覆盖 admin 及未自带 loading 的子路由:items/imports/media/review/sets/users)。
// 这些页服务端取数据密集(题库/用户/媒体列表),慢网下避免白屏。
export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-8 px-6 py-12 lg:px-10">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded-full bg-stone-200" />
        <div className="h-9 w-1/3 rounded-full bg-stone-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-24 rounded-2xl bg-stone-200" />
        <div className="h-24 rounded-2xl bg-stone-200" />
        <div className="h-24 rounded-2xl bg-stone-200" />
        <div className="h-24 rounded-2xl bg-stone-200" />
      </div>
      <div className="space-y-3 rounded-[1.8rem] border border-stone-900/10 bg-white/60 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-stone-200" />
        ))}
      </div>
    </div>
  );
}
