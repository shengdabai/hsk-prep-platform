import { randomUUID } from "node:crypto";

import { getRepository } from "@hsk/db";

import { requireApiRole } from "@/lib/api-auth";
import { fail, ok, withApiHandler } from "@/lib/api-response";
import { safeJson } from "@/lib/auth-validation";
import { createSetSchema } from "@/lib/api-validation";

export const POST = withApiHandler(async (request: Request) => {
  const guard = await requireApiRole(["admin"]);
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  const parsed = createSetSchema.safeParse(await safeJson(request));
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message ?? "套卷参数不合法。");
  }
  const body = parsed.data;

  const repo = getRepository();
  const set = await repo.createPracticeSet({
    ...body,
    id: body.id ?? randomUUID(),
  });
  await repo.addAuditLog({
    actorId: user.id,
    targetTable: "practice_sets",
    targetId: set.id,
    action: "create_set",
    payload: { slug: set.slug },
  });
  return ok({ set });
});
