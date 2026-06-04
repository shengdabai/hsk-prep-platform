// 会话(做题)页加载骨架,贴合 SessionRunner 的侧栏 + 主面板两栏布局。
export default function SessionLoading() {
  return (
    <div className="mx-auto grid max-w-7xl animate-pulse gap-8 px-6 py-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-10">
      <aside className="space-y-6">
        <div className="h-32 rounded-[2rem] bg-stone-200" />
        <div className="h-48 rounded-[2rem] bg-stone-200" />
        <div className="h-12 rounded-full bg-stone-200" />
      </aside>
      <section className="space-y-6 rounded-[2rem] border border-stone-900/10 bg-white/60 p-6 md:p-8">
        <div className="h-10 w-2/3 rounded-full bg-stone-200" />
        <div className="h-4 w-1/3 rounded-full bg-stone-200" />
        <div className="space-y-3 pt-4">
          <div className="h-14 rounded-2xl bg-stone-200" />
          <div className="h-14 rounded-2xl bg-stone-200" />
          <div className="h-14 rounded-2xl bg-stone-200" />
          <div className="h-14 rounded-2xl bg-stone-200" />
        </div>
      </section>
    </div>
  );
}
