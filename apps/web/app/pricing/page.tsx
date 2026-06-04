import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { getCurrentUser } from "@/lib/auth";

const plans = [
  {
    id: "free",
    label: "Free",
    labelZh: "免费",
    price: "¥0",
    period: "",
    description: "快速体验平台，无需信用卡。",
    features: [
      "浏览首页、级别页、价格页",
      "免费体验 1 套 HSK1 模考",
      "查看基础成绩报告",
    ],
    cta: "免费注册",
    ctaHref: "/signup",
    recommended: false,
    variant: "ghost" as const,
  },
  {
    id: "pro",
    label: "Pro",
    labelZh: "专业版",
    price: "¥69",
    period: "/ 月",
    description: "完整解锁 HSK1 全部内容，系统化备考。",
    features: [
      "全部 HSK1 模考套卷（持续扩充）",
      "全部 HSK1 专项练习集",
      "AI 生成图片与音频配套媒体",
      "详细分板块成绩报告",
      "错题本 + 复习功能",
      "后续新增 HSK1 内容免费获取",
    ],
    cta: "开始 Pro 订阅",
    ctaHref: "/signup?plan=pro",
    recommended: true,
    variant: "brand" as const,
  },
  {
    id: "institution",
    label: "Institution",
    labelZh: "机构版",
    price: "定制",
    period: "",
    description: "适合学校、培训机构和团队批量使用。",
    features: [
      "Pro 计划全部功能",
      "多学员账号管理",
      "班级成绩统计与导出",
      "专属客服支持",
      "定制化题库需求（可议）",
    ],
    cta: "联系我们",
    ctaHref: "mailto:contact@hskprep.com",
    recommended: false,
    variant: "ghost" as const,
  },
];

export default async function PricingPage() {
  const user = await getCurrentUser();

  return (
    <SiteShell user={user}>
      <div className="page-wrapper py-16 lg:py-24 space-y-16">

        {/* Header */}
        <div className="space-y-6 text-center max-w-2xl mx-auto">
          <div className="eyebrow">价格方案</div>
          <h1 className="text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">
            透明定价，按需选择
          </h1>
          <p className="text-lg leading-8 text-[var(--text-secondary)]">
            免费体验完整模考流程，准备好了再升级 Pro——随时可取消，无隐藏费用。
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-[var(--radius-xl)] border p-8 transition-all ${
                plan.recommended
                  ? "border-[var(--brand)] bg-[linear-gradient(145deg,#3e1309,#8e2d13_42%,#c44820_100%)] text-[var(--brand-soft)] shadow-[var(--shadow-brand)]"
                  : "border-[var(--surface-border)] bg-[var(--surface)] hover:shadow-[var(--shadow-md)]"
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="badge badge-brand bg-white text-[var(--brand)] border-white shadow-[var(--shadow-sm)] text-[0.62rem]">
                    推荐方案
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="space-y-1.5">
                <div className={`eyebrow ${plan.recommended ? "text-white/55" : ""}`}>
                  {plan.label}
                </div>
                <div className={`text-sm ${plan.recommended ? "text-white/65" : "text-[var(--text-tertiary)]"}`}>
                  {plan.labelZh}
                </div>
              </div>

              {/* Price */}
              <div className="mt-6 flex items-baseline gap-1.5">
                <span
                  className={`font-display text-5xl font-semibold tracking-tight ${
                    plan.recommended ? "text-[var(--brand-soft)]" : "text-stone-950"
                  }`}
                >
                  {plan.price}
                </span>
                {plan.period && (
                  <span className={`text-sm ${plan.recommended ? "text-white/60" : "text-[var(--text-tertiary)]"}`}>
                    {plan.period}
                  </span>
                )}
              </div>

              <p className={`mt-3 text-sm leading-6 ${plan.recommended ? "text-white/70" : "text-[var(--text-secondary)]"}`}>
                {plan.description}
              </p>

              {/* Divider */}
              <div className={`my-6 border-t ${plan.recommended ? "border-white/15" : "border-[var(--surface-border)]"}`} />

              {/* Features */}
              <ul className={`feature-list flex-1 ${plan.recommended ? "feature-list-inv" : ""}`}>
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-8">
                <Link
                  href={plan.ctaHref}
                  className={`btn w-full justify-center py-3.5 text-sm ${
                    plan.recommended
                      ? "bg-[var(--brand-soft)] text-[var(--brand)] hover:bg-white"
                      : "btn-ghost"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ / notes */}
        <div className="card bg-[var(--bg-raised)] space-y-6">
          <div className="eyebrow">常见问题</div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                q: "Stripe 支付何时上线？",
                a: "支付接口骨架已预留，Stripe Checkout 将在正式公测前接入，届时 Pro 订阅即时生效。",
              },
              {
                q: "免费版可以一直用吗？",
                a: "是的。免费体验模考不限时间，只是套数受限。升级 Pro 才能解锁全部内容。",
              },
              {
                q: "内容持续更新吗？",
                a: "是的。Pro 订阅期间新增的 HSK1 模考和练习集均自动解锁，无需额外付费。",
              },
            ].map((item) => (
              <div key={item.q} className="space-y-2">
                <div className="text-sm font-semibold text-stone-950">{item.q}</div>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </SiteShell>
  );
}
