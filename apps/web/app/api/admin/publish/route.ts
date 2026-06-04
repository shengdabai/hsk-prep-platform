import { getRepository } from "@hsk/db";

import { requireApiRole } from "@/lib/api-auth";
import { fail, ok, withApiHandler } from "@/lib/api-response";
import { safeJson } from "@/lib/auth-validation";
import { publishItemSchema } from "@/lib/api-validation";

export const POST = withApiHandler(async (request: Request) => {
  // 发布 / 下架仅限 admin。
  const guard = await requireApiRole(["admin"]);
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  const parsed = publishItemSchema.safeParse(await safeJson(request));
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message ?? "缺少 itemId 或 publishStatus。");
  }
  const { itemId, publishStatus } = parsed.data;

  const repo = getRepository();
  const item = await repo.publishItem(itemId, publishStatus);
  if (!item) {
    return fail(404, "题目不存在。");
  }
  await repo.addAuditLog({
    actorId: user.id,
    targetTable: "content_items",
    targetId: itemId,
    action: "publish",
    payload: { publishStatus },
  });
  return ok({ item });
});
