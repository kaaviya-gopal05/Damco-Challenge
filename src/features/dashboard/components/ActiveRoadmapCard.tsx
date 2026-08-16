import { Link } from 'react-router-dom';
import { Map } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, ProgressBar, Badge, Button, EmptyState } from '@/components/ui';
import type { RoadmapWithContent } from '@/types/database';
import { roadmapProgress } from '@/services/roadmaps.service';

export function ActiveRoadmapCard({ roadmap }: { roadmap: RoadmapWithContent | undefined }) {
  if (!roadmap) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active roadmap</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Map}
            title="No active roadmap yet"
            description="Turn a goal into a structured learning plan in seconds."
            action={
              <Link to="/app/spaces">
                <Button size="sm">Create a roadmap</Button>
              </Link>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const progress = roadmapProgress(roadmap);
  const nextPhase = roadmap.phases.find((p) => p.tasks.some((t) => !t.is_completed)) ?? roadmap.phases[0];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Active roadmap</CardTitle>
        {roadmap.difficulty && <Badge variant="brand">{roadmap.difficulty}</Badge>}
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-ink-900">{roadmap.title}</p>
        {nextPhase && <p className="mt-1 text-sm text-ink-500">Currently in: {nextPhase.title}</p>}
        <ProgressBar value={progress} className="mt-4" showLabel />
        <Link to={roadmap.space_id ? `/app/spaces/${roadmap.space_id}` : '/app/spaces'}>
          <Button variant="outline" size="sm" className="mt-4">
            Continue roadmap
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
