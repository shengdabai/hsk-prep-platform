import type { ReportDimensionBucket, ReportDimensions } from "@hsk/shared";

// Pure CSS/SVG bar charts — no charting library.

function BarRow({
  label,
  correct,
  total,
}: {
  label: string;
  correct: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const color =
    pct >= 80
      ? "var(--brand)"
      : pct >= 50
        ? "#d97706"
        : "#dc2626";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm text-stone-700">
        <span className="max-w-[60%] truncate">{label}</span>
        <span className="tabular-nums text-stone-500">
          {correct}/{total}&nbsp;
          <span style={{ color }} className="font-medium">
            {pct}%
          </span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function DimensionSection({
  title,
  buckets,
  labelMap,
}: {
  title: string;
  buckets: ReportDimensionBucket[];
  labelMap?: Record<string, string>;
}) {
  if (!buckets || buckets.length === 0) return null;
  const sorted = [...buckets].sort((a, b) => b.total - a.total);

  return (
    <div className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-6">
      <div className="text-xs uppercase tracking-[0.28em] text-stone-500">
        {title}
      </div>
      <div className="mt-5 space-y-4">
        {sorted.map((b) => (
          <BarRow
            key={b.key}
            label={labelMap?.[b.key] ?? b.key}
            correct={b.correct}
            total={b.total}
          />
        ))}
      </div>
    </div>
  );
}

const SECTION_LABELS: Record<string, string> = {
  listening: "听力",
  reading: "阅读",
  writing: "书写",
  speaking: "口语",
  translation: "翻译",
};

export function ReportCharts({
  dimensions,
}: {
  dimensions: ReportDimensions | undefined;
}) {
  if (!dimensions) return null;

  const hasSomething =
    (dimensions.bySection?.length ?? 0) > 0 ||
    (dimensions.byQuestionType?.length ?? 0) > 0 ||
    (dimensions.byTag?.length ?? 0) > 0;

  if (!hasSomething) return null;

  return (
    <div className="space-y-6">
      <DimensionSection
        title="按技能"
        buckets={dimensions.bySection ?? []}
        labelMap={SECTION_LABELS}
      />
      <DimensionSection
        title="按题型"
        buckets={dimensions.byQuestionType ?? []}
      />
      <DimensionSection
        title="按知识点"
        buckets={dimensions.byTag ?? []}
      />
    </div>
  );
}
