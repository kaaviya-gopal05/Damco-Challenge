import { addDays, format, max as maxDate, startOfDay } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { getAiService } from '@/services/ai.service';
import { listTasksForUser } from '@/services/tasks.service';
import { listRoadmaps } from '@/services/roadmaps.service';
import { computeRoadmapSchedule } from '@/utils/roadmapSchedule';
import { scheduleTasksAcrossWeek, WEEK_LENGTH_DAYS } from '@/utils/weeklyPlanSchedule';
import type { WeeklyPlan, WeeklyPlanFocusItem } from '@/types/database';

function mapWeeklyPlan(row: Record<string, unknown>): WeeklyPlan {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    weekStart: row.week_start as string,
    summary: row.summary as string,
    dailyRhythm: (row.daily_rhythm as string) ?? null,
    rescheduledCount: (row.rescheduled_count as number) ?? 0,
    focusItems: (row.focus_items as WeeklyPlanFocusItem[]) ?? [],
    createdAt: row.created_at as string,
  };
}

export async function getLatestWeeklyPlan(userId: string): Promise<WeeklyPlan | null> {
  const { data, error } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapWeeklyPlan(data) : null;
}

/**
 * Deterministically rebalances the learner's overdue and this-week to-do tasks across the next
 * 7 days (max MAX_TASKS_PER_DAY each, highest priority first), actually updating due_date in the
 * database — this is the "autonomous" part: it acts, it doesn't just suggest. Undated tasks are
 * left untouched (they were never asked to be scheduled). Read-only roadmap tasks whose computed
 * schedule falls this week are folded into the same list for context. Gemini is only used
 * afterward, to write a short human summary of the resulting week — it never decides the schedule
 * itself, so the plan is reproducible and never invents a due date that isn't real.
 */
export async function generateWeeklyPlan(userId: string): Promise<WeeklyPlan> {
  const today = startOfDay(new Date());
  const weekEnd = addDays(today, WEEK_LENGTH_DAYS - 1);

  const allTasks = await listTasksForUser(userId);
  const { assignments, rescheduledCount } = scheduleTasksAcrossWeek(allTasks, today);

  const focusItems: WeeklyPlanFocusItem[] = assignments.map((a) => ({
    title: a.title,
    day: a.day,
    source: 'todo',
    priority: a.priority,
  }));

  const updates = assignments.filter((a) => a.wasRescheduled);
  if (updates.length > 0) {
    await Promise.all(updates.map((u) => supabase.from('todo_tasks').update({ due_date: u.day }).eq('id', u.id)));
  }

  const roadmaps = await listRoadmaps(userId);
  for (const roadmap of roadmaps) {
    if (roadmap.status !== 'active') continue;
    const schedule = computeRoadmapSchedule(roadmap);
    for (const phase of roadmap.phases) {
      for (const task of phase.tasks) {
        if (task.is_completed) continue;
        const taskSchedule = schedule.tasks.get(task.id);
        if (!taskSchedule) continue;
        if (taskSchedule.endDate < today || taskSchedule.startDate > weekEnd) continue;
        const displayDay = maxDate([taskSchedule.startDate, today]);
        focusItems.push({ title: task.title, day: format(displayDay, 'yyyy-MM-dd'), source: 'roadmap' });
      }
    }
  }

  focusItems.sort((a, b) => a.day.localeCompare(b.day));

  const ai = getAiService();
  const { summary, dailyRhythm } = await ai.generateWeeklyPlanSummary({
    focusItems: focusItems.map((item) => ({ title: item.title, day: item.day, source: item.source, priority: item.priority })),
    rescheduledCount,
  });

  const { data, error } = await supabase
    .from('weekly_plans')
    .insert({
      user_id: userId,
      week_start: format(today, 'yyyy-MM-dd'),
      summary,
      daily_rhythm: dailyRhythm,
      rescheduled_count: rescheduledCount,
      focus_items: focusItems,
    })
    .select()
    .single();
  if (error) throw error;
  return mapWeeklyPlan(data);
}
