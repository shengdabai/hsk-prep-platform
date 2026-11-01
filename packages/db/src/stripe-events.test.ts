import { beforeEach, expect, it, vi } from "vitest";
const { rpc, createClient } = vi.hoisted(() => ({ rpc: vi.fn(), createClient: vi.fn() }));
vi.mock("./supabase", () => ({ createSupabaseAdminClient: createClient }));
import { applyStripeEvent } from "./stripe-events";

const input = {
  eventId: "evt_fixture", created: 200, userId: "fixture-user",
  action: "checkout_completed", subscription: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  createClient.mockReturnValue({ rpc });
});
it.each(["applied", "duplicate", "stale"])("returns the transaction's %s outcome", async (data) => {
  rpc.mockResolvedValue({ data, error: null });
  expect(await applyStripeEvent(input)).toBe(data);
  expect(rpc).toHaveBeenCalledWith("apply_stripe_event", {
    p_event_id: input.eventId, p_created: 200, p_user_id: input.userId,
    p_action: input.action, p_subscription: null,
  });
});
it.each([
  { data: null, error: { message: "private database detail" } },
  { data: null, error: null },
  { data: "unexpected", error: null },
])("rejects failed or invalid transaction results", async (result) => {
  rpc.mockResolvedValue(result);
  await expect(applyStripeEvent(input)).rejects.toThrow("Stripe event transaction failed.");
});
it("does not fall back to mock storage when configuration is missing", async () => {
  createClient.mockImplementation(() => { throw new Error("missing configuration"); });
  await expect(applyStripeEvent(input)).rejects.toThrow("missing configuration");
  expect(rpc).not.toHaveBeenCalled();
});
