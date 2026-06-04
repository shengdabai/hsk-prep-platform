// 模拟考详情页加载骨架,贴合详情页两栏布局。
export default function MockExamDetailLoading() {
  return (
    <div className="mx-auto grid max-w-7xl animate-pulse gap-10 px-6 py-16 lg:grid-cols-[1fr_360px] lg:px-10">
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="h-4 w-40 rounded-full bg-stone-200" />
          <div className="h-14 w-2/3 rounded-full bg-stone-200" />
          <div className="h-4 w-full rounded-full bg-stone-200" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 rounded-[1.8rem] bg-stone-200" />
          <div className="h-28 rounded-[1.8rem] bg-stone-200" />
          <div className="h-28 rounded-[1.8rem] bg-stone-200" />
        </div>
      </div>
      <div className="h-64 rounded-[2rem] bg-stone-200" />
    </div>
  );
}
