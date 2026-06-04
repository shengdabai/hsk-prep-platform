import { requireApiRole } from "@/lib/api-auth";
import { ok, withApiHandler } from "@/lib/api-response";

export const POST = withApiHandler(async () => {
  const guard = await requireApiRole(["admin"]);
  if ("response" in guard) {
    return guard.response;
  }
  return ok({
    ok: true,
    message: "请使用 apps/web/scripts/import-items.ts 执行 JSON/CSV 导入。",
  });
});
