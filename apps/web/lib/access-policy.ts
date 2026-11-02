import { canAccessSet } from "@hsk/shared";
import type { PlanCode, Subscription, UserRole } from "@hsk/shared";

// Publishing is an admin decision, the same rule as the "content items publish admin only" database policy.
export function mayPatchItem(role: UserRole, patch: { publishStatus?: unknown }): boolean {
  return role === "admin" || patch.publishStatus === undefined;
}

export type ExamAccess = "allow" | "sign_in" | "upgrade";

// A free exam is open to everyone. A paid exam's questions need a signed-in user with a paid plan,
// the same rule that starting a session applies.
export function examAccess(
  required: PlanCode,
  signedIn: boolean,
  subscription: Subscription | null | undefined,
): ExamAccess {
  if (required === "free") return "allow";
  if (!signedIn) return "sign_in";
  return canAccessSet(required, subscription) ? "allow" : "upgrade";
}
