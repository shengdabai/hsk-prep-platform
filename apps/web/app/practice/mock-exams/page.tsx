import Link from "next/link";

import { getRepository } from "@hsk/db";

import { getCurrentUser } from "@/lib/auth";
import { SiteShell, SectionTitle } from "@/components/site-shell";

export default async function MockExamsPage() {
  const user = await getCurrentUser();
  const exams = await getRepository().getMockExams();

  return (
    <SiteShell user={user}>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:px-10">
        <SectionTitle
          eyebrow="Mock exams"
          title="HSK1 模考列表"
          body="免费用户可以进入免费体验卷，注册用户可以开始完整做题流程。"
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => (
            <Link key={exam.id} href={`/practice/mock-exams/${exam.slug}`} className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="text-2xl font-semibold">{exam.title}</div>
                <div className="rounded-full bg-stone-100 px-3 py-1 text-xs uppercase tracking-[0.18em] text-stone-600">
                  {exam.access}
                </div>
              </div>
              <p className="mt-4 text-base leading-7 text-stone-600">{exam.description}</p>
              <div className="mt-4 text-sm text-stone-500">{exam.minutes} 分钟</div>
            </Link>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}

