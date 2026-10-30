import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(), listLineItems: vi.fn(), applyStripeEvent: vi.fn(),
  setSubscription: vi.fn(), addAuditLog: vi.fn(),
}));
vi.mock("stripe", () => ({ default: class {
  webhooks = { constructEvent: mocks.constructEvent };
  checkout = { sessions: { listLineItems: mocks.listLineItems } };
} }));
vi.mock("@hsk/db", () => ({
  applyStripeEvent: mocks.applyStripeEvent,
  getRepository: () => mocks,
}));

import { POST } from "../../../apps/web/app/api/billing/webhook/route";

let sequence = 0;
function event(type = "checkout.session.completed") {
  return { id: `evt_fixture_${++sequence}`, created: 200, type, data: { object: {
    id: "cs_fixture", mode: "subscription", payment_status: "paid",
    client_reference_id: "fixture-user", metadata: { userId: "fixture-user", plan: "institution" },
    customer: "cus_fixture", subscription: "sub_fixture", status: "active",
    items: { data: [{ price: { id: "price_pro_fixture" }, current_period_end: 300 }] },
  } } };
}
function request(signature = "fixture-signature") {
  return new Request("https://example.invalid/api/billing/webhook", {
    method: "POST", body: "fixture-body",
    headers: signature ? { "stripe-signature": signature } : {},
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "fixture-key");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "fixture-webhook");
  vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY", "price_pro_fixture");
  vi.stubEnv("STRIPE_PRICE_INSTITUTION_MONTHLY", "price_institution_fixture");
  mocks.constructEvent.mockReturnValue(event());
  mocks.listLineItems.mockResolvedValue({ data: [{ price: { id: "price_pro_fixture" } }] });
  mocks.applyStripeEvent.mockResolvedValue("applied");
});

afterEach(() => vi.unstubAllEnvs());

describe("Stripe webhook boundary (no network or credentials)", () => {
  it("retries the same event after a failed transaction instead of acknowledging it", async () => {
    mocks.setSubscription.mockRejectedValueOnce(new Error("database failure"));
    mocks.applyStripeEvent.mockRejectedValueOnce(new Error("database failure"));
    expect((await POST(request())).status).toBe(500);
    const retried = await POST(request());
    expect(retried.status).toBe(200);
    expect(await retried.json()).not.toHaveProperty("deduplicated", true);
    expect(mocks.applyStripeEvent).toHaveBeenCalledTimes(2);
  });
  it("also retries after a Stripe line-item lookup failure", async () => {
    mocks.listLineItems.mockRejectedValueOnce(new Error("lookup failure"));
    expect((await POST(request())).status).toBe(500);
    expect((await POST(request())).status).toBe(200);
    expect(mocks.listLineItems).toHaveBeenCalledTimes(2);
    expect(mocks.applyStripeEvent).toHaveBeenCalledTimes(1);
  });
  it("does not suppress a concurrent delivery when the first transaction fails", async () => {
    mocks.applyStripeEvent.mockRejectedValueOnce(new Error("transaction aborted"));
    const responses = await Promise.all([POST(request()), POST(request())]);
    expect(responses.map((response) => response.status)).toEqual([500, 200]);
    expect(mocks.applyStripeEvent).toHaveBeenCalledTimes(2);
  });
  it.each(["duplicate", "stale"])("acknowledges a durable %s decision", async (result) => {
    mocks.applyStripeEvent.mockResolvedValue(result);
    expect(await (await POST(request())).json()).toMatchObject({ ok: true, result });
  });
  it("uses the billed price rather than metadata and sends one atomic operation", async () => {
    await POST(request());
    expect(mocks.applyStripeEvent).toHaveBeenCalledWith(expect.objectContaining({
      created: 200, userId: "fixture-user", action: "checkout_completed",
      subscription: expect.objectContaining({ plan: "pro", status: "active" }),
    }));
    expect(mocks.setSubscription).not.toHaveBeenCalled();
    expect(mocks.addAuditLog).not.toHaveBeenCalled();
  });
  it("does not grant access for an unpaid checkout", async () => {
    const input = event(); input.data.object.payment_status = "unpaid";
    mocks.constructEvent.mockReturnValue(input);
    expect((await POST(request())).status).toBe(200);
    expect(mocks.applyStripeEvent).not.toHaveBeenCalled();
    expect(mocks.setSubscription).not.toHaveBeenCalled();
  });
  it("handles the later asynchronous payment confirmation", async () => {
    mocks.constructEvent.mockReturnValue(event("checkout.session.async_payment_succeeded"));
    await POST(request());
    expect(mocks.applyStripeEvent).toHaveBeenCalledTimes(1);
  });
  it("records an unknown checkout price without granting a subscription", async () => {
    mocks.listLineItems.mockResolvedValue({ data: [] });
    await POST(request());
    expect(mocks.applyStripeEvent).toHaveBeenCalledWith(expect.objectContaining({
      subscription: null, action: "checkout_completed_unmapped_price",
    }));
  });
  it.each(["customer.subscription.updated", "customer.subscription.deleted"])(
    "maps %s and uses the item-level billing period", async (type) => {
      const input = event(type); input.data.object.id = "sub_fixture";
      mocks.constructEvent.mockReturnValue(input);
      await POST(request());
      expect(mocks.applyStripeEvent).toHaveBeenCalledWith(expect.objectContaining({
        action: type, subscription: expect.objectContaining({
          stripeSubscriptionId: "sub_fixture",
          currentPeriodEndsAt: "1970-01-01T00:05:00.000Z",
          plan: type.endsWith("deleted") ? "free" : "pro",
          status: type.endsWith("deleted") ? "canceled" : "active",
        }),
      }));
    },
  );
  it("rejects missing configuration, signature and invalid signature before writes", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect((await POST(request())).status).toBe(500);
    vi.stubEnv("STRIPE_SECRET_KEY", "fixture-key");
    expect((await POST(request(""))).status).toBe(400);
    mocks.constructEvent.mockImplementation(() => { throw new Error("private signature detail"); });
    const invalid = await POST(request());
    expect(invalid.status).toBe(400);
    expect(await invalid.text()).not.toContain("private signature detail");
    expect(mocks.applyStripeEvent).not.toHaveBeenCalled();
  });
  it("does not disclose internal database errors", async () => {
    mocks.applyStripeEvent.mockRejectedValue(new Error("private database detail"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private database detail");
  });
});
