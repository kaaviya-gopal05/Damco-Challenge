// Supabase Edge Function: RAG over a learner's uploaded PDFs. Embeds the question, finds the
// most relevant chunks across (or within one of) their documents via pgvector similarity search,
// and asks Gemini to answer using only that retrieved context — with citations back to source.
//
// Deploy: supabase functions deploy document-ask
// Configure: supabase secrets set GEMINI_API_KEY=your-key (shared with ai-complete)

import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAuthedUser } from '../_shared/authClient.ts';
import { callGeminiJsonValidated, embedText } from '../_shared/gemini.ts';

const MATCH_COUNT = 6;

const requestSchema = z.object({
  question: z.string().min(1),
  documentId: z.string().optional(),
});

const answerResponseSchema = z.object({
  answer: z.string().min(1),
  usedSourceIndexes: z.array(z.number().int()),
});

interface MatchedChunk {
  chunk_id: string;
  document_id: string;
  document_title: string;
  chunk_index: number;
  content: string;
  similarity: number;
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

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) {
    return jsonResponse({ error: 'AI is not configured on the server (missing GEMINI_API_KEY secret).' }, 500);
  }

  const rawBody = await req.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return jsonResponse({ error: 'Request body must include a "question" string.' }, 400);
  }
  const { question, documentId } = parsedBody.data;

  try {
    const queryEmbedding = await embedText(geminiKey, question);

    const { data: matches, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      p_user_id: userId,
      p_document_id: documentId ?? null,
      match_count: MATCH_COUNT,
    });
    if (matchError) throw matchError;

    const chunks = (matches ?? []) as MatchedChunk[];
    if (chunks.length === 0) {
      return jsonResponse({
        answer:
          "I couldn't find anything relevant in your documents yet — try uploading a PDF first, or check back in a moment if you just uploaded one (it takes a few seconds to become searchable).",
        sources: [],
      });
    }

    const contextBlock = chunks
      .map((chunk, i) => `[${i + 1}] From "${chunk.document_title}":\n${chunk.content}`)
      .join('\n\n');
    const prompt = `Answer the learner's question using ONLY the numbered excerpts below — if the excerpts don't
actually contain the answer, say so plainly rather than guessing or using outside knowledge.

Excerpts:
${contextBlock}

Question: ${question}

Respond with strict JSON only, matching exactly this shape:
{ "answer": "a clear, direct answer grounded in the excerpts above, citing them inline like [1] where relevant", "usedSourceIndexes": [1, 2] }`;

    const result = await callGeminiJsonValidated(geminiKey, prompt, answerResponseSchema);
    if (!result) {
      return jsonResponse({ error: 'Could not generate an answer just now — please try again.' }, 502);
    }

    const usedIndexes = new Set(result.usedSourceIndexes);
    const sources = chunks
      .map((chunk, i) => ({
        index: i + 1,
        documentId: chunk.document_id,
        documentTitle: chunk.document_title,
        chunkIndex: chunk.chunk_index,
        snippet: chunk.content.slice(0, 220),
      }))
      .filter((source) => usedIndexes.size === 0 || usedIndexes.has(source.index));

    return jsonResponse({ answer: result.answer, sources });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error.' }, 500);
  }
});
