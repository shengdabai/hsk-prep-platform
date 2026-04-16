import { SiteShell, SectionTitle } from "@/components/site-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function PricingPage() {
  const user = await getCurrentUser();

  return (
    <SiteShell user={user}>
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:px-10">
        <SectionTitle
          eyebrow="Pricing"
          title="价格页"
          body="目前已预留 Stripe Checkout 接口骨架；本地未接 Stripe 时仍可展示完整定价信息。"
        />
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-8">
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Free</div>
            <div className="mt-3 text-5xl font-semibold">¥0</div>
            <ul className="mt-6 grid gap-3 text-sm leading-7 text-stone-600">
              <li>浏览首页、级别页、价格页</li>
              <li>可进入免费体验页</li>
              <li>体验 1 套 HSK1 模考</li>
            </ul>
          </div>
          <div className="rounded-[2rem] bg-[var(--brand)] p-8 text-[var(--brand-soft)]">
            <div className="text-xs uppercase tracking-[0.28em] text-white/70">Pro</div>
            <div className="mt-3 text-5xl font-semibold">¥69 / 月</div>
            <ul className="mt-6 grid gap-3 text-sm leading-7 text-white/80">
              <li>全部 HSK1 模考</li>
              <li>全部 HSK1 专项练习</li>
              <li>报告页、错题本和后续扩展</li>
            </ul>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

