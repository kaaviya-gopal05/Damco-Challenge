-- Row Level Security. Every table is locked down: a user can only ever see/modify their own
-- rows. Global catalogue tables (skills, interview_questions, youtube_resources) are readable
-- by any authenticated user and writable by none from the client. See CLAUDE.md §7.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- insert happens via the handle_new_user trigger (security definer), no client insert policy.

-- ---------------------------------------------------------------------------
-- learning_goals
-- ---------------------------------------------------------------------------
alter table learning_goals enable row level security;

create policy "learning_goals_select_own" on learning_goals
  for select using (auth.uid() = user_id);
create policy "learning_goals_insert_own" on learning_goals
  for insert with check (auth.uid() = user_id);
create policy "learning_goals_update_own" on learning_goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "learning_goals_delete_own" on learning_goals
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- roadmaps
-- ---------------------------------------------------------------------------
alter table roadmaps enable row level security;

create policy "roadmaps_select_own" on roadmaps
  for select using (auth.uid() = user_id);
create policy "roadmaps_insert_own" on roadmaps
  for insert with check (auth.uid() = user_id);
create policy "roadmaps_update_own" on roadmaps
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "roadmaps_delete_own" on roadmaps
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- roadmap_phases (ownership via parent roadmap)
-- ---------------------------------------------------------------------------
alter table roadmap_phases enable row level security;

create policy "roadmap_phases_select_own" on roadmap_phases
  for select using (
    exists (select 1 from roadmaps r where r.id = roadmap_phases.roadmap_id and r.user_id = auth.uid())
  );
create policy "roadmap_phases_insert_own" on roadmap_phases
  for insert with check (
    exists (select 1 from roadmaps r where r.id = roadmap_phases.roadmap_id and r.user_id = auth.uid())
  );
create policy "roadmap_phases_update_own" on roadmap_phases
  for update using (
    exists (select 1 from roadmaps r where r.id = roadmap_phases.roadmap_id and r.user_id = auth.uid())
  ) with check (
    exists (select 1 from roadmaps r where r.id = roadmap_phases.roadmap_id and r.user_id = auth.uid())
  );
create policy "roadmap_phases_delete_own" on roadmap_phases
  for delete using (
    exists (select 1 from roadmaps r where r.id = roadmap_phases.roadmap_id and r.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- roadmap_tasks (ownership via phase -> roadmap)
-- ---------------------------------------------------------------------------
alter table roadmap_tasks enable row level security;

create policy "roadmap_tasks_select_own" on roadmap_tasks
  for select using (
    exists (
      select 1 from roadmap_phases p
      join roadmaps r on r.id = p.roadmap_id
      where p.id = roadmap_tasks.phase_id and r.user_id = auth.uid()
    )
  );
create policy "roadmap_tasks_insert_own" on roadmap_tasks
  for insert with check (
    exists (
      select 1 from roadmap_phases p
      join roadmaps r on r.id = p.roadmap_id
      where p.id = roadmap_tasks.phase_id and r.user_id = auth.uid()
    )
  );
create policy "roadmap_tasks_update_own" on roadmap_tasks
  for update using (
    exists (
      select 1 from roadmap_phases p
      join roadmaps r on r.id = p.roadmap_id
      where p.id = roadmap_tasks.phase_id and r.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from roadmap_phases p
      join roadmaps r on r.id = p.roadmap_id
      where p.id = roadmap_tasks.phase_id and r.user_id = auth.uid()
    )
  );
create policy "roadmap_tasks_delete_own" on roadmap_tasks
  for delete using (
    exists (
      select 1 from roadmap_phases p
      join roadmaps r on r.id = p.roadmap_id
      where p.id = roadmap_tasks.phase_id and r.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- mind_maps
-- ---------------------------------------------------------------------------
alter table mind_maps enable row level security;

create policy "mind_maps_select_own" on mind_maps
  for select using (auth.uid() = user_id);
create policy "mind_maps_insert_own" on mind_maps
  for insert with check (auth.uid() = user_id);
create policy "mind_maps_update_own" on mind_maps
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mind_maps_delete_own" on mind_maps
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- mind_map_nodes (ownership via parent mind_map)
-- ---------------------------------------------------------------------------
alter table mind_map_nodes enable row level security;

create policy "mind_map_nodes_select_own" on mind_map_nodes
  for select using (
    exists (select 1 from mind_maps m where m.id = mind_map_nodes.mind_map_id and m.user_id = auth.uid())
  );
create policy "mind_map_nodes_insert_own" on mind_map_nodes
  for insert with check (
    exists (select 1 from mind_maps m where m.id = mind_map_nodes.mind_map_id and m.user_id = auth.uid())
  );
create policy "mind_map_nodes_update_own" on mind_map_nodes
  for update using (
    exists (select 1 from mind_maps m where m.id = mind_map_nodes.mind_map_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from mind_maps m where m.id = mind_map_nodes.mind_map_id and m.user_id = auth.uid())
  );
create policy "mind_map_nodes_delete_own" on mind_map_nodes
  for delete using (
    exists (select 1 from mind_maps m where m.id = mind_map_nodes.mind_map_id and m.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- flashcard_decks
-- ---------------------------------------------------------------------------
alter table flashcard_decks enable row level security;

create policy "flashcard_decks_select_own" on flashcard_decks
  for select using (auth.uid() = user_id);
create policy "flashcard_decks_insert_own" on flashcard_decks
  for insert with check (auth.uid() = user_id);
create policy "flashcard_decks_update_own" on flashcard_decks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "flashcard_decks_delete_own" on flashcard_decks
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- flashcards (ownership via parent deck)
-- ---------------------------------------------------------------------------
alter table flashcards enable row level security;

create policy "flashcards_select_own" on flashcards
  for select using (
    exists (select 1 from flashcard_decks d where d.id = flashcards.deck_id and d.user_id = auth.uid())
  );
create policy "flashcards_insert_own" on flashcards
  for insert with check (
    exists (select 1 from flashcard_decks d where d.id = flashcards.deck_id and d.user_id = auth.uid())
  );
create policy "flashcards_update_own" on flashcards
  for update using (
    exists (select 1 from flashcard_decks d where d.id = flashcards.deck_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from flashcard_decks d where d.id = flashcards.deck_id and d.user_id = auth.uid())
  );
create policy "flashcards_delete_own" on flashcards
  for delete using (
    exists (select 1 from flashcard_decks d where d.id = flashcards.deck_id and d.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- flashcard_reviews (directly user-owned)
-- ---------------------------------------------------------------------------
alter table flashcard_reviews enable row level security;

create policy "flashcard_reviews_select_own" on flashcard_reviews
  for select using (auth.uid() = user_id);
create policy "flashcard_reviews_insert_own" on flashcard_reviews
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
alter table documents enable row level security;

create policy "documents_select_own" on documents
  for select using (auth.uid() = user_id);
create policy "documents_insert_own" on documents
  for insert with check (auth.uid() = user_id);
create policy "documents_update_own" on documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "documents_delete_own" on documents
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- document_chunks / document_insights (ownership via parent document)
-- ---------------------------------------------------------------------------
alter table document_chunks enable row level security;

create policy "document_chunks_select_own" on document_chunks
  for select using (
    exists (select 1 from documents d where d.id = document_chunks.document_id and d.user_id = auth.uid())
  );
create policy "document_chunks_insert_own" on document_chunks
  for insert with check (
    exists (select 1 from documents d where d.id = document_chunks.document_id and d.user_id = auth.uid())
  );
create policy "document_chunks_delete_own" on document_chunks
  for delete using (
    exists (select 1 from documents d where d.id = document_chunks.document_id and d.user_id = auth.uid())
  );

alter table document_insights enable row level security;

create policy "document_insights_select_own" on document_insights
  for select using (
    exists (select 1 from documents d where d.id = document_insights.document_id and d.user_id = auth.uid())
  );
create policy "document_insights_insert_own" on document_insights
  for insert with check (
    exists (select 1 from documents d where d.id = document_insights.document_id and d.user_id = auth.uid())
  );
create policy "document_insights_delete_own" on document_insights
  for delete using (
    exists (select 1 from documents d where d.id = document_insights.document_id and d.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- youtube_resources — global catalogue, readable by any authenticated user,
-- writable only by the client when caching a freshly-fetched video (insert-only,
-- no update/delete from the client).
-- ---------------------------------------------------------------------------
alter table youtube_resources enable row level security;

create policy "youtube_resources_select_authenticated" on youtube_resources
  for select using (auth.role() = 'authenticated');
create policy "youtube_resources_insert_authenticated" on youtube_resources
  for insert with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- saved_resources
-- ---------------------------------------------------------------------------
alter table saved_resources enable row level security;

create policy "saved_resources_select_own" on saved_resources
  for select using (auth.uid() = user_id);
create policy "saved_resources_insert_own" on saved_resources
  for insert with check (auth.uid() = user_id);
create policy "saved_resources_delete_own" on saved_resources
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- career_profiles
-- ---------------------------------------------------------------------------
alter table career_profiles enable row level security;

create policy "career_profiles_select_own" on career_profiles
  for select using (auth.uid() = user_id);
create policy "career_profiles_insert_own" on career_profiles
  for insert with check (auth.uid() = user_id);
create policy "career_profiles_update_own" on career_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "career_profiles_delete_own" on career_profiles
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- skills — global catalogue, read-only from the client
-- ---------------------------------------------------------------------------
alter table skills enable row level security;

create policy "skills_select_authenticated" on skills
  for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- user_skills
-- ---------------------------------------------------------------------------
alter table user_skills enable row level security;

create policy "user_skills_select_own" on user_skills
  for select using (auth.uid() = user_id);
create policy "user_skills_insert_own" on user_skills
  for insert with check (auth.uid() = user_id);
create policy "user_skills_update_own" on user_skills
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_skills_delete_own" on user_skills
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- interview_questions — global catalogue, read-only from the client
-- ---------------------------------------------------------------------------
alter table interview_questions enable row level security;

create policy "interview_questions_select_authenticated" on interview_questions
  for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- interview_question_attempts
-- ---------------------------------------------------------------------------
alter table interview_question_attempts enable row level security;

create policy "interview_question_attempts_select_own" on interview_question_attempts
  for select using (auth.uid() = user_id);
create policy "interview_question_attempts_insert_own" on interview_question_attempts
  for insert with check (auth.uid() = user_id);
create policy "interview_question_attempts_update_own" on interview_question_attempts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- learning_activity
-- ---------------------------------------------------------------------------
alter table learning_activity enable row level security;

create policy "learning_activity_select_own" on learning_activity
  for select using (auth.uid() = user_id);
create policy "learning_activity_insert_own" on learning_activity
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_progress
-- ---------------------------------------------------------------------------
alter table user_progress enable row level security;

create policy "user_progress_select_own" on user_progress
  for select using (auth.uid() = user_id);
create policy "user_progress_insert_own" on user_progress
  for insert with check (auth.uid() = user_id);
create policy "user_progress_update_own" on user_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: 'documents' bucket, private, per-user folder prefix
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_bucket_select_own" on storage.objects
  for select using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "documents_bucket_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "documents_bucket_delete_own" on storage.objects
  for delete using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
