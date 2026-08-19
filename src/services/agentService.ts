import { addDays, format } from 'date-fns';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { classifyError, runWithRetry } from '@/utils/agentErrorHandler';
import { createSpace } from '@/services/spaces.service';
import { createTaskFromEmail } from '@/services/tasks.service';
import type { EmailMonitoringJob, GmailConnectionStatus, GmailMessage } from '@/features/agents/types';
import type { Space, TodoTask } from '@/types/database';

const EMAIL_TASKS_SPACE_TITLE = 'Email';

function mapEmailJob(row: Record<string, unknown>): EmailMonitoringJob {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    gmailMessageId: row.gmail_message_id as string,
    sender: (row.sender as string) ?? null,
    subject: (row.subject as string) ?? null,
    snippet: (row.snippet as string) ?? null,
    learningGoal: (row.learning_goal as string) ?? null,
    urgency: (row.urgency as EmailMonitoringJob['urgency']) ?? null,
    confidence: (row.confidence as number) ?? null,
    context: (row.context as string) ?? null,
    suggestedActions: (row.suggested_actions as string[]) ?? [],
    roadmapId: (row.roadmap_id as string) ?? null,
    isDismissed: Boolean(row.is_dismissed),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * supabase-js's FunctionsHttpError.message is always the generic "Edge Function returned a
 * non-2xx status code" — the actual error text our edge functions return in their JSON body
 * (e.g. "Gmail is not connected for this account.") only lives on `error.context`, the raw,
 * not-yet-read Response object. Every functions.invoke() call site must unwrap this or the
 * learner only ever sees that one generic sentence, no matter what really failed.
 */
async function resolveInvokeError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await (error.context as Response).clone().json();
      if (body?.error) return new Error(body.error);
    } catch {
      // Response body wasn't JSON (or already consumed) — fall through to the generic error.
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}

/** Classifies whatever emails are sitting unclassified from a prior scan. */
export async function classifyEmails(userId: string): Promise<{ scanned: number; detected: number }> {
  return runWithRetry(async () => {
    const { data, error } = await supabase.functions.invoke('classify-emails', { body: { userId } });
    if (error) throw classifyError(await resolveInvokeError(error));
    const result = data as { scanned?: number; detected?: number } | null;
    return { scanned: result?.scanned ?? 0, detected: result?.detected ?? 0 };
  });
}

const URGENCY_RANK: Record<NonNullable<EmailMonitoringJob['urgency']>, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Most urgent first (high, medium, low), most recent first within the same urgency — so a
 *  learner sees the interview scheduled for tomorrow before a low-priority reminder from last
 *  week, matching how the Email page is meant to read: important things surface, not just recent
 *  ones. Sorted client-side since the row count here (a handful to 50) makes it cheap. */
function sortByUrgencyThenRecency(jobs: EmailMonitoringJob[]): EmailMonitoringJob[] {
  return [...jobs].sort((a, b) => {
    const rankDiff = URGENCY_RANK[a.urgency ?? 'low'] - URGENCY_RANK[b.urgency ?? 'low'];
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/** Only emails the agent decided are genuinely actionable (scheduling, exams, interviews,
 *  deadlines, etc.) — an email classified as having no learning/task implication is stored with
 *  learning_goal left null and never surfaces here. That's a deliberate signal-over-noise choice:
 *  a learner's inbox has far more newsletters and receipts than real to-dos, so nothing shows up
 *  in the app until the agent has actually decided it's worth their attention. */
export async function fetchEmailMonitoringJobs(userId: string, limit = 5): Promise<EmailMonitoringJob[]> {
  const { data, error } = await supabase
    .from('email_monitoring_jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_dismissed', false)
    .not('learning_goal', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return sortByUrgencyThenRecency((data ?? []).map(mapEmailJob));
}

/** Same actionable-only filter as fetchEmailMonitoringJobs, just without the Dashboard widget's
 *  5-item cap — this is what backs the full Email page. */
export async function fetchAllEmailJobs(userId: string, limit = 50): Promise<EmailMonitoringJob[]> {
  return fetchEmailMonitoringJobs(userId, limit);
}

export async function dismissEmailJob(jobId: string): Promise<void> {
  const { error } = await supabase.from('email_monitoring_jobs').update({ is_dismissed: true }).eq('id', jobId);
  if (error) throw error;
}

/** Builds the Google OAuth consent URL — pure so it's testable without touching window.location. */
export function buildGmailAuthUrl(redirectUri: string): string {
  const clientId = import.meta.env.VITE_GMAIL_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error('Gmail is not configured (missing VITE_GMAIL_CLIENT_ID).');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function connectGmailAccount(redirectUri: string): void {
  window.location.assign(buildGmailAuthUrl(redirectUri));
}

export async function completeGmailOAuth(code: string, redirectUri: string): Promise<GmailConnectionStatus> {
  const { data, error } = await supabase.functions.invoke('gmail-oauth-callback', { body: { code, redirectUri } });
  if (error) throw classifyError(await resolveInvokeError(error));
  return {
    connected: Boolean((data as { connected?: boolean } | null)?.connected),
    gmailEmail: (data as { gmailEmail?: string } | null)?.gmailEmail,
    expiresAt: (data as { expiresAt?: string } | null)?.expiresAt,
  };
}

export async function fetchGmailConnectionStatus(userId: string): Promise<GmailConnectionStatus> {
  const { data, error } = await supabase
    .from('gmail_oauth_tokens')
    .select('gmail_email, expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { connected: false };
  return { connected: true, gmailEmail: data.gmail_email ?? undefined, expiresAt: data.expires_at ?? undefined };
}

/** Manually triggers a Gmail scan and stores newly-seen messages for classifyEmails to process.
 *  50 is both the product default (scan the most recent 50 emails) and the hard cap the
 *  gmail-fetch-messages edge function enforces. */
export async function scanGmailNow(userId: string, maxResults = 50): Promise<number> {
  const { data, error } = await supabase.functions.invoke('gmail-fetch-messages', { body: { maxResults } });
  if (error) throw classifyError(await resolveInvokeError(error));
  const messages = ((data as { messages?: GmailMessage[] } | null)?.messages ?? []) as GmailMessage[];
  if (messages.length === 0) return 0;

  const rows = messages.map((message) => ({
    user_id: userId,
    gmail_message_id: message.id,
    sender: message.sender,
    subject: message.subject,
    snippet: message.body.slice(0, 2000),
  }));
  const { error: upsertError } = await supabase
    .from('email_monitoring_jobs')
    .upsert(rows, { onConflict: 'user_id,gmail_message_id', ignoreDuplicates: true });
  if (upsertError) throw upsertError;
  return messages.length;
}

/** Silent counterpart to scanGmailNow + classifyEmails, used by the background auto-poll
 *  (useAutoScanEmails) — no manual trigger required. Runs every ~30 minutes while the app is
 *  open; if nothing new is in the inbox it's a no-op and the existing list is left untouched. */
export async function autoScanAndClassify(userId: string): Promise<{ scanned: number; detected: number }> {
  const scanned = await scanGmailNow(userId);
  if (scanned === 0) return { scanned: 0, detected: 0 };
  return classifyEmails(userId);
}

/** All of a user's email-derived tasks live in one dedicated space (found by title, created
 *  once) — todo_tasks always belongs to a space, but an inbox email isn't naturally scoped to
 *  any one of a learner's existing spaces the way a roadmap or chat message is. */
async function getOrCreateEmailTasksSpace(userId: string): Promise<Space> {
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('user_id', userId)
    .eq('title', EMAIL_TASKS_SPACE_TITLE)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as Space;
  return createSpace(userId, { title: EMAIL_TASKS_SPACE_TITLE });
}

/** Spreads email-derived tasks across the days ahead by urgency instead of dumping them all on
 *  today — the same "scatter, don't clutter" principle the calendar's day-load-balancing already
 *  applies to roadmap tasks (see utils/calendarEvents.ts), just expressed as a due-date offset
 *  here since a to-do's due date is a fixed commitment the calendar never moves. */
function dueDateForUrgency(urgency: EmailMonitoringJob['urgency']): string {
  const offsetDays = urgency === 'high' ? 0 : urgency === 'low' ? 5 : 2;
  return format(addDays(new Date(), offsetDays), 'yyyy-MM-dd');
}

/** Converts one classified email into a scheduled task (visible in both the Task List and the
 *  Calendar, since todo_tasks with a due_date feed both) and dismisses the email. */
export async function createTaskFromEmailJob(userId: string, job: EmailMonitoringJob): Promise<TodoTask> {
  const space = await getOrCreateEmailTasksSpace(userId);
  const title = job.learningGoal || job.subject || 'Follow up on email';
  const priority = job.urgency ?? 'medium';
  const task = await createTaskFromEmail(userId, space.id, title, priority, dueDateForUrgency(job.urgency));
  await dismissEmailJob(job.id);
  return task;
}

/** Bulk version of createTaskFromEmailJob — "organize my inbox" in one click. */
export async function organizeEmailJobsIntoTasks(userId: string, jobs: EmailMonitoringJob[]): Promise<number> {
  for (const job of jobs) {
    await createTaskFromEmailJob(userId, job);
  }
  return jobs.length;
}
