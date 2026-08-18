-- To-do tasks: AI-organized, priority-ranked tasks captured via voice or text through the
-- "To-do Task List" widget in a space's chat. Flat rows rather than a parent/child "list"
-- entity, since a learner just keeps adding to one running list per space over time.

create table todo_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid not null references spaces(id) on delete cascade,
  title text not null,
  priority text not null check (priority in ('high', 'medium', 'low')),
  due_date date,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index todo_tasks_user_id_idx on todo_tasks(user_id);
create index todo_tasks_space_id_idx on todo_tasks(space_id);
create index todo_tasks_due_date_idx on todo_tasks(due_date);

create trigger todo_tasks_set_updated_at
  before update on todo_tasks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table todo_tasks enable row level security;

create policy "todo_tasks_select_own" on todo_tasks
  for select using (auth.uid() = user_id);
create policy "todo_tasks_insert_own" on todo_tasks
  for insert with check (auth.uid() = user_id);
create policy "todo_tasks_update_own" on todo_tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "todo_tasks_delete_own" on todo_tasks
  for delete using (auth.uid() = user_id);
