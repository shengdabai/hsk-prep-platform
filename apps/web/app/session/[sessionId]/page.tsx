import { redirect } from "next/navigation";

import { getRepository } from "@hsk/db";

import { requireUser } from "@/lib/auth";
import { getSanitizedSetItems } from "@/lib/view-models";
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

  const questions = await getSanitizedSetItems(session.setId);

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

