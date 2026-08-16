// Row types mirroring supabase/migrations/0001_initial_schema.sql.
// These are the shapes services/*.service.ts map Supabase responses into.

export type UUID = string;
export type ISODateString = string;

export interface Profile {
  id: UUID;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  timezone: string;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export type GoalStatus = 'active' | 'completed' | 'archived';

export interface LearningGoal {
  id: UUID;
  user_id: UUID;
  title: string;
  description: string | null;
  category: string | null;
  target_date: string | null;
  status: GoalStatus;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type RoadmapStatus = 'active' | 'completed' | 'archived';

export interface Roadmap {
  id: UUID;
  user_id: UUID;
  goal_id: UUID | null;
  space_id: UUID | null;
  title: string;
  description: string | null;
  estimated_duration_weeks: number | null;
  difficulty: Difficulty | null;
  status: RoadmapStatus;
  hours_per_day: number | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface RoadmapPhase {
  id: UUID;
  roadmap_id: UUID;
  title: string;
  description: string | null;
  order_index: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface TaskResource {
  label: string;
  url?: string;
  type?: 'article' | 'video' | 'doc' | 'other';
}

export interface RoadmapTask {
  id: UUID;
  phase_id: UUID;
  title: string;
  description: string | null;
  resources: TaskResource[];
  order_index: number;
  is_completed: boolean;
  completed_at: ISODateString | null;
  ai_notes: string | null;
  estimated_hours: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface RoadmapWithContent extends Roadmap {
  phases: (RoadmapPhase & { tasks: RoadmapTask[] })[];
}

export interface MindMap {
  id: UUID;
  user_id: UUID;
  space_id: UUID | null;
  title: string;
  description: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface MindMapNode {
  id: UUID;
  mind_map_id: UUID;
  parent_id: UUID | null;
  label: string;
  notes: string | null;
  color: string | null;
  position_x: number;
  position_y: number;
  is_collapsed: boolean;
  order_index: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface FlashcardDeck {
  id: UUID;
  user_id: UUID;
  roadmap_id: UUID | null;
  document_id: UUID | null;
  space_id: UUID | null;
  title: string;
  description: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export type FlashcardStatus = 'new' | 'learning' | 'mastered';
export type ReviewRating = 'again' | 'hard' | 'medium' | 'easy';

export interface Flashcard {
  id: UUID;
  deck_id: UUID;
  front: string;
  back: string;
  status: FlashcardStatus;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  last_reviewed_at: ISODateString | null;
  next_review_at: ISODateString;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface FlashcardReview {
  id: UUID;
  flashcard_id: UUID;
  user_id: UUID;
  rating: ReviewRating;
  previous_interval_days: number;
  new_interval_days: number;
  reviewed_at: ISODateString;
}

export type DocumentStatus = 'processing' | 'ready' | 'failed';

export interface Document {
  id: UUID;
  user_id: UUID;
  space_id: UUID | null;
  title: string;
  file_path: string;
  file_size_bytes: number | null;
  page_count: number | null;
  status: DocumentStatus;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface DocumentChunk {
  id: UUID;
  document_id: UUID;
  chunk_index: number;
  content: string;
  created_at: ISODateString;
}

export type InsightKind = 'summary' | 'key_points' | 'qa' | 'quiz';

export interface QaPair {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface DocumentInsight {
  id: UUID;
  document_id: UUID;
  kind: InsightKind;
  content: string[] | QaPair[] | QuizQuestion[] | { text: string };
  created_at: ISODateString;
}

export type VideoCategory =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'interview_prep'
  | 'project_tutorial';

export interface YoutubeResource {
  id: UUID;
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string | null;
  description: string | null;
  duration_seconds: number | null;
  topic: string | null;
  difficulty: Difficulty | null;
  category: VideoCategory | null;
  source: 'mock' | 'api';
  created_at: ISODateString;
}

export interface SavedResource {
  id: UUID;
  user_id: UUID;
  youtube_resource_id: UUID;
  notes: string | null;
  saved_at: ISODateString;
}

export interface ResumeSkillAssessment {
  skill: string;
  currentLevel: number;
  targetLevel: number;
}

export interface ResumeAnalysisResult {
  summary: string;
  strengths: string[];
  gaps: string[];
  skillAssessments: ResumeSkillAssessment[];
}

export type InterviewCategory =
  | 'technical'
  | 'behavioral'
  | 'system_design'
  | 'coding'
  | 'resume'
  | 'hr';

export type AttemptStatus = 'practiced' | 'mastered';
export type QuestionStatus = 'new' | AttemptStatus;

export interface GeneratedInterviewQuestion {
  id: UUID;
  category: InterviewCategory;
  question: string;
  sampleAnswer: string;
  difficulty: Difficulty;
  status: QuestionStatus;
}

export interface CareerProfile {
  id: UUID;
  user_id: UUID;
  space_id: UUID | null;
  career_track: string;
  target_role: string | null;
  current_level: Difficulty | null;
  resume_text: string | null;
  resume_file_name: string | null;
  resume_analysis: ResumeAnalysisResult | null;
  resume_analyzed_at: ISODateString | null;
  interview_questions_generated: GeneratedInterviewQuestion[] | null;
  interview_questions_generated_at: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Skill {
  id: UUID;
  name: string;
  category: string | null;
  description: string | null;
  created_at: ISODateString;
}

export interface UserSkill {
  id: UUID;
  user_id: UUID;
  skill_id: UUID;
  career_profile_id: UUID | null;
  current_level: number;
  target_level: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export type ActivityType =
  | 'task_completed'
  | 'flashcard_reviewed'
  | 'document_uploaded'
  | 'document_studied'
  | 'video_watched'
  | 'video_saved'
  | 'mind_map_edited'
  | 'mind_map_created'
  | 'flashcard_deck_created'
  | 'roadmap_created'
  | 'interview_question_practiced'
  | 'resume_analyzed';

export interface LearningActivity {
  id: UUID;
  user_id: UUID;
  activity_type: ActivityType;
  metadata: Record<string, unknown>;
  occurred_at: ISODateString;
}

export interface UserProgress {
  id: UUID;
  user_id: UUID;
  date: string;
  minutes_studied: number;
  tasks_completed: number;
  flashcards_reviewed: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Space {
  id: UUID;
  user_id: UUID;
  title: string;
  goal_text: string | null;
  deadline: string | null;
  hours_per_day: number | null;
  level: Difficulty | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export type SpaceMessageRole = 'user' | 'assistant';
export type SpaceArtifactType = 'roadmap' | 'mindmap' | 'flashcards' | 'document';

export interface SpaceMessageMetadata {
  artifactType?: SpaceArtifactType;
  artifactId?: string;
  artifactTitle?: string;
}

export interface SpaceMessage {
  id: UUID;
  space_id: UUID;
  role: SpaceMessageRole;
  content: string;
  metadata: SpaceMessageMetadata;
  created_at: ISODateString;
}

export interface SpaceContents {
  roadmaps: Roadmap[];
  mindMaps: MindMap[];
  flashcardDecks: FlashcardDeck[];
  documents: Document[];
  careerProfile: CareerProfile | null;
}
