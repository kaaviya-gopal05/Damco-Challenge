import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as agentService from '@/services/agentService';
import { notify } from '@/lib/toast';
import { computeNextScanDelayMs } from '@/utils/autoScanSchedule';
import type { EmailMonitoringJob } from '@/features/agents/types';

const AUTO_SCAN_INTERVAL_MS = 30 * 60 * 1000;
const LAST_SCAN_STORAGE_PREFIX = 'ascend:last-email-scan:';

function toastError(fallback: string) {
  return (err: unknown) => notify.error(err instanceof Error ? err.message : fallback);
}

export function useEmailMonitoringJobs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['email-monitoring-jobs', user?.id],
    queryFn: () => agentService.fetchEmailMonitoringJobs(user!.id),
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useDismissEmailJobMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => agentService.dismissEmailJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-monitoring-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['all-email-jobs'] });
    },
    onError: toastError('Could not dismiss that email.'),
  });
}

/** Every non-dismissed, actionable email — backs the dedicated Email page. */
export function useAllEmailJobs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all-email-jobs', user?.id],
    queryFn: () => agentService.fetchAllEmailJobs(user!.id),
    enabled: !!user,
    staleTime: 15_000,
  });
}

function invalidateEmailAndTaskQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['all-email-jobs'] });
  queryClient.invalidateQueries({ queryKey: ['email-monitoring-jobs'] });
  queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
}

/** Scans the inbox for new mail, then immediately classifies it so it shows up right away
 *  rather than waiting for the next visit to the Email page. */
export function useScanAndClassifyEmails() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const scanned = await agentService.scanGmailNow(user!.id);
      if (scanned > 0) await agentService.classifyEmails(user!.id);
      return scanned;
    },
    onSuccess: (scanned) => {
      invalidateEmailAndTaskQueries(queryClient);
      if (scanned === 0) notify.info('No new emails found.');
    },
    onError: toastError('Could not scan your inbox just now.'),
  });
}

export function useCreateTaskFromEmailJob() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (job: EmailMonitoringJob) => agentService.createTaskFromEmailJob(user!.id, job),
    onSuccess: () => {
      invalidateEmailAndTaskQueries(queryClient);
      notify.success('Added to your Task List.');
    },
    onError: toastError('Could not add that to your Task List.'),
  });
}

export function useOrganizeEmailJobsMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobs: EmailMonitoringJob[]) => agentService.organizeEmailJobsIntoTasks(user!.id, jobs),
    onSuccess: (count) => {
      invalidateEmailAndTaskQueries(queryClient);
      notify.success(`Organized ${count} email${count === 1 ? '' : 's'} into tasks.`);
    },
    onError: toastError('Could not organize your emails just now.'),
  });
}

export function useGmailConnectionStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['gmail-connection-status', user?.id],
    queryFn: () => agentService.fetchGmailConnectionStatus(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });
}

/** Runs for as long as the app is open: checks Gmail every ~30 minutes for the 50 most recent
 *  messages and classifies anything new, with no button click required. If nothing new is in the
 *  inbox this is a no-op and the existing email list is left exactly as it was. Mounted once at
 *  the app-shell level (AppLayout) so it keeps running across navigation, not just on the Email
 *  page. Uses localStorage (not React state) to track the last-scan time so a page reload doesn't
 *  reset the 30-minute clock. A true zero-browser-open schedule also exists server-side
 *  (agent-cron-check, wired up via Supabase Dashboard -> Edge Functions -> Schedules) — this hook
 *  is what makes the same behavior work immediately, with no extra setup, whenever the app itself
 *  is open. */
export function useAutoScanEmails() {
  const { user } = useAuth();
  const { data: connection } = useGmailConnectionStatus();
  const queryClient = useQueryClient();
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!user || !connection?.connected) return;

    const storageKey = `${LAST_SCAN_STORAGE_PREFIX}${user.id}`;

    async function runScan() {
      if (isRunningRef.current) return;
      isRunningRef.current = true;
      try {
        const result = await agentService.autoScanAndClassify(user!.id);
        if (result.scanned > 0) {
          queryClient.invalidateQueries({ queryKey: ['all-email-jobs'] });
          queryClient.invalidateQueries({ queryKey: ['email-monitoring-jobs'] });
          queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
        }
      } catch (err) {
        console.error('Background email scan failed:', err);
      } finally {
        localStorage.setItem(storageKey, String(Date.now()));
        isRunningRef.current = false;
      }
    }

    const storedLastScan = localStorage.getItem(storageKey);
    const initialDelay = computeNextScanDelayMs(
      storedLastScan === null ? null : Number(storedLastScan),
      Date.now(),
      AUTO_SCAN_INTERVAL_MS
    );

    const timeoutId = window.setTimeout(runScan, initialDelay);
    const intervalId = window.setInterval(runScan, AUTO_SCAN_INTERVAL_MS);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [user, connection?.connected, queryClient]);
}
