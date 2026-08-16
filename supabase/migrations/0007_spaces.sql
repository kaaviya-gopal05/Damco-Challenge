-- Spaces: a NotebookLM-style unified workspace per learning goal. A space owns a persisted
-- chat transcript plus whichever of the 5 artifact types (roadmap, mind map, flashcard deck,
-- document, career profile) the learner generates from it, linked via nullable space_id FKs
-- on the existing content tables so nothing about those tables' own ownership/RLS changes.

create table spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  goal_text text,
  deadline date,
  hours_per_day numeric,
  level text check (level in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index spaces_user_id_idx on spaces(user_id);
create trigger spaces_set_updated_at
  before update on spaces
  for each row execute function set_updated_at();

create table space_messages (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index space_messages_space_id_idx on space_messages(space_id);

alter table roadmaps add column space_id uuid references spaces(id) on delete set null;
alter table mind_maps add column space_id uuid references spaces(id) on delete set null;
alter table flashcard_decks add column space_id uuid references spaces(id) on delete set null;
alter table documents add column space_id uuid references spaces(id) on delete set null;
alter table career_profiles add column space_id uuid references spaces(id) on delete set null;

create index roadmaps_space_id_idx on roadmaps(space_id);
create index mind_maps_space_id_idx on mind_maps(space_id);
create index flashcard_decks_space_id_idx on flashcard_decks(space_id);
create index documents_space_id_idx on documents(space_id);
create index career_profiles_space_id_idx on career_profiles(space_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table spaces enable row level security;

create policy "spaces_select_own" on spaces
  for select using (auth.uid() = user_id);
create policy "spaces_insert_own" on spaces
  for insert with check (auth.uid() = user_id);
create policy "spaces_update_own" on spaces
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "spaces_delete_own" on spaces
  for delete using (auth.uid() = user_id);

alter table space_messages enable row level security;

create policy "space_messages_select_own" on space_messages
  for select using (exists (select 1 from spaces where spaces.id = space_messages.space_id and spaces.user_id = auth.uid()));
create policy "space_messages_insert_own" on space_messages
  for insert with check (exists (select 1 from spaces where spaces.id = space_messages.space_id and spaces.user_id = auth.uid()));
create policy "space_messages_delete_own" on space_messages
  for delete using (exists (select 1 from spaces where spaces.id = space_messages.space_id and spaces.user_id = auth.uid()));
