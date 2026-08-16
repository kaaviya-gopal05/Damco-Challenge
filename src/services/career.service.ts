import { supabase } from '@/lib/supabase';
import { logActivity } from '@/services/activity.service';
import { getAiService } from '@/services/ai.service';
import type {
  CareerProfile,
  GeneratedInterviewQuestion,
  QuestionStatus,
  ResumeAnalysisResult,
  Skill,
  UserSkill,
} from '@/types/database';

export async function listCareerProfiles(userId: string): Promise<CareerProfile[]> {
  const { data, error } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CareerProfile[];
}

export async function getOrCreateCareerProfile(userId: string, careerTrack: string, spaceId?: string): Promise<CareerProfile> {
  const { data: existing, error: fetchError } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('career_track', careerTrack)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (existing) return existing as CareerProfile;

  const { data, error } = await supabase
    .from('career_profiles')
    .insert({ user_id: userId, career_track: careerTrack, current_level: 'beginner', space_id: spaceId ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as CareerProfile;
}

export async function listSkills(): Promise<Skill[]> {
  const { data, error } = await supabase.from('skills').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as Skill[];
}

export async function listUserSkills(userId: string, careerProfileId: string): Promise<UserSkill[]> {
  const { data, error } = await supabase
    .from('user_skills')
    .select('*')
    .eq('user_id', userId)
    .eq('career_profile_id', careerProfileId);
  if (error) throw error;
  return (data ?? []) as UserSkill[];
}

export async function upsertUserSkill(
  userId: string,
  careerProfileId: string,
  skillId: string,
  currentLevel: number,
  targetLevel: number
): Promise<UserSkill> {
  const { data, error } = await supabase
    .from('user_skills')
    .upsert(
      {
        user_id: userId,
        career_profile_id: careerProfileId,
        skill_id: skillId,
        current_level: currentLevel,
        target_level: targetLevel,
      },
      { onConflict: 'user_id,skill_id,career_profile_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as UserSkill;
}

// skills is a read-only global catalogue from the client (see CLAUDE.md §7) — only match
// against it, never insert. Resume-derived skills with no catalogue match still show up in
// the strengths/gaps summary (stored directly on career_profiles); they just won't appear
// as a row in the Skill Gap matrix.
async function findSkillByName(name: string): Promise<Skill | null> {
  const { data, error } = await supabase.from('skills').select('*').ilike('name', name).maybeSingle();
  if (error) throw error;
  return (data as Skill | null) ?? null;
}

export async function analyzeAndSaveResume(
  userId: string,
  careerProfile: CareerProfile,
  resumeText: string,
  fileName: string,
  roleLabel: string
): Promise<{ careerProfile: CareerProfile; analysis: ResumeAnalysisResult }> {
  const ai = getAiService();
  const analysis = await ai.analyzeResume(resumeText, roleLabel);

  const { data: updatedProfile, error: updateError } = await supabase
    .from('career_profiles')
    .update({
      resume_text: resumeText,
      resume_file_name: fileName,
      resume_analysis: analysis,
      resume_analyzed_at: new Date().toISOString(),
    })
    .eq('id', careerProfile.id)
    .select()
    .single();
  if (updateError) throw updateError;

  for (const assessment of analysis.skillAssessments) {
    const skill = await findSkillByName(assessment.skill);
    if (!skill) continue;
    await upsertUserSkill(
      userId,
      careerProfile.id,
      skill.id,
      Math.min(5, Math.max(0, Math.round(assessment.currentLevel))),
      Math.min(5, Math.max(0, Math.round(assessment.targetLevel)))
    );
  }

  await logActivity({
    userId,
    activityType: 'resume_analyzed',
    metadata: { careerProfileId: careerProfile.id, careerTrack: careerProfile.career_track },
  });

  return { careerProfile: updatedProfile as CareerProfile, analysis };
}

const VALID_DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);

export async function generateAndSaveInterviewQuestions(
  userId: string,
  careerProfile: CareerProfile,
  roleLabel: string
): Promise<CareerProfile> {
  const ai = getAiService();
  const gaps = careerProfile.resume_analysis?.gaps ?? [];
  const generated = await ai.generateInterviewQuestions(roleLabel, gaps);

  // The model is instructed to use exactly beginner/intermediate/advanced, but LLM output
  // isn't guaranteed — normalize anything else (e.g. "Easy"/"Medium"/"Hard") rather than
  // surfacing an off-schema value in the UI.
  const questions: GeneratedInterviewQuestion[] = generated.map((q) => ({
    ...q,
    difficulty: VALID_DIFFICULTIES.has(q.difficulty) ? q.difficulty : 'intermediate',
    id: crypto.randomUUID(),
    status: 'new',
  }));

  const { data, error } = await supabase
    .from('career_profiles')
    .update({
      interview_questions_generated: questions,
      interview_questions_generated_at: new Date().toISOString(),
    })
    .eq('id', careerProfile.id)
    .select()
    .single();
  if (error) throw error;

  await logActivity({
    userId,
    activityType: 'interview_question_practiced',
    metadata: { careerProfileId: careerProfile.id, generatedCount: questions.length },
  });

  return data as CareerProfile;
}

export async function updateGeneratedQuestionStatus(
  careerProfile: CareerProfile,
  questionId: string,
  status: QuestionStatus
): Promise<CareerProfile> {
  const updated = (careerProfile.interview_questions_generated ?? []).map((q) =>
    q.id === questionId ? { ...q, status } : q
  );

  const { data, error } = await supabase
    .from('career_profiles')
    .update({ interview_questions_generated: updated })
    .eq('id', careerProfile.id)
    .select()
    .single();
  if (error) throw error;
  return data as CareerProfile;
}
