import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as careerService from '@/services/career.service';
import { getAiService } from '@/services/ai.service';
import { notify } from '@/lib/toast';
import type { CareerProfile, QuestionStatus } from '@/types/database';

export function useCareerProfiles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['career-profiles', user?.id],
    queryFn: () => careerService.listCareerProfiles(user!.id),
    enabled: !!user,
  });
}

export function useSkills() {
  return useQuery({ queryKey: ['skills'], queryFn: careerService.listSkills, staleTime: Infinity });
}

export function useUserSkills(careerProfileId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-skills', user?.id, careerProfileId],
    queryFn: () => careerService.listUserSkills(user!.id, careerProfileId!),
    enabled: !!user && !!careerProfileId,
  });
}

export function useUpsertUserSkill(careerProfileId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ skillId, currentLevel, targetLevel }: { skillId: string; currentLevel: number; targetLevel: number }) =>
      careerService.upsertUserSkill(user!.id, careerProfileId!, skillId, currentLevel, targetLevel),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-skills', user?.id, careerProfileId] }),
    onError: () => notify.error('Could not save skill level'),
  });
}

export function useCreateResumeDocument() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ resumeText, resumeFileName }: { resumeText: string; resumeFileName: string }) =>
      careerService.createResumeDocument(user!.id, resumeText, resumeFileName),
  });
}

export function useGenerateCareerProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      spaceId,
      resumeDocumentId,
      resumeText,
      resumeFileName,
      targetRole,
      jobDescription,
    }: {
      spaceId: string;
      resumeDocumentId: string;
      resumeText: string;
      resumeFileName: string;
      targetRole?: string;
      jobDescription?: string;
    }) =>
      careerService.generateCareerProfileFromChat(
        user!.id,
        spaceId,
        resumeDocumentId,
        resumeText,
        resumeFileName,
        targetRole,
        jobDescription
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-profiles', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-skills', user?.id] });
    },
  });
}

export function useGenerateInterviewQuestions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ careerProfile, roleLabel }: { careerProfile: CareerProfile; roleLabel: string }) =>
      careerService.generateAndSaveInterviewQuestions(user!.id, careerProfile, roleLabel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-profiles', user?.id] });
      notify.success('Interview questions generated');
    },
    onError: () => notify.error('Could not generate interview questions. Please try again.'),
  });
}

export function useSkillImprovementPlan(skillName: string | undefined, category: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['skill-improvement-plan', skillName],
    queryFn: () => getAiService().generateSkillImprovementPlan(skillName!, category),
    enabled: enabled && !!skillName,
    staleTime: Infinity,
  });
}

export function useUpdateQuestionStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ careerProfile, questionId, status }: { careerProfile: CareerProfile; questionId: string; status: QuestionStatus }) =>
      careerService.updateGeneratedQuestionStatus(careerProfile, questionId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-profiles', user?.id] });
      notify.success('Progress saved');
    },
    onError: () => notify.error('Could not save progress'),
  });
}
