// 账户页加载骨架(服务端取 mockExams + sets,贴合双栏布局)。
export default function AccountLoading() {
  return (
    <div className="page-wrapper animate-pulse py-16 lg:py-24">
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <div className="space-y-3">
            <div className="h-4 w-20 rounded-full bg-stone-200" />
            <div className="h-12 w-2/3 rounded-full bg-stone-200" />
            <div className="h-4 w-1/2 rounded-full bg-stone-200" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-24 rounded-2xl bg-stone-200" />
            <div className="h-24 rounded-2xl bg-stone-200" />
            <div className="h-24 rounded-2xl bg-stone-200" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-20 rounded-xl bg-stone-200" />
            <div className="h-20 rounded-xl bg-stone-200" />
            <div className="h-20 rounded-xl bg-stone-200" />
            <div className="h-20 rounded-xl bg-stone-200" />
          </div>
        </div>
        <aside className="space-y-5">
          <div className="h-48 rounded-[1.5rem] bg-stone-200" />
          <div className="h-40 rounded-[1.5rem] bg-stone-200" />
        </aside>
      </div>
    </div>
  );
}
