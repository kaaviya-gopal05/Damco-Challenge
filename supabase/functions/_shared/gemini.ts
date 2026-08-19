// Shared Gemini caller used by every non-ai-complete edge function in this project (email
// classification, document embedding/RAG). A plain fetch() against the Gemini REST API — no
// @langchain/* packages, which pull in a large Node-oriented dependency tree that isn't reliably
// esm.sh/Deno-edge-runtime compatible — has zero transitive dependencies and is exactly what's
// already running reliably in production here.

import type { z } from 'https://esm.sh/zod@3.23.8';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
// text-embedding-004 isn't available on every Gemini API key/project (some only expose the
// newer, unified gemini-embedding-001 model) — 768 matches this project's vector(768) column,
// requested explicitly since gemini-embedding-001 defaults to a much larger 3072-dim output.
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

export class GeminiCallError extends Error {}

export async function callGeminiJson(geminiKey: string, prompt: string): Promise<string> {
  const res = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new GeminiCallError(`Gemini request failed: ${res.status} ${res.statusText} ${errorBody}`.trim());
  }

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  if (!text) throw new GeminiCallError('Gemini returned an empty response.');
  return text;
}

/**
 * Pulls the outermost {...} or [...] block out of a raw model response with a regex, on top of
 * the usual markdown-fence stripping — Gemini's JSON mode is normally clean, but "return JSON
 * only" is an instruction, not a guarantee, and a model occasionally wraps its answer in a
 * sentence of prose anyway ("Here is the JSON: {...}"). Regex-extracting the JSON span before
 * handing it to JSON.parse means that stray prose doesn't sink an otherwise well-formed response.
 */
function extractJsonSpan(raw: string): string {
  const fenceStripped = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```$/, '')
    .trim();
  const match = fenceStripped.match(/[{[][\s\S]*[}\]]/);
  return match ? match[0] : fenceStripped;
}

export function parseJsonLoosely<T>(raw: string): T | null {
  try {
    return JSON.parse(extractJsonSpan(raw)) as T;
  } catch {
    return null;
  }
}

/**
 * Calls Gemini and only ever returns a response that has been (a) regex-extracted into a clean
 * JSON span and (b) validated against a zod schema — this is the guard against a model response
 * that's malformed, incomplete, or simply not shaped like what was asked for ever being trusted
 * as if it were real, checked data. A response that fails validation is retried (a fresh model
 * call, not a re-parse of the same bad text) up to `maxAttempts` times before giving up and
 * returning null, at which point the caller's own hand-written fallback takes over — every tool
 * in agent-orchestrator has one, so an AI response that doesn't hold up never reaches the learner.
 */
export async function callGeminiJsonValidated<T>(
  geminiKey: string,
  prompt: string,
  schema: z.ZodType<T>,
  maxAttempts = 2
): Promise<T | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const raw = await callGeminiJson(geminiKey, prompt);
      const candidate = parseJsonLoosely<unknown>(raw);
      const result = schema.safeParse(candidate);
      if (result.success) return result.data;
    } catch {
      // A network/API error on this attempt — fall through and retry like a validation failure.
    }
  }
  return null;
}

/** Embeds one piece of text into a 768-dim vector (Gemini gemini-embedding-001) for RAG search. */
export async function embedText(geminiKey: string, text: string): Promise<number[]> {
  const res = await fetch(EMBEDDING_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
    body: JSON.stringify({
      content: { parts: [{ text: text.slice(0, 20000) }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }),
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new GeminiCallError(`Gemini embedding request failed: ${res.status} ${res.statusText} ${errorBody}`.trim());
  }
  const data = await res.json();
  const values: number[] | undefined = data.embedding?.values;
  if (!values || values.length === 0) throw new GeminiCallError('Gemini returned an empty embedding.');
  return values;
}
