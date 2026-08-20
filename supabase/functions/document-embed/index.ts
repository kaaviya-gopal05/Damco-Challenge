// Supabase Edge Function: embeds every not-yet-embedded chunk of one document (Gemini
// gemini-embedding-001), so it becomes searchable via match_document_chunks. Called by the
// frontend right after a PDF's chunks are inserted at upload time — this includes resumes
// uploaded through the Career Intelligence chat flow (career.service.ts), which reuses this
// exact pipeline before career-analyze runs retrieval over the result.
//
// Deploy: supabase functions deploy document-embed
// Configure: supabase secrets set GEMINI_API_KEY=your-key (shared with ai-complete)

import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAuthedUser } from '../_shared/authClient.ts';
import { embedText } from '../_shared/gemini.ts';

const CONCURRENCY = 5;

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

const requestSchema = z.object({ documentId: z.string().min(1) });

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

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) {
    return jsonResponse({ error: 'AI is not configured on the server (missing GEMINI_API_KEY secret).' }, 500);
  }

  const rawBody = await req.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return jsonResponse({ error: 'Request body must include a "documentId" string.' }, 400);
  }

  try {
    // RLS on `documents` already means this returns nothing if the document isn't the caller's.
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', parsedBody.data.documentId)
      .maybeSingle();
    if (docError) throw docError;
    if (!document) {
      return jsonResponse({ error: 'Document not found.' }, 404);
    }

    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('id, content')
      .eq('document_id', parsedBody.data.documentId)
      .is('embedding', null);
    if (chunksError) throw chunksError;

    let embedded = 0;
    await mapWithConcurrency(chunks ?? [], CONCURRENCY, async (chunk) => {
      try {
        const embedding = await embedText(geminiKey, chunk.content);
        // Supabase-js/PostgREST accepts a plain JS number array for a pgvector column directly.
        const { error: updateError } = await supabase.from('document_chunks').update({ embedding }).eq('id', chunk.id);
        if (!updateError) embedded += 1;
      } catch {
        // One bad chunk shouldn't fail the whole document — it just stays searchable-by-title
        // only, and can be retried on a future call since embedding is still null for it.
      }
    });

    return jsonResponse({ embedded, total: (chunks ?? []).length });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error.' }, 500);
  }
});
