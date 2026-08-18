import { mockAiService } from '@/services/ai/mock';
import { GeminiService } from '@/services/ai/gemini';

export type {
  AiService,
  ChatIntent,
  ChatIntentAction,
  FlashcardDraft,
  GeneratedInterviewQuestionDraft,
  GeneratedPhase,
  GeneratedRoadmap,
  GeneratedTask,
  MindMapTreeNode,
  RoadmapOptions,
  SkillCourseRecommendation,
  SkillImprovementPlan,
  TaskNotesContext,
} from '@/services/ai/types';

import type { AiService } from '@/services/ai/types';

let cachedService: AiService | null = null;

export function getAiService(): AiService {
  if (cachedService) return cachedService;

  cachedService = isAiConfigured() ? new GeminiService() : mockAiService;
  return cachedService;
}

export function isAiConfigured(): boolean {
  return import.meta.env.VITE_AI_ENABLED === 'true';
}
