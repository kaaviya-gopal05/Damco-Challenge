-- Autonomous agent system: email-derived learning signals + the multi-agent orchestration
-- workflow that acts on them. Access tokens are only ever written/read by the edge functions
-- (gmail-oauth-callback, gmail-fetch-messages), which encrypt them with AES-GCM using the
-- server-only GMAIL_TOKEN_ENCRYPTION_KEY secret before they ever reach Postgres — this table
-- always stores ciphertext, never a raw token. RLS still restricts every row to its owner,
-- same as everywhere else in this app, as defense in depth.

-- ---------------------------------------------------------------------------
-- email_monitoring_jobs — learning goals the email-monitoring agent extracted from Gmail
-- ---------------------------------------------------------------------------
create table email_monitoring_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gmail_message_id text not null,
  sender text,
  subject text,
  snippet text,
  learning_goal text,
  urgency text check (urgency in ('low', 'medium', 'high')),
  confidence numeric,
  context text,
  suggested_actions jsonb not null default '[]',
  roadmap_id uuid references roadmaps(id) on delete set null,
  is_dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, gmail_message_id)
);

create index email_monitoring_jobs_user_id_idx on email_monitoring_jobs(user_id);
create index email_monitoring_jobs_is_dismissed_idx on email_monitoring_jobs(is_dismissed);

create trigger email_monitoring_jobs_set_updated_at
  before update on email_monitoring_jobs
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- agent_executions — an append-only log of every agent node run, for monitoring/analytics
-- ---------------------------------------------------------------------------
create table agent_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid references spaces(id) on delete cascade,
  agent_name text not null check (
    agent_name in ('emailMonitor', 'socraticTutor', 'practice', 'research', 'coach')
  ),
  status text not null check (status in ('success', 'error')),
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  error_message text,
  duration_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create index agent_executions_user_id_idx on agent_executions(user_id);
create index agent_executions_agent_name_idx on agent_executions(agent_name);
create index agent_executions_created_at_idx on agent_executions(created_at);

-- ---------------------------------------------------------------------------
-- gmail_oauth_tokens — one encrypted connection per user
-- ---------------------------------------------------------------------------
create table gmail_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  -- Each column holds "<base64 iv>:<base64 AES-GCM ciphertext>" — see supabase/functions/_shared/crypto.ts.
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expires_at timestamptz not null,
  gmail_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gmail_oauth_tokens_user_id_idx on gmail_oauth_tokens(user_id);

create trigger gmail_oauth_tokens_set_updated_at
  before update on gmail_oauth_tokens
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- agent_task_queue — work items for agent-cron-check to pick up and process
-- ---------------------------------------------------------------------------
create table agent_task_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_type text not null check (
    task_type in ('email_scan', 'run_orchestrator', 'generate_roadmap_from_email')
  ),
  payload jsonb not null default '{}',
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'completed', 'failed')
  ),
  attempts integer not null default 0,
  last_error text,
  scheduled_for timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agent_task_queue_user_id_idx on agent_task_queue(user_id);
create index agent_task_queue_status_idx on agent_task_queue(status);
create index agent_task_queue_scheduled_for_idx on agent_task_queue(scheduled_for);

create trigger agent_task_queue_set_updated_at
  before update on agent_task_queue
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table email_monitoring_jobs enable row level security;
alter table agent_executions enable row level security;
alter table gmail_oauth_tokens enable row level security;
alter table agent_task_queue enable row level security;

create policy "email_monitoring_jobs_select_own" on email_monitoring_jobs
  for select using (auth.uid() = user_id);
create policy "email_monitoring_jobs_insert_own" on email_monitoring_jobs
  for insert with check (auth.uid() = user_id);
create policy "email_monitoring_jobs_update_own" on email_monitoring_jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "email_monitoring_jobs_delete_own" on email_monitoring_jobs
  for delete using (auth.uid() = user_id);

create policy "agent_executions_select_own" on agent_executions
  for select using (auth.uid() = user_id);
create policy "agent_executions_insert_own" on agent_executions
  for insert with check (auth.uid() = user_id);

create policy "gmail_oauth_tokens_select_own" on gmail_oauth_tokens
  for select using (auth.uid() = user_id);
create policy "gmail_oauth_tokens_insert_own" on gmail_oauth_tokens
  for insert with check (auth.uid() = user_id);
create policy "gmail_oauth_tokens_update_own" on gmail_oauth_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gmail_oauth_tokens_delete_own" on gmail_oauth_tokens
  for delete using (auth.uid() = user_id);

create policy "agent_task_queue_select_own" on agent_task_queue
  for select using (auth.uid() = user_id);
create policy "agent_task_queue_insert_own" on agent_task_queue
  for insert with check (auth.uid() = user_id);
create policy "agent_task_queue_update_own" on agent_task_queue
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "agent_task_queue_delete_own" on agent_task_queue
  for delete using (auth.uid() = user_id);
