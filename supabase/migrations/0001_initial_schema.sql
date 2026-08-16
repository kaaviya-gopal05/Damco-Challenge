-- AI Learning Workspace — initial schema
-- Conventions: uuid primary keys, created_at/updated_at timestamps, indexes on FKs and
-- frequently-filtered columns. See ARCHITECTURE.md §4 for the entity-relationship overview.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at current on every row update
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — 1:1 mirror of auth.users for app-specific fields
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  headline text,
  timezone text default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row whenever a new auth user is created.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- learning_goals
-- ---------------------------------------------------------------------------
create table learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text,
  target_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learning_goals_user_id_idx on learning_goals(user_id);
create trigger learning_goals_set_updated_at
  before update on learning_goals
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- roadmaps / roadmap_phases / roadmap_tasks
-- ---------------------------------------------------------------------------
create table roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references learning_goals(id) on delete set null,
  title text not null,
  description text,
  estimated_duration_weeks int,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index roadmaps_user_id_idx on roadmaps(user_id);
create index roadmaps_goal_id_idx on roadmaps(goal_id);
create trigger roadmaps_set_updated_at
  before update on roadmaps
  for each row execute function set_updated_at();

create table roadmap_phases (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references roadmaps(id) on delete cascade,
  title text not null,
  description text,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index roadmap_phases_roadmap_id_idx on roadmap_phases(roadmap_id);
create trigger roadmap_phases_set_updated_at
  before update on roadmap_phases
  for each row execute function set_updated_at();

create table roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references roadmap_phases(id) on delete cascade,
  title text not null,
  description text,
  resources jsonb not null default '[]'::jsonb,
  order_index int not null default 0,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index roadmap_tasks_phase_id_idx on roadmap_tasks(phase_id);
create index roadmap_tasks_is_completed_idx on roadmap_tasks(is_completed);
create trigger roadmap_tasks_set_updated_at
  before update on roadmap_tasks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- mind_maps / mind_map_nodes
-- ---------------------------------------------------------------------------
create table mind_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mind_maps_user_id_idx on mind_maps(user_id);
create trigger mind_maps_set_updated_at
  before update on mind_maps
  for each row execute function set_updated_at();

create table mind_map_nodes (
  id uuid primary key default gen_random_uuid(),
  mind_map_id uuid not null references mind_maps(id) on delete cascade,
  parent_id uuid references mind_map_nodes(id) on delete cascade,
  label text not null,
  notes text,
  color text,
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  is_collapsed boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mind_map_nodes_mind_map_id_idx on mind_map_nodes(mind_map_id);
create index mind_map_nodes_parent_id_idx on mind_map_nodes(parent_id);
create trigger mind_map_nodes_set_updated_at
  before update on mind_map_nodes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- flashcard_decks / flashcards / flashcard_reviews
-- ---------------------------------------------------------------------------
create table flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  roadmap_id uuid references roadmaps(id) on delete set null,
  document_id uuid,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index flashcard_decks_user_id_idx on flashcard_decks(user_id);
create trigger flashcard_decks_set_updated_at
  before update on flashcard_decks
  for each row execute function set_updated_at();

create table flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references flashcard_decks(id) on delete cascade,
  front text not null,
  back text not null,
  status text not null default 'new' check (status in ('new', 'learning', 'mastered')),
  interval_days int not null default 0,
  ease_factor numeric not null default 2.5,
  repetitions int not null default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index flashcards_deck_id_idx on flashcards(deck_id);
create index flashcards_next_review_at_idx on flashcards(next_review_at);
create index flashcards_status_idx on flashcards(status);
create trigger flashcards_set_updated_at
  before update on flashcards
  for each row execute function set_updated_at();

create table flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  flashcard_id uuid not null references flashcards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating text not null check (rating in ('again', 'hard', 'medium', 'easy')),
  previous_interval_days int not null default 0,
  new_interval_days int not null default 0,
  reviewed_at timestamptz not null default now()
);

create index flashcard_reviews_flashcard_id_idx on flashcard_reviews(flashcard_id);
create index flashcard_reviews_user_id_idx on flashcard_reviews(user_id);

-- ---------------------------------------------------------------------------
-- documents / document_chunks / document_insights
-- ---------------------------------------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  file_path text not null,
  file_size_bytes bigint,
  page_count int,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_user_id_idx on documents(user_id);
create trigger documents_set_updated_at
  before update on documents
  for each row execute function set_updated_at();

alter table flashcard_decks
  add constraint flashcard_decks_document_id_fkey
  foreign key (document_id) references documents(id) on delete set null;

create index flashcard_decks_document_id_idx on flashcard_decks(document_id);

create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index int not null default 0,
  content text not null,
  created_at timestamptz not null default now()
);

create index document_chunks_document_id_idx on document_chunks(document_id);

create table document_insights (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  kind text not null check (kind in ('summary', 'key_points', 'qa', 'quiz')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index document_insights_document_id_idx on document_insights(document_id);
create index document_insights_kind_idx on document_insights(kind);

-- ---------------------------------------------------------------------------
-- youtube_resources (global cache, not user-owned) / saved_resources (user N:N)
-- ---------------------------------------------------------------------------
create table youtube_resources (
  id uuid primary key default gen_random_uuid(),
  video_id text not null unique,
  title text not null,
  channel_title text not null,
  thumbnail_url text,
  description text,
  duration_seconds int,
  topic text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  category text check (
    category in ('beginner', 'intermediate', 'advanced', 'interview_prep', 'project_tutorial')
  ),
  source text not null default 'mock' check (source in ('mock', 'api')),
  created_at timestamptz not null default now()
);

create index youtube_resources_topic_idx on youtube_resources(topic);
create index youtube_resources_category_idx on youtube_resources(category);

create table saved_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  youtube_resource_id uuid not null references youtube_resources(id) on delete cascade,
  notes text,
  saved_at timestamptz not null default now(),
  unique (user_id, youtube_resource_id)
);

create index saved_resources_user_id_idx on saved_resources(user_id);
create index saved_resources_youtube_resource_id_idx on saved_resources(youtube_resource_id);

-- ---------------------------------------------------------------------------
-- career_profiles / skills / user_skills / interview_questions / attempts
-- ---------------------------------------------------------------------------
create table career_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  career_track text not null,
  target_role text,
  current_level text check (current_level in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, career_track)
);

create index career_profiles_user_id_idx on career_profiles(user_id);
create trigger career_profiles_set_updated_at
  before update on career_profiles
  for each row execute function set_updated_at();

create table skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  description text,
  created_at timestamptz not null default now()
);

create table user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  career_profile_id uuid references career_profiles(id) on delete cascade,
  current_level int not null default 0 check (current_level between 0 and 5),
  target_level int not null default 3 check (target_level between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, skill_id, career_profile_id)
);

create index user_skills_user_id_idx on user_skills(user_id);
create index user_skills_skill_id_idx on user_skills(skill_id);
create index user_skills_career_profile_id_idx on user_skills(career_profile_id);
create trigger user_skills_set_updated_at
  before update on user_skills
  for each row execute function set_updated_at();

create table interview_questions (
  id uuid primary key default gen_random_uuid(),
  career_track text not null,
  category text not null check (
    category in ('technical', 'behavioral', 'system_design', 'coding', 'resume', 'hr')
  ),
  question text not null,
  sample_answer text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now()
);

create index interview_questions_career_track_idx on interview_questions(career_track);
create index interview_questions_category_idx on interview_questions(category);

create table interview_question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references interview_questions(id) on delete cascade,
  status text not null default 'practiced' check (status in ('practiced', 'mastered')),
  notes text,
  attempted_at timestamptz not null default now()
);

create index interview_question_attempts_user_id_idx on interview_question_attempts(user_id);
create index interview_question_attempts_question_id_idx on interview_question_attempts(question_id);

-- ---------------------------------------------------------------------------
-- learning_activity (event log) / user_progress (daily rollup)
-- ---------------------------------------------------------------------------
create table learning_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (
    activity_type in (
      'task_completed', 'flashcard_reviewed', 'document_uploaded', 'document_studied',
      'video_watched', 'video_saved', 'mind_map_edited', 'roadmap_created',
      'interview_question_practiced'
    )
  ),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index learning_activity_user_id_idx on learning_activity(user_id);
create index learning_activity_occurred_at_idx on learning_activity(occurred_at);
create index learning_activity_type_idx on learning_activity(activity_type);

create table user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  minutes_studied int not null default 0,
  tasks_completed int not null default 0,
  flashcards_reviewed int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index user_progress_user_id_idx on user_progress(user_id);
create index user_progress_date_idx on user_progress(date);
create trigger user_progress_set_updated_at
  before update on user_progress
  for each row execute function set_updated_at();
