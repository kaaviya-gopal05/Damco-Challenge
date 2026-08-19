// Shared email-classification logic used by both classify-emails (one user, their own JWT,
// triggered from the frontend's auto-poll) and agent-cron-check (every connected user,
// service-role client, triggered on a schedule) — extracted so the extraction prompt, schema,
// and "what counts as unclassified" query only have to be right in one place.

import { z } from 'https://esm.sh/zod@3.23.8';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callGeminiJsonValidated } from './gemini.ts';

export const CONFIDENCE_THRESHOLD = 0.7;
const CLASSIFICATION_CONCURRENCY = 8;

const emailExtractionSchema = z.object({
  sender: z.string().nullable(),
  subject: z.string().nullable(),
  snippet: z.string().nullable(),
});

const emailExtractionResponseSchema = z.object({
  learningGoal: z.string(),
  urgency: z.enum(['low', 'medium', 'high']),
  context: z.string(),
  suggestedActions: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

type EmailExtractionResult = z.infer<typeof emailExtractionResponseSchema>;

const EMAIL_EXTRACTION_FALLBACK: EmailExtractionResult = {
  learningGoal: '',
  urgency: 'low',
  context: '',
  suggestedActions: [],
  confidence: 0,
};

async function extractLearningGoalFromEmail(
  geminiKey: string,
  email: z.infer<typeof emailExtractionSchema>
): Promise<EmailExtractionResult> {
  const parsed = emailExtractionSchema.parse(email);
  const body = (parsed.snippet ?? '').slice(0, 5000);
  const prompt = `You are an assistant that reads one email and decides whether the recipient
needs to DO or PREPARE something because of it — the kind of email that should turn into a task.
Say yes only for things like: an interview or exam is scheduled ("system design interview
Thursday"), a meeting/call/deadline was scheduled, a project deliverable or assignment is due, or
the sender is explicitly asking the recipient to prepare, learn, or study something for a
specific purpose. Say no (empty learningGoal) for newsletters, marketing, receipts, automated
notifications, social updates, or anything with no real action or date attached to it — most
emails in a real inbox fall in this "no" bucket, so be strict.

From: ${parsed.sender ?? 'unknown'}
Subject: ${parsed.subject ?? '(no subject)'}
Body: ${body || '(empty)'}

Respond with strict JSON only, matching exactly this shape:
{
  "learningGoal": "short phrase describing what to prepare/do, or empty string if this isn't actionable",
  "urgency": "low" | "medium" | "high",
  "context": "one sentence explaining why, mentioning the date/deadline if there is one",
  "suggestedActions": ["short action", "short action"],
  "confidence": 0.0
}`;

  const result = await callGeminiJsonValidated(geminiKey, prompt, emailExtractionResponseSchema);
  return result ?? EMAIL_EXTRACTION_FALLBACK;
}

async function fetchUnclassifiedJobs(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('email_monitoring_jobs')
    .select('*')
    // urgency is only ever set once a row has been classified (even a "no goal" verdict still
    // stamps urgency = 'low'), so this is the correct "hasn't been read yet" filter.
    .is('urgency', null)
    .eq('user_id', userId)
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

/** Runs `fn` over every item with at most `limit` in flight at once — the difference between
 *  classifying 50 emails in ~2 minutes (one Gemini call after another) and a few seconds. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Classifies every not-yet-classified email sitting in email_monitoring_jobs for one user. */
export async function classifyUnclassifiedJobs(
  supabase: SupabaseClient,
  geminiKey: string,
  userId: string
): Promise<{ scanned: number; detected: number }> {
  const jobs = await fetchUnclassifiedJobs(supabase, userId);
  let detected = 0;

  await mapWithConcurrency(jobs, CLASSIFICATION_CONCURRENCY, async (job) => {
    const extraction = await extractLearningGoalFromEmail(geminiKey, {
      sender: job.sender,
      subject: job.subject,
      snippet: job.snippet,
    });
    await supabase
      .from('email_monitoring_jobs')
      .update({
        learning_goal: extraction.learningGoal || null,
        urgency: extraction.urgency,
        confidence: extraction.confidence,
        context: extraction.context,
        suggested_actions: extraction.suggestedActions,
      })
      .eq('id', job.id);
    if (extraction.confidence > CONFIDENCE_THRESHOLD && extraction.learningGoal) detected += 1;
  });

  return { scanned: jobs.length, detected };
}
