// Supabase Edge Function: fetches recent Gmail messages for the connected account, refreshing
// the stored access token first if it has expired.
//
// Deploy: supabase functions deploy gmail-fetch-messages

import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAuthedUser } from '../_shared/authClient.ts';
import { fetchRecentMessages, getValidAccessToken } from '../_shared/gmailClient.ts';

const requestSchema = z.object({
  maxResults: z.number().int().min(1).max(50).optional(),
  query: z.string().optional(),
});

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
  const { supabase, userId } = authed;

  const clientId = Deno.env.get('GMAIL_CLIENT_ID');
  const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');
  const encryptionKey = Deno.env.get('GMAIL_TOKEN_ENCRYPTION_KEY');
  if (!clientId || !clientSecret || !encryptionKey) {
    return jsonResponse({ error: 'Gmail is not configured on the server.' }, 500);
  }

  const rawBody = await req.json().catch(() => ({}));
  const parsedBody = requestSchema.safeParse(rawBody ?? {});
  if (!parsedBody.success) {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }
  const { maxResults = 10, query = 'newer_than:7d' } = parsedBody.data;

  try {
    const { data: tokenRow, error: tokenError } = await supabase
      .from('gmail_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (tokenError) throw tokenError;
    if (!tokenRow) {
      return jsonResponse({ error: 'Gmail is not connected for this account.' }, 400);
    }

    const accessToken = await getValidAccessToken(supabase, userId, tokenRow, { clientId, clientSecret, encryptionKey });

    const messages = await fetchRecentMessages(accessToken, maxResults, query);
    return jsonResponse({ messages });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error.' }, 500);
  }
});
