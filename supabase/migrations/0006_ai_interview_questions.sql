-- Interview prep moves from a static, globally-seeded question bank to AI-generated
-- questions tailored to the learner's target role and resume gaps. Generated questions
-- (all 6 categories at once) are stored as a jsonb array directly on career_profiles,
-- each item carrying its own practiced/mastered status, so no join table or FK to the
-- old global interview_questions catalogue is needed. RLS already covers career_profiles
-- via its existing ownership policy, so no new policies are needed.

alter table career_profiles
  add column interview_questions_generated jsonb,
  add column interview_questions_generated_at timestamptz;
