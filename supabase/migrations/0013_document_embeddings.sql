-- RAG over uploaded PDFs: every document_chunks row gets a 768-dim embedding (Gemini's
-- text-embedding-004) so a learner's question can be matched against the most relevant
-- passages across every PDF they've uploaded, not just one document at a time.

create extension if not exists vector;

alter table document_chunks add column embedding vector(768);

-- Update policy was missing before — document_chunks previously only needed select/insert/delete
-- (chunks were written once at upload and never touched again). Embeddings are backfilled by a
-- separate step right after upload, so chunk rows now need to be updatable by their owner too.
create policy "document_chunks_update_own" on document_chunks
  for update using (
    exists (select 1 from documents d where d.id = document_chunks.document_id and d.user_id = auth.uid())
  );

-- Brute-force cosine-distance search scoped to one user's own chunks. No specialized index
-- (ivfflat/hnsw) at this table size — a personal learner's document count is small enough that a
-- plain sequential scan over their own rows is both simpler and fast enough, and skips the
-- "needs enough rows to train well" caveat that comes with ivfflat on a small/empty table.
create or replace function match_document_chunks(
  query_embedding vector(768),
  p_user_id uuid,
  p_document_id uuid default null,
  match_count int default 6
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  chunk_index int,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    dc.id,
    dc.document_id,
    d.title,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where d.user_id = p_user_id
    and dc.embedding is not null
    and (p_document_id is null or dc.document_id = p_document_id)
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
