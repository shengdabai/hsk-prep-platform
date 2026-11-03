import { requireApiRole } from "@/lib/api-auth";
import { fail, withApiHandler } from "@/lib/api-response";

export const POST = withApiHandler(async () => {
  const guard = await requireApiRole(["admin"]);
  if ("response" in guard) {
    return guard.response;
  }
  // This route imports nothing, so it must not answer as if it had.
  return fail(501, "请使用 apps/web/scripts/import-items.ts 执行 JSON/CSV 导入。");
});
