-- Weekly Plan: a real autonomous feature — generating a plan doesn't just suggest something,
-- it deterministically rebalances the learner's overdue/this-week to-do tasks across the next
-- 7 days (see src/services/weeklyPlan.service.ts) and records what it did, alongside an
-- AI-written summary of the resulting week.

create table weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  summary text not null,
  daily_rhythm text,
  rescheduled_count int not null default 0,
  focus_items jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index weekly_plans_user_id_idx on weekly_plans(user_id);
create index weekly_plans_week_start_idx on weekly_plans(week_start);

alter table weekly_plans enable row level security;

create policy "weekly_plans_select_own" on weekly_plans
  for select using (auth.uid() = user_id);
create policy "weekly_plans_insert_own" on weekly_plans
  for insert with check (auth.uid() = user_id);
create policy "weekly_plans_delete_own" on weekly_plans
  for delete using (auth.uid() = user_id);
