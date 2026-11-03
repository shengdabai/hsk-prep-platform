import { getRepository } from "@hsk/db";

import { examAccess } from "@/lib/access-policy";
import { getApiUser } from "@/lib/api-auth";
import { fail, ok, withApiHandler } from "@/lib/api-response";

export const GET = withApiHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const repo = getRepository();
    const exam = await repo.getMockExamById(id);
    if (!exam) {
      return fail(404, "模考不存在。");
    }
    const user = exam.access === "free" ? null : await getApiUser();
    const subscription = user ? await repo.getSubscription(user.id) : null;
    const access = examAccess(exam.access, Boolean(user), subscription);
    if (access === "sign_in") {
      return fail(401, "请先登录。");
    }
    if (access === "upgrade") {
      return fail(403, "该内容需要订阅后才能查看,请前往价格页升级。");
    }
    const items = await repo.getPublishedItemsForSet(exam.id);
    return ok({
      exam: {
        ...exam,
        items: items.map((item) => ({
          id: item.id,
          levelCode: item.levelCode,
          sectionCode: item.sectionCode,
          questionTypeCode: item.questionTypeCode,
          title: item.title,
          stem: item.stem,
          prompt: item.prompt,
          // 答题加载阶段不下发 explanation(含"正确答案是…"会泄题);解析仅在提交后接口返回。
          reviewStatus: item.reviewStatus,
          publishStatus: item.publishStatus,
          sourceType: item.sourceType,
          copyrightCleared: item.copyrightCleared,
          options: item.options,
          tags: item.tags,
        })),
      },
    });
  },
);
