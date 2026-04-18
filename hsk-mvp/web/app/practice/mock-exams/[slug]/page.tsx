import { notFound } from "next/navigation";

import { StartSessionButton } from "@/components/start-session-button";
import { SiteShell } from "@/components/site-shell";
import { getCurrentUser } from "@/lib/auth";
import { getMockExamBySlug, getQuestionsByIds } from "@/lib/hsk-content";

export default async function MockExamDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const exam = getMockExamBySlug(slug);

  if (!exam) {
    notFound();
  }

  const questions = getQuestionsByIds(exam.questionIds);
  const canStart = exam.access === "free" || Boolean(user && user.plan !== "free");
  const needsLogin = !user && exam.access !== "free";

  return (
    <SiteShell user={user}>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_360px] lg:px-10">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Mock exam detail</div>
            <h1 className="text-5xl font-semibold tracking-tight text-stone-950">{exam.title}</h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-600">{exam.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["考试时长", "40 分钟"],
              ["总题数", `${questions.length} 题`],
              ["访问等级", exam.access === "free" ? "Free" : "Pro"],
              ["推荐场景", exam.recommendedFor],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.8rem] border border-stone-900/10 bg-white/75 p-5">
                <div className="text-xs uppercase tracking-[0.26em] text-stone-500">{label}</div>
                <div className="mt-3 text-2xl font-semibold">{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-6">
            <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Paper structure</div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].flatMap((part) => [
                { section: "听力", part },
                { section: "阅读", part },
              ]).map((entry) => (
                <div key={`${entry.section}-${entry.part}`} className="border-b border-stone-900/10 pb-3">
                  <div className="text-lg font-medium">{entry.section} Part {entry.part}</div>
                  <div className="mt-1 text-sm text-stone-500">
                    {questions.filter((item) => item.section === entry.section && item.part === entry.part).length} 题
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-stone-900/10 bg-[#1f160e] p-7 text-[#f6ecde]">
          <div className="text-xs uppercase tracking-[0.28em] text-white/55">Ready to start</div>
          <div className="mt-3 text-3xl font-semibold">整卷流程</div>
          <p className="mt-4 text-sm leading-7 text-white/70">
            登录后开始答题。所有答案在服务端评分，错题会自动进入错题本。
          </p>
          <div className="mt-7">
            <StartSessionButton sourceKind="mock_exam" sourceSlug={exam.slug} allowed={canStart} needsLogin={needsLogin} />
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}

