import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { DocumentAskResult } from '@/features/documents/types';

/** Same unwrap this project's other edge-function callers need — supabase-js's error object
 *  only ever carries a generic "non-2xx" message by default; the real text is in the response
 *  body. See src/services/agentService.ts for the original write-up of this. */
async function resolveInvokeError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await (error.context as Response).clone().json();
      if (body?.error) return new Error(body.error);
    } catch {
      // Response body wasn't JSON (or already consumed) — fall through to the generic error.
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}

/** RAG over the learner's uploaded PDFs — answers a question using only retrieved passages from
 *  their own documents (all of them, or just one if documentId is given), with citations. */
export async function askDocuments(question: string, documentId?: string): Promise<DocumentAskResult> {
  const { data, error } = await supabase.functions.invoke('document-ask', { body: { question, documentId } });
  if (error) throw await resolveInvokeError(error);
  const result = data as DocumentAskResult | null;
  return { answer: result?.answer ?? '', sources: result?.sources ?? [] };
}
