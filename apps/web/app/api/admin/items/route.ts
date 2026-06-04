import { getRepository } from "@hsk/db";

import { requireApiRole } from "@/lib/api-auth";
import { ok, parsePagination, withApiHandler } from "@/lib/api-response";

export const GET = withApiHandler(async (request: Request) => {
  const guard = await requireApiRole(["reviewer", "admin"]);
  if ("response" in guard) {
    return guard.response;
  }
  // 列表端点分页上界:题库量大时无界拉全表会产生大响应/慢页(底层 repo 全量取,此处切片兜底)。
  const { limit, offset } = parsePagination(request, { defaultLimit: 100, maxLimit: 200 });
  const all = await getRepository().listAdminItems();
  return ok({ items: all.slice(offset, offset + limit), total: all.length });
});
