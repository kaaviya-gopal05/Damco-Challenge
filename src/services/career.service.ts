import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/services/activity.service';
import { getAiService } from '@/services/ai.service';
import type {
  CareerProfile,
  GeneratedInterviewQuestion,
  QuestionStatus,
  ResumeAnalysisResult,
  ResumeSkillAssessment,
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

/** supabase-js's FunctionsHttpError.message is always the generic "Edge Function returned a
 *  non-2xx status code" — the real error text lives on `error.context`, the unread Response. */
async function resolveInvokeError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await (error.context as Response).clone().json();
      if (body?.error) return new Error(body.error);
    } catch {
      // Response body wasn't JSON (or already consumed) — fall through to the generic error.
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}

const RESUME_CHUNK_SIZE = 2000;

/** Turns already-extracted resume text into a `documents` row (marked is_resume so it never
 *  shows up in the general Documents/Memory UI) plus its chunks, then embeds it through the
 *  exact same pipeline every uploaded PDF goes through (document-embed) — reusing the RAG
 *  infrastructure rather than building a parallel one for resumes. Awaited, not fire-and-forget:
 *  called right after the resume is uploaded in chat (see useCommandFlow.ts), before the role is
 *  even asked for, so the embeddings already exist by the time generation or a follow-up
 *  question needs them. */
export async function createResumeDocument(userId: string, resumeText: string, fileName: string): Promise<string> {
  const { data: document, error } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      title: `Resume — ${fileName}`,
      file_path: `${userId}/resumes/${crypto.randomUUID()}.txt`,
      status: 'ready',
      is_resume: true,
    })
    .select()
    .single();
  if (error) throw error;

  const chunks: string[] = [];
  for (let i = 0; i < resumeText.length; i += RESUME_CHUNK_SIZE) chunks.push(resumeText.slice(i, i + RESUME_CHUNK_SIZE));
  if (chunks.length > 0) {
    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunks.map((content, index) => ({ document_id: document.id, chunk_index: index, content })));
    if (chunksError) throw chunksError;
    const { error: embedError } = await supabase.functions.invoke('document-embed', { body: { documentId: document.id } });
    if (embedError) throw await resolveInvokeError(embedError);
  }

  return document.id as string;
}

function slugifyRole(role: string): string {
  return role.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'role';
}

function clampLevel(value: number): number {
  return Math.min(5, Math.max(0, Math.round(value)));
}

/**
 * Looks for an already-generated analysis for this exact resume + role/JD combination, so
 * re-running the flow with unchanged input reuses the same result instead of asking the AI
 * again — which, even given identical input, can phrase a "fresh" analysis differently each
 * time. Matched on resume_text (not resume_document_id) since every upload creates a new
 * documents row even for a byte-identical file — the extracted text itself is what's actually
 * deterministic across repeat uploads.
 */
async function findCachedAnalysis(
  userId: string,
  resumeText: string,
  targetRole: string | undefined,
  jobDescription: string | undefined
): Promise<CareerProfile | null> {
  let query = supabase
    .from('career_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('resume_text', resumeText)
    .not('resume_analysis', 'is', null);
  if (targetRole) {
    query = query.eq('career_track', slugifyRole(targetRole));
  } else if (jobDescription) {
    query = query.eq('job_description', jobDescription);
  } else {
    return null;
  }
  const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data as CareerProfile | null) ?? null;
}

/**
 * The single entry point for the new chat-driven Career Intelligence flow (see
 * useCommandFlow.ts's 'career' flow kind): given an already-embedded resume (see
 * createResumeDocument, called right after upload) and either a typed role, an uploaded job
 * description, or both, this calls career-analyze for a retrieval-grounded skill-gap analysis
 * and interview questions in one round trip — extracting a clean role title from the JD
 * server-side when only a JD was given, rather than guessing one from raw PDF text here — persists
 * everything onto (a possibly pre-existing, same-role) career_profiles row, and reconciles
 * resume-derived skills against the read-only skills catalogue. Reuses a prior identical result
 * via findCachedAnalysis when one exists, rather than generating a fresh (and possibly
 * differently-worded) one for input that hasn't actually changed.
 */
export async function generateCareerProfileFromChat(
  userId: string,
  spaceId: string,
  resumeDocumentId: string,
  resumeText: string,
  resumeFileName: string,
  targetRole?: string,
  jobDescription?: string
): Promise<CareerProfile> {
  const cached = await findCachedAnalysis(userId, resumeText, targetRole, jobDescription);
  if (cached) {
    const { data: moved, error: moveError } = await supabase
      .from('career_profiles')
      .update({ space_id: spaceId })
      .eq('id', cached.id)
      .select()
      .single();
    if (moveError) throw moveError;
    return moved as CareerProfile;
  }

  const { data: genData, error: genError } = await supabase.functions.invoke('career-analyze', {
    body: { targetRole, jobDescription, resumeDocumentId },
  });
  if (genError) throw await resolveInvokeError(genError);

  const generated = genData as ResumeAnalysisResult & {
    interviewQuestions: Omit<GeneratedInterviewQuestion, 'id' | 'status'>[];
    resolvedRole: string;
  };
  const resolvedRole = generated.resolvedRole;
  const careerTrack = slugifyRole(resolvedRole);
  const analysis: ResumeAnalysisResult = {
    summary: generated.summary,
    strengths: generated.strengths,
    gaps: generated.gaps,
    skillAssessments: generated.skillAssessments,
  };
  const questions: GeneratedInterviewQuestion[] = generated.interviewQuestions.map((q) => ({
    ...q,
    id: crypto.randomUUID(),
    status: 'new',
  }));

  const baseProfile = await getOrCreateCareerProfile(userId, careerTrack, spaceId);

  const { data: careerProfile, error: writeError } = await supabase
    .from('career_profiles')
    .update({
      target_role: resolvedRole,
      space_id: spaceId,
      job_description: jobDescription ?? null,
      resume_document_id: resumeDocumentId,
      resume_text: resumeText,
      resume_file_name: resumeFileName,
      resume_analysis: analysis,
      resume_analyzed_at: new Date().toISOString(),
      interview_questions_generated: questions,
      interview_questions_generated_at: new Date().toISOString(),
    })
    .eq('id', baseProfile.id)
    .select()
    .single();
  if (writeError) throw writeError;

  for (const assessment of analysis.skillAssessments as ResumeSkillAssessment[]) {
    const skill = await findSkillByName(assessment.skill);
    if (!skill) continue;
    await upsertUserSkill(userId, careerProfile.id, skill.id, clampLevel(assessment.currentLevel), clampLevel(assessment.targetLevel));
  }

  await logActivity({
    userId,
    activityType: 'resume_analyzed',
    metadata: { careerProfileId: careerProfile.id, careerTrack },
  });

  return careerProfile as CareerProfile;
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

/** Ongoing RAG Q&A about an already-uploaded resume — e.g. "Am I suitable for this JD?" with a
 *  pasted job description, asked directly in a space's chat once a resume is on file for it. See
 *  spaces.service.ts's replyToMessage, which routes here whenever the AI intent classifier
 *  detects a career-related question in a space that has a resume-linked career profile. */
export async function askCareerQuestion(question: string, resumeDocumentId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('career-chat', {
    body: { question, resumeDocumentId },
  });
  if (error) throw await resolveInvokeError(error);
  return (data as { answer: string }).answer;
}
