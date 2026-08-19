import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Sparkles, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, EmptyState } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useDismissEmailJobMutation, useEmailMonitoringJobs } from '@/hooks/useAgents';
import { generateAndCreateRoadmap } from '@/services/roadmaps.service';
import { attachToNewSpace } from '@/services/spaces.service';
import { notify } from '@/lib/toast';
import type { EmailUrgency } from '@/features/agents/types';

const URGENCY_BADGE: Record<EmailUrgency, 'danger' | 'warning' | 'neutral'> = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
};

export function EmailMonitoringWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: jobs, isLoading } = useEmailMonitoringJobs();
  const dismissJob = useDismissEmailJobMutation();
  const [learningJobId, setLearningJobId] = useState<string | null>(null);

  async function handleLearnThis(jobId: string, learningGoal: string) {
    if (!user) return;
    setLearningJobId(jobId);
    try {
      const roadmap = await generateAndCreateRoadmap({ userId: user.id, goal: learningGoal });
      const space = await attachToNewSpace(user.id, 'roadmaps', roadmap.id, roadmap.title, learningGoal);
      dismissJob.mutate(jobId);
      navigate(`/app/spaces/${space.id}`);
    } catch {
      notify.error('Could not generate a roadmap for that just now.');
    } finally {
      setLearningJobId(null);
    }
  }

  if (isLoading) return null;
  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email-detected learning goals</CardTitle>
          <CardDescription>Email Monitor watches your inbox for learning signals.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Mail}
            title="Nothing detected yet"
            description="Connect Gmail in Settings, and Email Monitor will surface learning goals it finds in your inbox here."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email-detected learning goals</CardTitle>
        <CardDescription>Found by Email Monitor — turn one into a roadmap or dismiss it.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {jobs.map((job) => (
            <div key={job.id} className="flex flex-col gap-2 rounded-xl border border-ink-200/70 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">{job.learningGoal}</p>
                  <p className="truncate text-xs text-ink-400">
                    {job.sender ?? 'Unknown sender'} · {job.subject ?? '(no subject)'}
                  </p>
                </div>
                {job.urgency && (
                  <Badge variant={URGENCY_BADGE[job.urgency]} className="shrink-0">
                    {job.urgency}
                  </Badge>
                )}
              </div>
              {job.context && <p className="text-xs text-ink-500">{job.context}</p>}
              <div className="mt-1 flex items-center gap-2">
                <Button
                  size="sm"
                  leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                  isLoading={learningJobId === job.id}
                  onClick={() => handleLearnThis(job.id, job.learningGoal!)}
                >
                  Learn This
                </Button>
                <Button size="sm" variant="ghost" leftIcon={<X className="h-3.5 w-3.5" />} onClick={() => dismissJob.mutate(job.id)}>
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
