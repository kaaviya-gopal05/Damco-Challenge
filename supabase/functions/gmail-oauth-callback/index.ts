// Supabase Edge Function: exchanges a Gmail OAuth authorization code for access/refresh tokens
// and stores them (AES-GCM encrypted, see _shared/crypto.ts) in gmail_oauth_tokens.
//
// Deploy: supabase functions deploy gmail-oauth-callback
// Configure:
//   supabase secrets set GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
//   supabase secrets set GMAIL_CLIENT_SECRET=your-client-secret
//   supabase secrets set GMAIL_TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)

import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAuthedUser } from '../_shared/authClient.ts';
import { encryptToken } from '../_shared/crypto.ts';

const requestSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
});

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

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
    return jsonResponse(
      { error: 'Gmail is not configured on the server (missing GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET/GMAIL_TOKEN_ENCRYPTION_KEY secret).' },
      500
    );
  }

  const rawBody = await req.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return jsonResponse({ error: 'Request body must include "code" and "redirectUri" strings.' }, 400);
  }
  const { code, redirectUri } = parsedBody.data;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenRes.ok || !tokenData.access_token) {
      return jsonResponse({ error: tokenData.error_description ?? tokenData.error ?? 'Google token exchange failed.' }, 502);
    }
    if (!tokenData.refresh_token) {
      return jsonResponse(
        { error: 'Google did not return a refresh token. Revoke access at myaccount.google.com/permissions and reconnect to force one.' },
        502
      );
    }

    let gmailEmail: string | null = null;
    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        gmailEmail = profile.email ?? null;
      }
    } catch {
      // Non-critical — the connection still succeeds without a display email.
    }

    // Each token is encrypted independently with its own IV (AES-GCM must never reuse an IV
    // under the same key) and stored as "<iv>:<ciphertext>" so decryption is self-contained.
    const accessEncrypted = await encryptToken(tokenData.access_token, encryptionKey);
    const refreshEncrypted = await encryptToken(tokenData.refresh_token, encryptionKey);
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { error } = await supabase.from('gmail_oauth_tokens').upsert(
      {
        user_id: userId,
        access_token_encrypted: `${accessEncrypted.iv}:${accessEncrypted.ciphertext}`,
        refresh_token_encrypted: `${refreshEncrypted.iv}:${refreshEncrypted.ciphertext}`,
        expires_at: expiresAt,
        gmail_email: gmailEmail,
      },
      { onConflict: 'user_id' }
    );
    if (error) throw error;

    return jsonResponse({ connected: true, gmailEmail: gmailEmail ?? undefined, expiresAt });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error.' }, 500);
  }
});
