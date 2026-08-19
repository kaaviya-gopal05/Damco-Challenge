import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, RefreshCw, Sparkles, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Badge, EmptyState, SkeletonList, Skeleton, Card, CardContent, Modal } from '@/components/ui';
import {
  useAllEmailJobs,
  useCreateTaskFromEmailJob,
  useDismissEmailJobMutation,
  useGmailConnectionStatus,
  useOrganizeEmailJobsMutation,
  useScanAndClassifyEmails,
} from '@/hooks/useAgents';
import { getAiService } from '@/services/ai.service';
import type { EmailMonitoringJob, EmailUrgency } from '@/features/agents/types';

const URGENCY_BADGE: Record<EmailUrgency, 'danger' | 'warning' | 'success'> = {
  high: 'danger',
  medium: 'warning',
  low: 'success',
};

function EmailSummaryModal({ job, onClose }: { job: EmailMonitoringJob; onClose: () => void }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getAiService()
      .summarizeDocument(job.snippet ?? '', job.subject ?? 'Email')
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch(() => {
        if (!cancelled) setError('Could not summarize this email just now.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [job.id, job.snippet, job.subject]);

  return (
    <Modal isOpen onClose={onClose} title={job.subject || '(no subject)'} description={job.sender ?? undefined}>
      <div className="flex flex-col gap-3">
        {job.urgency && (
          <Badge variant={URGENCY_BADGE[job.urgency]} className="w-fit">
            {job.urgency} priority
          </Badge>
        )}
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : (
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{summary}</p>
        )}
      </div>
    </Modal>
  );
}

function EmailCard({ job, onOpen }: { job: EmailMonitoringJob; onOpen: (job: EmailMonitoringJob) => void }) {
  const createTask = useCreateTaskFromEmailJob();
  const dismissJob = useDismissEmailJobMutation();

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <button type="button" onClick={() => onOpen(job)} className="flex flex-col gap-2 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">{job.subject || '(no subject)'}</p>
              <p className="truncate text-xs text-ink-400">{job.sender ?? 'Unknown sender'}</p>
            </div>
            {job.urgency && (
              <Badge variant={URGENCY_BADGE[job.urgency]} className="shrink-0">
                {job.urgency}
              </Badge>
            )}
          </div>

          <p className="text-sm text-ink-700">{job.learningGoal}</p>
          {job.context && <p className="text-xs text-ink-400">{job.context}</p>}
        </button>

        <div className="mt-1 flex items-center gap-2">
          <Button
            size="sm"
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            isLoading={createTask.isPending && createTask.variables?.id === job.id}
            onClick={() => createTask.mutate(job)}
          >
            Add to Task List
          </Button>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<X className="h-3.5 w-3.5" />}
            isLoading={dismissJob.isPending && dismissJob.variables === job.id}
            onClick={() => dismissJob.mutate(job.id)}
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmailPage() {
  const { data: connection, isLoading: connectionLoading } = useGmailConnectionStatus();
  const { data: jobs, isLoading: jobsLoading } = useAllEmailJobs();
  const scanAndClassify = useScanAndClassifyEmails();
  const organizeAll = useOrganizeEmailJobsMutation();
  const [openJob, setOpenJob] = useState<EmailMonitoringJob | null>(null);

  const isLoading = connectionLoading || jobsLoading;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Email"
        description="Scheduling, exams, interviews, and deadlines Email Monitor found in your inbox — everything else is filtered out."
        actions={
          connection?.connected ? (
            <>
              <Button
                variant="outline"
                leftIcon={<RefreshCw className="h-4 w-4" />}
                isLoading={scanAndClassify.isPending}
                onClick={() => scanAndClassify.mutate()}
              >
                Scan Inbox
              </Button>
              <Button
                leftIcon={<Sparkles className="h-4 w-4" />}
                isLoading={organizeAll.isPending}
                disabled={!jobs || jobs.length === 0}
                onClick={() => organizeAll.mutate(jobs ?? [])}
              >
                Organize into Tasks
              </Button>
            </>
          ) : undefined
        }
      />

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : !connection?.connected ? (
        <EmptyState
          icon={Mail}
          title="Gmail isn't connected yet"
          description="Connect Gmail in Settings and Email Monitor will start picking up learning goals and to-dos from your inbox automatically."
          action={
            <Link to="/app/settings">
              <Button size="sm">Go to Settings</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-1.5 text-xs text-ink-400">
            <RefreshCw className="h-3.5 w-3.5" />
            Automatically checks your 50 most recent emails every 30 minutes — important mail
            (interviews, exams, deadlines) surfaces first. Click Scan Inbox for an immediate check.
          </div>

          {!jobs || jobs.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="Nothing actionable right now"
              description="Email Monitor checks your inbox automatically every 30 minutes — anything about scheduling, exams, interviews, or deadlines will show up here. Click Scan Inbox for an immediate check. Newsletters and receipts are filtered out automatically."
              action={
                <Button size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} isLoading={scanAndClassify.isPending} onClick={() => scanAndClassify.mutate()}>
                  Scan Inbox
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <EmailCard key={job.id} job={job} onOpen={setOpenJob} />
              ))}
            </div>
          )}
        </>
      )}

      {openJob && <EmailSummaryModal job={openJob} onClose={() => setOpenJob(null)} />}
    </div>
  );
}
