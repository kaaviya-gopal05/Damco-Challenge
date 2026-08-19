// Shared Gmail token-refresh + message-fetch logic used by both gmail-fetch-messages (one user,
// their own JWT) and agent-cron-check (every connected user, service-role client). Keeping this
// in one place means the refresh-then-fetch flow only has to be gotten right once.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decryptToken, encryptToken } from './crypto.ts';

const GMAIL_API = 'https://www.googleapis.com/gmail/v1/users/me';

export interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  encryptionKey: string;
}

function splitEncrypted(value: string): { iv: string; ciphertext: string } {
  const [iv, ciphertext] = value.split(':');
  return { iv, ciphertext };
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    } else {
      return res;
    }
  }
  return fetch(url, init);
}

/** Returns a usable access token for the user, refreshing (and persisting) it first if expired.
 *  Throws (with Google's own error detail where available) rather than returning null, so every
 *  caller's existing try/catch surfaces the real reason instead of a generic failure message. */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string,
  tokenRow: { access_token_encrypted: string; refresh_token_encrypted: string; expires_at: string },
  creds: GmailCredentials
): Promise<string> {
  const isExpired = new Date(tokenRow.expires_at).getTime() - Date.now() < 60_000;
  if (!isExpired) {
    const { iv, ciphertext } = splitEncrypted(tokenRow.access_token_encrypted);
    return decryptToken(ciphertext, iv, creds.encryptionKey);
  }

  const { iv, ciphertext } = splitEncrypted(tokenRow.refresh_token_encrypted);
  const refreshToken = await decryptToken(ciphertext, iv, creds.encryptionKey);
  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const refreshData = await refreshRes.json();
  if (!refreshRes.ok || !refreshData.access_token) {
    throw new Error(
      `Gmail token refresh failed: ${refreshData.error_description ?? refreshData.error ?? refreshRes.status}. Try reconnecting Gmail in Settings.`
    );
  }

  const encrypted = await encryptToken(refreshData.access_token, creds.encryptionKey);
  const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
  await supabase
    .from('gmail_oauth_tokens')
    .update({ access_token_encrypted: `${encrypted.iv}:${encrypted.ciphertext}`, expires_at: expiresAt })
    .eq('user_id', userId);

  return refreshData.access_token;
}

function headerValue(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function decodeBody(payload: unknown): string {
  const part = payload as { body?: { data?: string }; parts?: { mimeType?: string; body?: { data?: string } }[] };
  const data =
    part.body?.data ??
    part.parts?.find((p) => p.mimeType === 'text/plain')?.body?.data ??
    part.parts?.find((p) => p.mimeType === 'text/html')?.body?.data;
  if (!data) return '';
  try {
    return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return '';
  }
}

export interface FetchedGmailMessage {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  body: string;
  timestamp: string;
}

export async function fetchRecentMessages(
  accessToken: string,
  maxResults: number,
  query: string
): Promise<FetchedGmailMessage[]> {
  const listUrl = `${GMAIL_API}/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`;
  const listRes = await fetchWithRetry(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!listRes.ok) {
    const errorBody = await listRes.text().catch(() => '');
    throw new Error(`Gmail API error listing messages: ${listRes.status} ${errorBody}`.trim());
  }
  const listData = await listRes.json();
  const ids: string[] = (listData.messages ?? []).map((m: { id: string }) => m.id);

  const messages = await Promise.all(
    ids.map(async (id): Promise<FetchedGmailMessage | null> => {
      const msgRes = await fetchWithRetry(`${GMAIL_API}/messages/${id}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!msgRes.ok) return null;
      const msg = await msgRes.json();
      const headers = msg.payload?.headers ?? [];
      const body = decodeBody(msg.payload).slice(0, 5000);
      return {
        id: msg.id as string,
        threadId: msg.threadId as string,
        sender: headerValue(headers, 'From'),
        subject: headerValue(headers, 'Subject'),
        body: body || (msg.snippet as string) || '',
        timestamp: new Date(Number(msg.internalDate)).toISOString(),
      };
    })
  );
  return messages.filter((m): m is FetchedGmailMessage => m !== null);
}
