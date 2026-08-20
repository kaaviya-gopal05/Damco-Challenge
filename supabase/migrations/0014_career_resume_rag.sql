-- Career Intelligence redesign: resumes are now created only through the Spaces chat flow, and
-- the analysis is grounded via the same RAG pipeline (document_chunks + pgvector) that already
-- powers document embeddings — reusing infrastructure rather than building a parallel one.

alter table career_profiles
  add column job_description text,
  add column resume_document_id uuid references documents(id) on delete set null;

-- Resumes are stored as ordinary `documents` rows (so they can reuse chunking/embedding
-- unmodified) but must never surface in the general Documents/Memory UI, which only ever
-- expects real uploaded study material.
alter table documents
  add column is_resume boolean not null default false;
