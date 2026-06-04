import { redirect } from "next/navigation";

import { getRepository } from "@hsk/db";

import { requireUser } from "@/lib/auth";
import { getSessionViewItems } from "@/lib/view-models";
import { SessionRunner } from "@/components/session-runner";
import { SiteShell } from "@/components/site-shell";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await requireUser();
  const repo = getRepository();
  const session = await repo.getSession(sessionId);

  if (!session || session.userId !== user.id) {
    redirect("/practice/mock-exams");
  }

  // HIGH-1:从该会话快照渲染(与 answer/submit API 同源),避免页面用实时题集、
  // 评分用快照导致的不一致。已提交会话用 submitted 视图补回正解/解析。
  const submitted = session.status === "submitted";
  const questions = await getSessionViewItems(session.id, session.setId, submitted);

  return (
    <SiteShell user={user}>
      <SessionRunner
        session={{
          id: session.id,
          setSlug: session.setSlug,
          status: session.status,
          answers: session.answers,
        }}
        questions={questions}
      />
    </SiteShell>
  );
}

