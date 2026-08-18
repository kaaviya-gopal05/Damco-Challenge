import type { QaPair, QuizQuestion, Difficulty, ResumeAnalysisResult, InterviewCategory, TaskPriority } from '@/types/database';

export interface GeneratedInterviewQuestionDraft {
  category: InterviewCategory;
  question: string;
  sampleAnswer: string;
  difficulty: Difficulty;
}

export interface GeneratedTask {
  title: string;
  description: string;
  estimatedHours: number;
}

export interface GeneratedPhase {
  title: string;
  description: string;
  tasks: GeneratedTask[];
}

export interface GeneratedRoadmap {
  title: string;
  description: string;
  estimatedDurationWeeks: number;
  difficulty: Difficulty;
  phases: GeneratedPhase[];
}

export interface RoadmapOptions {
  level?: Difficulty;
  deadline?: string;
  hoursPerDay?: number;
  materialText?: string;
}

export interface FlashcardDraft {
  front: string;
  back: string;
}

export interface TaskNotesContext {
  roadmapTitle: string;
  phaseTitle: string;
  taskTitle: string;
  taskDescription?: string;
}

export interface MindMapTreeNode {
  label: string;
  children: MindMapTreeNode[];
}

export interface SkillCourseRecommendation {
  title: string;
  provider: string;
  description: string;
}

export interface SkillImprovementPlan {
  summary: string;
  courses: SkillCourseRecommendation[];
  quiz: QuizQuestion[];
}

export type ChatIntentAction = 'roadmap' | 'mindmap' | 'flashcards' | 'todo' | 'chat';

export interface ChatIntent {
  action: ChatIntentAction;
  topic: string;
}

export interface SelectionExplanation {
  /** The word itself, or a short label summarizing a longer passage. */
  term: string;
  explanation: string;
  /** A one-liner showing the word used in context. Omitted for passage-length explanations. */
  example?: string | null;
}

export interface GeneratedTaskDraft {
  title: string;
  priority: TaskPriority;
  /** YYYY-MM-DD, or undefined if no time reference was given. */
  dueDate?: string;
}

export interface AiService {
  generateRoadmap(goal: string, options?: RoadmapOptions): Promise<GeneratedRoadmap>;
  generateTaskNotes(context: TaskNotesContext): Promise<string>;
  generateMindMapTree(topic: string): Promise<MindMapTreeNode>;
  summarizeDocument(text: string, title: string): Promise<string>;
  extractKeyPoints(text: string): Promise<string[]>;
  generateQa(text: string): Promise<QaPair[]>;
  generateQuiz(text: string): Promise<QuizQuestion[]>;
  generateFlashcards(text: string, count: number): Promise<FlashcardDraft[]>;
  generateFlashcardsForTopic(topic: string, count: number): Promise<FlashcardDraft[]>;
  analyzeResume(resumeText: string, targetRole: string): Promise<ResumeAnalysisResult>;
  generateInterviewQuestions(role: string, gaps: string[]): Promise<GeneratedInterviewQuestionDraft[]>;
  generateSkillImprovementPlan(skillName: string, category?: string | null): Promise<SkillImprovementPlan>;
  chatReply(spaceTitle: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<string>;
  interpretChatIntent(message: string): Promise<ChatIntent>;
  explainSelection(text: string): Promise<SelectionExplanation>;
  generatePrioritizedTasks(brainDump: string, referenceDate: string): Promise<GeneratedTaskDraft[]>;
}
