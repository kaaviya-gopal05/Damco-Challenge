// Supabase Edge Function: RAG-grounded conversational Q&A about a resume that's already been
// analyzed. Given a free-form question (which may itself contain a pasted job description —
// e.g. "Am I suitable for this JD? <pasted text>"), this embeds the question, retrieves the most
// relevant resume excerpts via the same pgvector similarity search career-analyze uses, and asks
// Gemini for a direct, grounded answer. Unlike career-analyze, this returns plain markdown prose,
// not a structured schema — it's a chat reply, not a generated artifact.
//
// Stateless, same division of responsibility as career-analyze: this writes nothing to the
// database. The caller (spaces.service.ts's replyToMessage) just posts the returned text as an
// ordinary assistant chat message.
//
// Deploy: supabase functions deploy career-chat
// Configure: supabase secrets set GEMINI_API_KEY=your-key (shared with ai-complete/career-analyze)

import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAuthedUser } from '../_shared/authClient.ts';
import { callGeminiText, embedText } from '../_shared/gemini.ts';

const MATCH_COUNT = 8;

const requestSchema = z.object({
  question: z.string().min(1),
  resumeDocumentId: z.string().min(1),
});

interface MatchedChunk {
  chunk_index: number;
  content: string;
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
    return jsonResponse({ error: 'Request must include question and resumeDocumentId.' }, 400);
  }
  const { question, resumeDocumentId } = parsedBody.data;

  try {
    const queryEmbedding = await embedText(geminiKey, question);

    const { data: matches, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      p_user_id: userId,
      p_document_id: resumeDocumentId,
      match_count: MATCH_COUNT,
    });
    if (matchError) throw matchError;

    let chunks = (matches ?? []) as MatchedChunk[];
    if (chunks.length === 0) {
      const { data: allChunks, error: allChunksError } = await supabase
        .from('document_chunks')
        .select('chunk_index, content')
        .eq('document_id', resumeDocumentId)
        .order('chunk_index');
      if (allChunksError) throw allChunksError;
      chunks = (allChunks ?? []) as MatchedChunk[];
    }

    if (chunks.length === 0) {
      return jsonResponse({ error: 'This resume has no readable text yet — please try again in a moment.' }, 409);
    }

    const resumeExcerpt = chunks
      .sort((a, b) => a.chunk_index - b.chunk_index)
      .map((c) => c.content)
      .join('\n\n')
      .slice(0, 100000);

    const prompt = `You are a career coach assistant helping a candidate with questions about their own resume,
inside an ongoing chat. They may paste a job description as part of their question and ask
something like "Am I suitable for this JD?" or "What should I improve for this role?" — if so,
evaluate their fit against it concretely (what matches, what's missing), still grounded in the
resume. Never invent experience, skills, or projects that aren't actually written in the resume
excerpts below. Answer directly and specifically. Keep it conversational, formatted as markdown
(short paragraphs and/or bullet points where that reads more clearly), roughly 100-250 words.

Question:
${question}

Resume excerpts:
${resumeExcerpt}`;

    const answer = await callGeminiText(geminiKey, prompt);
    return jsonResponse({ answer });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error.' }, 500);
  }
});
