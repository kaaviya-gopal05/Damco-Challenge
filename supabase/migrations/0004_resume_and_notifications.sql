-- Adds resume-analysis storage to career_profiles (extracted resume text, AI-derived
-- strengths/gaps/skill assessments as jsonb, and file/analyzed metadata) and expands the
-- learning_activity activity_type check constraint with three new event types used to power
-- the notification bell: mind_map_created, flashcard_deck_created, resume_analyzed.
-- RLS already covers both tables via their existing ownership policies, so no new policies
-- are needed for these additive columns/values.

alter table career_profiles
  add column resume_text text,
  add column resume_file_name text,
  add column resume_analysis jsonb,
  add column resume_analyzed_at timestamptz;

alter table learning_activity
  drop constraint if exists learning_activity_activity_type_check;

alter table learning_activity
  add constraint learning_activity_activity_type_check check (
    activity_type in (
      'task_completed', 'flashcard_reviewed', 'document_uploaded', 'document_studied',
      'video_watched', 'video_saved', 'mind_map_edited', 'mind_map_created',
      'flashcard_deck_created', 'roadmap_created', 'interview_question_practiced',
      'resume_analyzed'
    )
  );
