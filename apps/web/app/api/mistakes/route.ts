import { getRepository } from "@hsk/db";

import { requireApiUser } from "@/lib/api-auth";
import { ok, parsePagination, withApiHandler } from "@/lib/api-response";

export const GET = withApiHandler(async (request: Request) => {
  const guard = await requireApiUser();
  if ("response" in guard) {
    return guard.response;
  }
  const { user } = guard;

  // 列表端点分页上界:防止错题量大时无界拉全表(底层 repo 全量取,此处切片兜底)。
  const { limit, offset } = parsePagination(request, { defaultLimit: 100, maxLimit: 200 });
  const all = await getRepository().getMistakes(user.id);
  return ok({ mistakes: all.slice(offset, offset + limit), total: all.length });
});
