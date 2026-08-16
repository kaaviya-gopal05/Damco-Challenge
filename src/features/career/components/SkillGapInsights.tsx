import { CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { Card, CardContent, EmptyState } from '@/components/ui';
import type { ResumeAnalysisResult } from '@/types/database';

export function SkillGapInsights({ analysis, roleLabel }: { analysis: ResumeAnalysisResult | null; roleLabel: string }) {
  if (!analysis) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No skill gap analysis yet"
        description={`Upload your resume above to generate your strengths and skill gaps for ${roleLabel}.`}
      />
    );
  }

  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Strengths</p>
          <ul className="flex flex-col gap-2.5">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Skill gaps for {roleLabel}</p>
          <ul className="flex flex-col gap-2.5">
            {analysis.gaps.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                {g}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
