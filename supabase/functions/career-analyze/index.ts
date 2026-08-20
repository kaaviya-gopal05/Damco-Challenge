// Supabase Edge Function: RAG-grounded career analysis. Given a target role and/or a job
// description, and a resume already chunked+embedded via document-embed, this embeds a query
// built from the role/JD, retrieves the most relevant resume excerpts via pgvector similarity
// search (the same match_document_chunks RPC document-ask used), and asks Gemini to generate a
// skill-gap analysis and interview questions grounded only in those excerpts — never inventing
// experience that isn't actually evidenced in the retrieved text. When the caller supplies only a
// job description (no typed role — see useCommandFlow.ts's career flow, where a JD upload is an
// alternative to typing the role), this also extracts a clean job-title string from it, rather
// than the caller trying to guess one from raw PDF text itself — returned as "resolvedRole" so
// the caller can use it as this analysis's display title (chat, space title, Career Intelligence
// page) instead of a chunk of extracted prose.
//
// This function is stateless: it returns the generated content and writes nothing to the
// database itself — career.service.ts (the caller) owns persisting the result, same division of
// responsibility as every other AiService-backed generator in this app.
//
// Deploy: supabase functions deploy career-analyze
// Configure: supabase secrets set GEMINI_API_KEY=your-key (shared with ai-complete)

import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAuthedUser } from '../_shared/authClient.ts';
import { callGeminiJsonValidated, callGeminiText, embedText } from '../_shared/gemini.ts';

const MATCH_COUNT = 10;

const requestSchema = z
  .object({
    targetRole: z.string().trim().min(1).optional(),
    jobDescription: z.string().trim().min(1).optional(),
    resumeDocumentId: z.string().min(1),
  })
  .refine((data) => !!data.targetRole || !!data.jobDescription, {
    message: 'Request must include targetRole and/or jobDescription.',
  });

const MAX_ROLE_TITLE_LENGTH = 80;

/** A job description's title isn't reliably the first line of its extracted PDF text — line
 *  breaks in extracted text often don't match the document's actual visual structure, so a
 *  client-side "first line" heuristic can grab a run-on sentence instead of just the title. This
 *  asks the model directly for the title alone, then still defends against a wordier-than-asked
 *  answer by taking only its first line and capping the length. */
async function extractRoleTitle(geminiKey: string, jobDescription: string): Promise<string> {
  const prompt = `Extract ONLY the job title from this job description — respond with the title alone, nothing
else: no company name, no location, no extra commentary, no punctuation around it. For example
"Senior Backend Engineer" or "Data Scientist II". If the text genuinely has no identifiable job
title, respond with exactly: Unspecified Role

Job description:
${jobDescription.slice(0, 8000)}`;
  const raw = await callGeminiText(geminiKey, prompt);
  const cleaned = raw
    .trim()
    .split('\n')[0]
    .replace(/^["'*#\s]+|["'*\s]+$/g, '')
    .trim();
  return cleaned.length > 0 && cleaned.length <= MAX_ROLE_TITLE_LENGTH ? cleaned : 'Unspecified Role';
}

const analysisSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  skillAssessments: z.array(
    z.object({ skill: z.string(), currentLevel: z.number(), targetLevel: z.number() })
  ),
});

const VALID_CATEGORIES = ['technical', 'behavioral', 'system_design', 'coding', 'resume', 'hr'] as const;
const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

const questionsSchema = z.array(
  z.object({
    category: z.enum(VALID_CATEGORIES),
    question: z.string(),
    sampleAnswer: z.string(),
    difficulty: z.enum(VALID_DIFFICULTIES),
  })
);

interface MatchedChunk {
  chunk_id: string;
  document_id: string;
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
    return jsonResponse({ error: 'Request must include targetRole and/or jobDescription, plus resumeDocumentId.' }, 400);
  }
  const { targetRole, jobDescription, resumeDocumentId } = parsedBody.data;

  try {
    const resolvedRole = targetRole || (await extractRoleTitle(geminiKey, jobDescription!));
    const retrievalQuery = jobDescription ? `${resolvedRole}\n\n${jobDescription}` : resolvedRole;
    const queryEmbedding = await embedText(geminiKey, retrievalQuery);

    const { data: matches, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      p_user_id: userId,
      p_document_id: resumeDocumentId,
      match_count: MATCH_COUNT,
    });
    if (matchError) throw matchError;

    let chunks = (matches ?? []) as MatchedChunk[];
    // Embeddings are written right before this function is invoked (career.service.ts awaits
    // document-embed), but if similarity search still comes back empty — e.g. a very short
    // resume where nothing crosses whatever threshold pgvector's ordering settles on — fall back
    // to every chunk of the resume directly rather than failing the whole analysis.
    if (chunks.length === 0) {
      const { data: allChunks, error: allChunksError } = await supabase
        .from('document_chunks')
        .select('id, document_id, chunk_index, content')
        .eq('document_id', resumeDocumentId)
        .order('chunk_index');
      if (allChunksError) throw allChunksError;
      chunks = (allChunks ?? []).map((c) => ({ ...c, chunk_id: c.id, similarity: 0 }));
    }

    if (chunks.length === 0) {
      return jsonResponse({ error: 'This resume has no readable text yet — please try again in a moment.' }, 409);
    }

    const resumeExcerpt = chunks
      .sort((a, b) => a.chunk_index - b.chunk_index)
      .map((c) => c.content)
      .join('\n\n')
      .slice(0, 100000);
    const jdBlock = jobDescription ? `\n\nJob description:\n${jobDescription.slice(0, 20000)}` : '';

    const analysisPrompt = `You are an expert career coach. Carefully read every line of this resume, word for word, and
analyze it against the target role "${resolvedRole}"${jobDescription ? ', using the job description below as the concrete bar for what "meets requirements" means' : ''}.
Identify what the candidate is already strong in, what is missing or underdeveloped for this
specific role, and rate their apparent proficiency in the 5-8 skills most relevant to this role.
Return JSON matching exactly: { "summary": string (2-3 sentences overall assessment), "strengths":
string[] (3-6 concrete strengths found in the resume), "gaps": string[] (3-6 concrete gaps
relative to "${resolvedRole}"), "skillAssessments": [{ "skill": string, "currentLevel": number (0-5,
0 if not evidenced at all in the resume), "targetLevel": number (0-5, the level expected for
"${resolvedRole}") }] }. Base every judgment strictly on what is actually written in the resume
excerpts below — do not invent experience that isn't there.

Resume excerpts:
${resumeExcerpt}${jdBlock}`;

    const analysis = await callGeminiJsonValidated(geminiKey, analysisPrompt, analysisSchema);
    if (!analysis) {
      return jsonResponse({ error: 'Could not analyze this resume just now — please try again.' }, 502);
    }

    const gapsNote = analysis.gaps.length > 0 ? ` Weight questions toward these known gaps where relevant: ${analysis.gaps.join(', ')}.` : '';
    const questionsPrompt = `Generate interview preparation questions for a candidate targeting the role "${resolvedRole}".${gapsNote} Generate
exactly 3 questions for each of these 6 categories: technical, behavioral, system_design, coding,
resume, hr. "resume" category means questions about how to present/discuss their resume; "hr"
means logistics/culture-fit style questions. Ground every question in what's actually in the
resume excerpts below where relevant (e.g. reference a real project or skill named there) rather
than generic questions. Each sampleAnswer is markdown: 2-4 sentences for most categories,
formatted as short paragraphs and bullet points where that reads more clearly than one block of
prose. For "coding" questions specifically, sampleAnswer MUST include a real, working code
solution inside a fenced code block tagged with its language (e.g. \`\`\`python or \`\`\`javascript),
plus 1-2 sentences explaining the approach and its time/space complexity. Return JSON matching
exactly: [{ "category": "technical"|"behavioral"|"system_design"|"coding"|"resume"|"hr",
"question": string, "sampleAnswer": string, "difficulty": "beginner"|"intermediate"|"advanced" }].
The "difficulty" field must be the exact lowercase string "beginner", "intermediate", or
"advanced" — never any other word. Return 18 items total.

Resume excerpts:
${resumeExcerpt}${jdBlock}`;

    const interviewQuestions = await callGeminiJsonValidated(geminiKey, questionsPrompt, questionsSchema);
    if (!interviewQuestions) {
      return jsonResponse({ error: 'Could not generate interview questions just now — please try again.' }, 502);
    }

    return jsonResponse({ ...analysis, interviewQuestions, resolvedRole });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error.' }, 500);
  }
});
