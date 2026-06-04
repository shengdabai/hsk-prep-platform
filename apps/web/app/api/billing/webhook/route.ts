import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getRepository } from "@hsk/db";
import type { PlanCode, SubscriptionStatus } from "@hsk/shared";

import { markStripeEventOnce } from "@/lib/stripe-event-dedup";

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return "inactive";
  }
}

// priceId → plan 权威映射。以 Stripe 实际计费的 priceId 为准反查套餐等级,
// 绝不信任客户端可伪造的 metadata.plan 字符串。
// 未配置的 priceId(或取不到)回退到最低权限 "free",避免误授予高等级。
function planFromPriceId(priceId: string | null | undefined): PlanCode | null {
  if (!priceId) {
    return null;
  }
  const map: Record<string, PlanCode> = {};
  const pro = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const institution = process.env.STRIPE_PRICE_INSTITUTION_MONTHLY;
  if (pro) {
    map[pro] = "pro";
  }
  if (institution) {
    map[institution] = "institution";
  }
  return map[priceId] ?? null;
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // 配置缺失不能静默 200:那会让真实的 Stripe 事件被默默丢弃且无人察觉。
  // 明确返回 500 配置错误,迫使运维补齐密钥。
  if (!secretKey || !webhookSecret) {
    return NextResponse.json(
      {
        error:
          "Stripe webhook 未正确配置(缺少 STRIPE_SECRET_KEY 或 STRIPE_WEBHOOK_SECRET),拒绝处理。",
      },
      { status: 500 },
    );
  }

  const stripe = new Stripe(secretKey);
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook verification failed." },
      { status: 400 },
    );
  }

  // N2 幂等:Stripe 会重投递同一事件。已处理过的 event.id 直接回 200,
  // 不重复执行业务副作用(setSubscription 虽 upsert 幂等,但 addAuditLog 不是)。
  if (!markStripeEventOnce(event.id)) {
    return NextResponse.json({ ok: true, eventType: event.type, deduplicated: true });
  }

  const repo = getRepository();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.userId;
        if (!userId) {
          break;
        }
        // 权威反查:取本次结账实际计费的 priceId,而非信任 metadata.plan。
        // Checkout Session 默认不含 line_items,需显式拉取。
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
        const priceId = lineItems.data[0]?.price?.id ?? null;
        const plan = planFromPriceId(priceId);
        if (!plan) {
          // priceId 无法映射到已知套餐:不擅自授予,记审计日志并跳过。
          await repo.addAuditLog({
            actorId: userId,
            targetTable: "subscriptions",
            targetId: userId,
            action: "checkout_completed_unmapped_price",
            payload: { priceId, eventId: event.id },
          });
          break;
        }
        await repo.setSubscription({
          userId,
          plan,
          status: "active",
          stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
          stripeSubscriptionId:
            typeof session.subscription === "string" ? session.subscription : null,
        });
        await repo.addAuditLog({
          actorId: userId,
          targetTable: "subscriptions",
          targetId: userId,
          action: "checkout_completed",
          payload: { plan, eventId: event.id },
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) {
          break;
        }
        // 权威反查:从订阅项的 priceId 推导套餐,不信任 metadata.plan。
        const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
        const mappedPlan = planFromPriceId(priceId);
        // deleted 事件即将降级到 free,plan 取值无关紧要;updated 必须映射成功。
        const plan: PlanCode =
          event.type === "customer.subscription.deleted" ? "free" : (mappedPlan ?? "free");
        const status =
          event.type === "customer.subscription.deleted"
            ? "canceled"
            : mapStripeStatus(subscription.status);
        const periodEnd = (subscription as unknown as { current_period_end?: number })
          .current_period_end;
        await repo.setSubscription({
          userId,
          plan,
          status,
          stripeCustomerId:
            typeof subscription.customer === "string" ? subscription.customer : null,
          stripeSubscriptionId: subscription.id,
          currentPeriodEndsAt: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        });
        await repo.addAuditLog({
          actorId: userId,
          targetTable: "subscriptions",
          targetId: userId,
          action: event.type,
          payload: { status, eventId: event.id },
        });
        break;
      }
      default:
        break;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook handler failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, eventType: event.type });
}
