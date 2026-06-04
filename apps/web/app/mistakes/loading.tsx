// 错题本加载骨架(服务端并行取 due/all,慢网下避免白屏)。
export default function MistakesLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-14 px-6 py-16 lg:px-10">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded-full bg-stone-200" />
        <div className="h-9 w-48 rounded-full bg-stone-200" />
        <div className="h-4 w-2/3 rounded-full bg-stone-200" />
      </div>
      <div className="space-y-5">
        <div className="h-6 w-40 rounded-full bg-stone-200" />
        <div className="grid gap-4">
          <div className="h-28 rounded-[1.7rem] bg-stone-200" />
          <div className="h-28 rounded-[1.7rem] bg-stone-200" />
          <div className="h-28 rounded-[1.7rem] bg-stone-200" />
        </div>
      </div>
    </div>
  );
}
