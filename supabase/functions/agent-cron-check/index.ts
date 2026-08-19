// Supabase Edge Function: scheduled entry point (wire up via Supabase Dashboard -> Edge
// Functions -> agent-cron-check -> Schedules, every 30 minutes, header "x-cron-secret:
// <CRON_SECRET>") that scans every connected user's Gmail inbox for their 50 most recent
// messages, stores newly-seen ones as email_monitoring_jobs, and classifies them in the same
// run — so a scheduled scan produces the same actionable, urgency-ranked emails the frontend's
// own auto-poll (useAutoScanEmails) produces, just without needing the app open in a browser.
// Ingestion uses fetchRecentMessages/gmailClient (shared with gmail-fetch-messages);
// classification uses classifyUnclassifiedJobs (shared with classify-emails).
//
// This is the one function in the email system that must see every user's rows, so it uses the
// service-role key (SUPABASE_SERVICE_ROLE_KEY, always present in the edge runtime) rather than
// a forwarded user JWT — the same reason Postgres has RLS: this function, not its caller, is the
// trust boundary, which is why it requires a shared secret instead of a user session.
//
// Deploy: supabase functions deploy agent-cron-check
// Configure: supabase secrets set CRON_SECRET=$(openssl rand -base64 24)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { fetchRecentMessages, getValidAccessToken } from '../_shared/gmailClient.ts';
import { classifyUnclassifiedJobs } from '../_shared/emailClassifier.ts';

const MESSAGES_PER_USER = 50;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized.' }, 401);
  }

  const clientId = Deno.env.get('GMAIL_CLIENT_ID');
  const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');
  const encryptionKey = Deno.env.get('GMAIL_TOKEN_ENCRYPTION_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!clientId || !clientSecret || !encryptionKey || !serviceRoleKey || !geminiKey) {
    return jsonResponse({ error: 'Email monitoring is not fully configured on the server.' }, 500);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey);

  const { data: tokenRows, error: tokenRowsError } = await supabase.from('gmail_oauth_tokens').select('*');
  if (tokenRowsError) {
    return jsonResponse({ error: tokenRowsError.message }, 500);
  }

  let usersScanned = 0;
  let messagesIngested = 0;
  let detected = 0;
  const failures: { userId: string; error: string }[] = [];

  for (const tokenRow of tokenRows ?? []) {
    try {
      const accessToken = await getValidAccessToken(supabase, tokenRow.user_id, tokenRow, {
        clientId,
        clientSecret,
        encryptionKey,
      });
      const messages = await fetchRecentMessages(accessToken, MESSAGES_PER_USER, 'in:inbox');
      usersScanned += 1;

      if (messages.length > 0) {
        const rows = messages.map((message) => ({
          user_id: tokenRow.user_id,
          gmail_message_id: message.id,
          sender: message.sender,
          subject: message.subject,
          snippet: message.body.slice(0, 2000),
        }));
        const { error: upsertError } = await supabase
          .from('email_monitoring_jobs')
          .upsert(rows, { onConflict: 'user_id,gmail_message_id', ignoreDuplicates: true });
        if (upsertError) throw upsertError;
        messagesIngested += messages.length;
      }

      const result = await classifyUnclassifiedJobs(supabase, geminiKey, tokenRow.user_id);
      detected += result.detected;

      if (messages.length > 0) {
        await supabase.from('agent_task_queue').insert({
          user_id: tokenRow.user_id,
          task_type: 'email_scan',
          payload: { messagesFound: messages.length, detected: result.detected },
          status: 'completed',
          processed_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      failures.push({ userId: tokenRow.user_id, error: err instanceof Error ? err.message : 'Unknown error.' });
    }
  }

  return jsonResponse({ usersScanned, messagesIngested, detected, failures });
});
