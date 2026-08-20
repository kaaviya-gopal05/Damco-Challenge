import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, ProgressBar, Button, EmptyState } from '@/components/ui';
import type { CareerProfile } from '@/types/database';

export function CareerProgressCard({
  careerProfile,
  masteredCount,
  totalCount,
}: {
  careerProfile: CareerProfile | undefined;
  masteredCount: number;
  totalCount: number;
}) {
  if (!careerProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Career preparation</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Briefcase}
            title="No career prep started"
            description="Open a space and upload your resume to see your skill gaps and start practicing interview questions."
            action={
              <Link to="/app/spaces">
                <Button size="sm">Go to Spaces</Button>
              </Link>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const trackLabel = careerProfile.target_role ?? 'Career prep';
  const percent = totalCount === 0 ? 0 : Math.round((masteredCount / totalCount) * 100);
  const href = careerProfile.space_id ? `/app/spaces/${careerProfile.space_id}` : '/app/spaces';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Career preparation</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-ink-900">{trackLabel}</p>
        <p className="mt-1 text-sm text-ink-500">
          {masteredCount} of {totalCount} interview questions mastered
        </p>
        <ProgressBar value={percent} className="mt-4" showLabel />
        <Link to={href}>
          <Button variant="outline" size="sm" className="mt-4">
            Continue prep
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
