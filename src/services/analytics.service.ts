import { supabase } from '@/lib/supabase';
import { getCurrentStreak, getWeeklyActivity } from '@/services/activity.service';
import { listRoadmaps, roadmapProgress } from '@/services/roadmaps.service';

export interface AnalyticsSummary {
  totalMinutesStudied: number;
  totalTasksCompleted: number;
  totalFlashcardsReviewed: number;
  documentsStudiedCount: number;
  videosWatchedCount: number;
  currentStreak: number;
  roadmapCompletionAvg: number;
  weeklyActivity: Awaited<ReturnType<typeof getWeeklyActivity>>;
}

async function countActivity(userId: string, activityType: string): Promise<number> {
  const { count, error } = await supabase
    .from('learning_activity')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('activity_type', activityType);
  if (error) throw error;
  return count ?? 0;
}

export async function getAnalyticsSummary(userId: string): Promise<AnalyticsSummary> {
  const [{ data: progressRows, error: progressError }, streak, weeklyActivity, roadmaps, documentsStudied, videosWatched] =
    await Promise.all([
      supabase.from('user_progress').select('minutes_studied, tasks_completed, flashcards_reviewed').eq('user_id', userId),
      getCurrentStreak(userId),
      getWeeklyActivity(userId),
      listRoadmaps(userId),
      countActivity(userId, 'document_studied'),
      countActivity(userId, 'video_watched'),
    ]);
  if (progressError) throw progressError;

  const totals = (progressRows ?? []).reduce(
    (acc, row) => ({
      minutes: acc.minutes + row.minutes_studied,
      tasks: acc.tasks + row.tasks_completed,
      flashcards: acc.flashcards + row.flashcards_reviewed,
    }),
    { minutes: 0, tasks: 0, flashcards: 0 }
  );

  const activeRoadmaps = roadmaps.filter((r) => r.status === 'active');
  const roadmapCompletionAvg =
    activeRoadmaps.length === 0
      ? 0
      : Math.round(
          activeRoadmaps.reduce((sum, r) => sum + roadmapProgress(r), 0) / activeRoadmaps.length
        );

  return {
    totalMinutesStudied: totals.minutes,
    totalTasksCompleted: totals.tasks,
    totalFlashcardsReviewed: totals.flashcards,
    documentsStudiedCount: documentsStudied,
    videosWatchedCount: videosWatched,
    currentStreak: streak,
    roadmapCompletionAvg,
    weeklyActivity,
  };
}
