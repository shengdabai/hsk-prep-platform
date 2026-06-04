import { getRepository } from "@hsk/db";

import { requireApiUser } from "@/lib/api-auth";
import { fail, ok, withApiHandler } from "@/lib/api-response";
import { safeJson } from "@/lib/auth-validation";
import { reviewMistakeSchema } from "@/lib/api-validation";

export const POST = withApiHandler(async (request: Request) => {
  const guard = await requireApiUser();
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  const parsed = reviewMistakeSchema.safeParse(await safeJson(request));
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message ?? "请求参数不合法。");
  }
  const { itemId, grade } = parsed.data;

  const repo = getRepository();

  // 归属校验:reviewMistake 内部已按 userId + itemId 查找,不存在则返回 null。
  const updated = await repo.reviewMistake(user.id, itemId, grade);

  if (!updated) {
    return fail(404, "未找到该错题，或它不属于当前用户。");
  }

  return ok({ mistake: updated });
});
