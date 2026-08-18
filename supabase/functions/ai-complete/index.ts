// Supabase Edge Function: proxies AI generation requests to Google Gemini.
//
// This exists so the Gemini API key never has to ship inside the browser bundle.
// Every VITE_*-prefixed variable in the frontend gets baked into the built client
// JS and is trivially visible to anyone reading the bundle or the Network tab —
// fine for a public anon key, not fine for a billed, per-token AI provider key.
// GEMINI_API_KEY here is a server-side secret set via `supabase secrets set` and
// is only ever read inside this Deno runtime, never sent to the client.
//
// Deploy: supabase functions deploy ai-complete
// Configure: supabase secrets set GEMINI_API_KEY=your-key
// See docs/ai-workflow.md for the full setup walkthrough.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // This proxies a paid, per-token API key — never let an unauthenticated
    // caller reach it, even though the anon key alone can't do anything harmful
    // to the database. Defense in depth, same principle as RLS everywhere else
    // in this app (see ARCHITECTURE.md §10).
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header.' }, 401);
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Not authenticated.' }, 401);
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      return jsonResponse({ error: 'AI is not configured on the server (missing GEMINI_API_KEY secret).' }, 500);
    }

    const body = await req.json().catch(() => null);
    const prompt = body?.prompt;
    const jsonMode = Boolean(body?.jsonMode);
    if (!prompt || typeof prompt !== 'string') {
      return jsonResponse({ error: 'Request body must include a "prompt" string.' }, 400);
    }

    const geminiRes = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: jsonMode ? { responseMimeType: 'application/json', temperature: 0.4 } : { temperature: 0.5 },
      }),
    });

    if (!geminiRes.ok) {
      const errorBody = await geminiRes.text().catch(() => '');
      return jsonResponse(
        { error: `Gemini request failed: ${geminiRes.status} ${geminiRes.statusText} ${errorBody}`.trim() },
        502
      );
    }

    const data = await geminiRes.json();
    const text: string = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
    if (!text) {
      return jsonResponse({ error: 'Gemini returned an empty response.' }, 502);
    }

    return jsonResponse({ text });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error.' }, 500);
  }
});
