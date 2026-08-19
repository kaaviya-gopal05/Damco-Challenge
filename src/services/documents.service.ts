import { supabase, DOCUMENTS_BUCKET } from '@/lib/supabase';
import { extractTextFromPdf } from '@/lib/pdf';
import { getAiService } from '@/services/ai.service';
import { logActivity } from '@/services/activity.service';
import type { Document, DocumentInsight, InsightKind } from '@/types/database';

export const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const CHUNK_SIZE = 2000;

export async function listDocuments(userId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Document[];
}

export interface DocumentWithInsights {
  document: Document;
  insights: DocumentInsight[];
}

export async function getDocument(documentId: string): Promise<DocumentWithInsights> {
  const [{ data: document, error: docError }, { data: insights, error: insightsError }] = await Promise.all([
    supabase.from('documents').select('*').eq('id', documentId).single(),
    supabase.from('document_insights').select('*').eq('document_id', documentId),
  ]);
  if (docError) throw docError;
  if (insightsError) throw insightsError;
  return { document: document as Document, insights: (insights ?? []) as DocumentInsight[] };
}

export async function getDocumentSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(filePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function getDocumentFullText(documentId: string): Promise<string> {
  const { data, error } = await supabase
    .from('document_chunks')
    .select('content')
    .eq('document_id', documentId)
    .order('chunk_index');
  if (error) throw error;
  return (data ?? []).map((c) => c.content).join('\n\n');
}

export interface UploadDocumentResult {
  document: Document;
}

export async function uploadDocument(userId: string, file: File, spaceId?: string): Promise<UploadDocumentResult> {
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are supported.');
  }
  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error('File is too large. Maximum size is 20MB.');
  }

  const filePath = `${userId}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data: document, error: insertError } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      title: file.name.replace(/\.pdf$/i, ''),
      file_path: filePath,
      file_size_bytes: file.size,
      status: 'processing',
      space_id: spaceId ?? null,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  await logActivity({ userId, activityType: 'document_uploaded', metadata: { documentId: document.id } });

  processDocumentInBackground(document as Document, file).catch(async () => {
    await supabase.from('documents').update({ status: 'failed' }).eq('id', document.id);
  });

  return { document: document as Document };
}

async function processDocumentInBackground(document: Document, file: File): Promise<void> {
  const { text, pageCount } = await extractTextFromPdf(file);

  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }
  if (chunks.length > 0) {
    const { error: chunksError } = await supabase.from('document_chunks').insert(
      chunks.map((content, index) => ({ document_id: document.id, chunk_index: index, content }))
    );
    if (chunksError) throw chunksError;
    // Fire-and-forget: embedding failures shouldn't block the document from finishing upload —
    // "Ask Your Documents" just won't be able to find this one yet. A future ask can be retried
    // through document-embed since it only ever processes chunks with a still-null embedding.
    supabase.functions.invoke('document-embed', { body: { documentId: document.id } }).catch(() => {});
  }

  const ai = getAiService();
  const usableText = text.trim().length > 0 ? text : `${document.title} (no extractable text found in this PDF).`;

  const [summary, keyPoints, qa, quiz] = await Promise.all([
    ai.summarizeDocument(usableText, document.title),
    ai.extractKeyPoints(usableText),
    ai.generateQa(usableText),
    ai.generateQuiz(usableText),
  ]);

  const insightRows: { document_id: string; kind: InsightKind; content: unknown }[] = [
    { document_id: document.id, kind: 'summary', content: { text: summary } },
    { document_id: document.id, kind: 'key_points', content: keyPoints },
    { document_id: document.id, kind: 'qa', content: qa },
    { document_id: document.id, kind: 'quiz', content: quiz },
  ];
  const { error: insightsError } = await supabase.from('document_insights').insert(insightRows);
  if (insightsError) throw insightsError;

  const { error: statusError } = await supabase
    .from('documents')
    .update({ status: 'ready', page_count: pageCount })
    .eq('id', document.id);
  if (statusError) throw statusError;
}

export async function deleteDocument(document: Document): Promise<void> {
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([document.file_path]);
  const { error } = await supabase.from('documents').delete().eq('id', document.id);
  if (error) throw error;
}

export async function markDocumentStudied(userId: string, documentId: string): Promise<void> {
  await logActivity({ userId, activityType: 'document_studied', metadata: { documentId } });
}
