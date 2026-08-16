import { supabase } from '@/lib/supabase';
import type { ActivityType, LearningActivity, UserProgress } from '@/types/database';

// Heuristic minutes attributed to each activity type when no explicit duration is provided,
// used only to keep the "hours studied" rollup moving in a demo environment.
const DEFAULT_MINUTES: Partial<Record<ActivityType, number>> = {
  task_completed: 15,
  flashcard_reviewed: 1,
  document_uploaded: 2,
  document_studied: 10,
  video_watched: 8,
  video_saved: 1,
  mind_map_edited: 5,
  roadmap_created: 5,
  interview_question_practiced: 6,
};

export interface LogActivityInput {
  userId: string;
  activityType: ActivityType;
  metadata?: Record<string, unknown>;
  minutes?: number;
}

export async function logActivity({ userId, activityType, metadata = {}, minutes }: LogActivityInput): Promise<void> {
  const { error: activityError } = await supabase
    .from('learning_activity')
    .insert({ user_id: userId, activity_type: activityType, metadata });
  if (activityError) throw activityError;

  const today = new Date().toISOString().slice(0, 10);
  const effectiveMinutes = minutes ?? DEFAULT_MINUTES[activityType] ?? 0;

  const { data: existing, error: fetchError } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  if (fetchError) throw fetchError;

  const patch = {
    minutes_studied: (existing?.minutes_studied ?? 0) + effectiveMinutes,
    tasks_completed: (existing?.tasks_completed ?? 0) + (activityType === 'task_completed' ? 1 : 0),
    flashcards_reviewed:
      (existing?.flashcards_reviewed ?? 0) + (activityType === 'flashcard_reviewed' ? 1 : 0),
  };

  if (existing) {
    const { error } = await supabase.from('user_progress').update(patch).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('user_progress')
      .insert({ user_id: userId, date: today, ...patch });
    if (error) throw error;
  }
}

export async function getRecentActivity(userId: string, limit = 20): Promise<LearningActivity[]> {
  const { data, error } = await supabase
    .from('learning_activity')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LearningActivity[];
}

export async function getProgressForRange(userId: string, days: number): Promise<UserProgress[]> {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const startDate = start.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as UserProgress[];
}

export interface DailyActivityPoint {
  date: string;
  label: string;
  minutesStudied: number;
  tasksCompleted: number;
  flashcardsReviewed: number;
}

export async function getWeeklyActivity(userId: string): Promise<DailyActivityPoint[]> {
  const rows = await getProgressForRange(userId, 7);
  const byDate = new Map(rows.map((r) => [r.date, r]));

  const points: DailyActivityPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const row = byDate.get(dateKey);
    points.push({
      date: dateKey,
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      minutesStudied: row?.minutes_studied ?? 0,
      tasksCompleted: row?.tasks_completed ?? 0,
      flashcardsReviewed: row?.flashcards_reviewed ?? 0,
    });
  }
  return points;
}

export async function getCurrentStreak(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('date, minutes_studied, tasks_completed, flashcards_reviewed')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(365);
  if (error) throw error;

  const activeDates = new Set(
    (data ?? [])
      .filter((r) => r.minutes_studied > 0 || r.tasks_completed > 0 || r.flashcards_reviewed > 0)
      .map((r) => r.date)
  );

  let streak = 0;
  const cursor = new Date();
  // If nothing happened today yet, the streak still counts from yesterday backward.
  if (!activeDates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (activeDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
