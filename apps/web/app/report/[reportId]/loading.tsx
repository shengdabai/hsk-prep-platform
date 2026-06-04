// 报告页加载骨架。
export default function ReportLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-8 px-6 py-16 lg:px-10">
      <div className="space-y-4">
        <div className="h-4 w-32 rounded-full bg-stone-200" />
        <div className="h-12 w-1/2 rounded-full bg-stone-200" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-32 rounded-[1.8rem] bg-stone-200" />
        <div className="h-32 rounded-[1.8rem] bg-stone-200" />
        <div className="h-32 rounded-[1.8rem] bg-stone-200" />
      </div>
      <div className="h-64 rounded-[2rem] bg-stone-200" />
    </div>
  );
}
