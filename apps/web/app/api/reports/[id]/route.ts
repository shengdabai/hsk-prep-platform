import { getRepository } from "@hsk/db";

import { forbidden, requireApiUser } from "@/lib/api-auth";
import { fail, ok, withApiHandler } from "@/lib/api-response";

export const GET = withApiHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireApiUser();
    if ("response" in guard) {
      return guard.response;
    }
    const { user } = guard;

    const { id } = await params;
    const report = await getRepository().getReport(id);
    if (!report) {
      return fail(404, "报告不存在。");
    }
    // 资源归属校验:只能查看自己的报告。
    if (report.userId !== user.id) {
      return forbidden("无权访问该报告。");
    }
    return ok({ report });
  },
);
