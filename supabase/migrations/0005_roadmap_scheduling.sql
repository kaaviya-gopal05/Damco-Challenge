-- Adds the fields needed to compute a per-task study schedule: how many hours per day the
-- learner committed to at roadmap-generation time, and how many hours the AI estimated each
-- task takes. Scheduled dates themselves are derived client-side (roadmap.created_at +
-- cumulative estimated_hours / hours_per_day) rather than stored, so they stay correct as
-- tasks are added, edited, or reordered. RLS already covers both tables via their existing
-- ownership policies, so no new policies are needed.

alter table roadmaps
  add column hours_per_day numeric;

alter table roadmap_tasks
  add column estimated_hours numeric not null default 2;
