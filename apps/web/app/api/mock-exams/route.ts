import { getRepository } from "@hsk/db";

import { ok, parsePagination, withApiHandler } from "@/lib/api-response";

export const GET = withApiHandler(async (request: Request) => {
  // 列表端点分页上界:防止模考量大时无界拉全表(底层 repo 全量取,此处切片兜底)。
  const { limit, offset } = parsePagination(request, { defaultLimit: 100, maxLimit: 200 });
  const all = await getRepository().getMockExams();
  return ok({ exams: all.slice(offset, offset + limit), total: all.length });
});
