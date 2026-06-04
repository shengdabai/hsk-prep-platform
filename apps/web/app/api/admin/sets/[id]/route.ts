import { getRepository } from "@hsk/db";

import { requireApiRole } from "@/lib/api-auth";
import { fail, ok, withApiHandler } from "@/lib/api-response";
import { safeJson } from "@/lib/auth-validation";
import { patchSetSchema } from "@/lib/api-validation";

export const PATCH = withApiHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireApiRole(["admin"]);
    if ("response" in guard) {
      return guard.response;
    }
    const { user } = guard;

    const { id } = await params;
    const parsed = patchSetSchema.safeParse(await safeJson(request));
    if (!parsed.success) {
      return fail(400, parsed.error.issues[0]?.message ?? "套卷参数不合法。");
    }
    const body = parsed.data;

    const repo = getRepository();
    const set = await repo.patchPracticeSet(id, body);
    if (!set) {
      return fail(404, "套卷不存在。");
    }
    await repo.addAuditLog({
      actorId: user.id,
      targetTable: "practice_sets",
      targetId: id,
      action: "patch_set",
      payload: body,
    });
    return ok({ set });
  },
);
