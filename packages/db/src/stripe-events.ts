import type { Repository } from "./types";
import { createSupabaseAdminClient } from "./supabase";

export type StripeEventInput = {
  eventId: string;
  created: number;
  userId: string;
  action: string;
  subscription: Parameters<Repository["setSubscription"]>[0] | null;
};

// No mock fallback: acknowledging a payment requires durable storage.
export async function applyStripeEvent(input: StripeEventInput): Promise<string> {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.rpc("apply_stripe_event", {
    p_event_id: input.eventId,
    p_created: input.created,
    p_user_id: input.userId,
    p_action: input.action,
    p_subscription: input.subscription,
  });
  if (error || !["applied", "duplicate", "stale"].includes(data ?? "")) {
    throw new Error("Stripe event transaction failed.");
  }
  return data!;
}
