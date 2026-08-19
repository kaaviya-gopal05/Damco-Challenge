// Supabase Edge Function: classifies whatever emails are sitting unclassified in
// email_monitoring_jobs (put there by gmail-fetch-messages or agent-cron-check) — decides, per
// email, whether it's actually actionable (an interview, exam, deadline, scheduled meeting) or
// noise (newsletter, receipt, marketing), via Gemini with regex-extraction + zod-schema
// validation on the response. The extraction logic itself lives in _shared/emailClassifier.ts,
// shared with agent-cron-check so the "what counts as actionable" prompt only exists once.
//
// Deploy: supabase functions deploy classify-emails
// Configure: supabase secrets set GEMINI_API_KEY=your-key (shared with ai-complete)

import { z } from 'https://esm.sh/zod@3.23.8';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAuthedUser } from '../_shared/authClient.ts';
import { classifyUnclassifiedJobs } from '../_shared/emailClassifier.ts';

async function logClassificationRun(
  supabase: SupabaseClient,
  entry: { userId: string; status: 'success' | 'error'; scanned: number; detected: number; errorMessage?: string; durationMs: number }
) {
  try {
    await supabase.from('agent_executions').insert({
      user_id: entry.userId,
      agent_name: 'emailMonitor',
      status: entry.status,
      input: {},
      output: { scanned: entry.scanned, detected: entry.detected },
      error_message: entry.errorMessage ?? null,
      duration_ms: entry.durationMs,
    });
  } catch {
    // Logging must never take down the actual classification run.
  }
}

const requestSchema = z.object({ userId: z.string().min(1) });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const authed = await requireAuthedUser(req);
  if ('error' in authed) {
    return jsonResponse({ error: authed.error }, authed.status);
  }
  const { supabase, userId: authedUserId } = authed;

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) {
    return jsonResponse({ error: 'AI is not configured on the server (missing GEMINI_API_KEY secret).' }, 500);
  }

  const rawBody = await req.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return jsonResponse({ error: 'Request body must include a "userId" string.' }, 400);
  }
  if (parsedBody.data.userId !== authedUserId) {
    return jsonResponse({ error: 'userId does not match the authenticated user.' }, 403);
  }

  const startedAt = Date.now();
  try {
    const { scanned, detected } = await classifyUnclassifiedJobs(supabase, geminiKey, authedUserId);
    const durationMs = Date.now() - startedAt;
    await logClassificationRun(supabase, { userId: authedUserId, status: 'success', scanned, detected, durationMs });
    return jsonResponse({ scanned, detected, durationMs });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error.';
    await logClassificationRun(supabase, {
      userId: authedUserId,
      status: 'error',
      scanned: 0,
      detected: 0,
      errorMessage,
      durationMs: Date.now() - startedAt,
    });
    return jsonResponse({ error: errorMessage }, 500);
  }
});
