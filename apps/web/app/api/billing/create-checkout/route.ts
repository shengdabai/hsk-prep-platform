import { NextResponse } from "next/server";
import Stripe from "stripe";

import { requireApiUser } from "@/lib/api-auth";
import { createCheckoutSchema, firstIssueMessage, safeJson } from "@/lib/auth-validation";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 5, windowMs: 60_000 }; // 5 次 / 分钟

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  // 按用户限流(已鉴权,优先用 user.id),再叠加 IP 维度兜底。
  const userGate = rateLimit(`checkout:user:${user.id}`, RATE_LIMIT);
  if (!userGate.ok) {
    return tooManyRequests(userGate.retryAfterSeconds);
  }
  const ipGate = rateLimit(`checkout:ip:${clientIp(request)}`, RATE_LIMIT);
  if (!ipGate.ok) {
    return tooManyRequests(ipGate.retryAfterSeconds);
  }

  // 校验请求体(允许空 body)。
  const parsed = createCheckoutSchema.safeParse(await safeJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!secretKey || !priceId) {
    return NextResponse.json({
      ok: false,
      message: "Stripe 未配置,返回接口骨架响应。",
    });
  }

  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${appUrl}/account?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    line_items: [{ price: priceId, quantity: 1 }],
    // 绑定当前用户,webhook 据此把订阅落到正确账户。
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: { userId: user.id, plan: "pro" },
    subscription_data: { metadata: { userId: user.id, plan: "pro" } },
  });

  return NextResponse.json({ ok: true, url: session.url });
}
