import { getRepository } from "@hsk/db";

import { requireApiRole } from "@/lib/api-auth";
import { fail, ok, withApiHandler } from "@/lib/api-response";
import { safeJson } from "@/lib/auth-validation";
import { patchAdminItemSchema } from "@/lib/api-validation";

export const PATCH = withApiHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireApiRole(["reviewer", "admin"]);
    if ("response" in guard) {
      return guard.response;
    }
    const { user } = guard;

    const { id } = await params;
    const parsed = patchAdminItemSchema.safeParse(await safeJson(request));
    if (!parsed.success) {
      return fail(400, parsed.error.issues[0]?.message ?? "请求参数不合法。");
    }
    const patch = parsed.data;

    const repo = getRepository();
    const item = await repo.patchAdminItem(id, patch);
    if (!item) {
      return fail(404, "题目不存在。");
    }
    await repo.addAuditLog({
      actorId: user.id,
      targetTable: "content_items",
      targetId: id,
      action: "patch_item",
      payload: patch,
    });
    return ok({ item });
  },
);
