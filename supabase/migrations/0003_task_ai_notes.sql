-- Adds a cache column for AI-generated study notes on a roadmap task. Notes are generated
-- on-demand the first time a learner opens a task, then persisted here so re-opening the task
-- doesn't re-call the AI service. RLS already covers this table via roadmap_tasks' existing
-- policies (ownership via phase -> roadmap), so no new policies are needed.

alter table roadmap_tasks add column ai_notes text;
