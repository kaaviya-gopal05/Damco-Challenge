import { addDays, format, isBefore, max as maxDate, startOfDay } from 'date-fns';
import type { TaskPriority, TodoTask } from '@/types/database';

export const WEEK_LENGTH_DAYS = 7;
export const MAX_TASKS_PER_DAY = 3;
const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export interface ScheduledTaskAssignment {
  id: string;
  title: string;
  priority: TaskPriority;
  /** YYYY-MM-DD */
  day: string;
  wasRescheduled: boolean;
}

export interface WeekScheduleResult {
  assignments: ScheduledTaskAssignment[];
  rescheduledCount: number;
  /** YYYY-MM-DD */
  weekStart: string;
  /** YYYY-MM-DD */
  weekEnd: string;
}

/**
 * Pure day-load-balancing scheduler: spreads incomplete, due-this-week-or-overdue tasks across
 * the next 7 days, highest priority first (ties broken by due date), capped at MAX_TASKS_PER_DAY
 * per day — overflow spills into the next day under the cap, or the last day of the week if every
 * day is already full. Extracted out of weeklyPlan.service.ts so the actual balancing logic is
 * testable without a database; the service layer only adds the "write due_date back to Postgres"
 * side effect and the AI-written recap on top of this.
 */
export function scheduleTasksAcrossWeek(tasks: TodoTask[], now: Date = new Date()): WeekScheduleResult {
  const today = startOfDay(now);
  const weekEnd = addDays(today, WEEK_LENGTH_DAYS - 1);
  const weekDays = Array.from({ length: WEEK_LENGTH_DAYS }, (_, i) => addDays(today, i));
  const dayCounts = new Map<string, number>(weekDays.map((d) => [format(d, 'yyyy-MM-dd'), 0]));

  const candidates = tasks
    .filter(
      (t) => !t.is_completed && t.due_date && (isBefore(new Date(t.due_date), today) || new Date(t.due_date) <= weekEnd)
    )
    .sort((a, b) => {
      const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (rankDiff !== 0) return rankDiff;
      return (a.due_date ?? '').localeCompare(b.due_date ?? '');
    });

  const assignments: ScheduledTaskAssignment[] = [];
  let rescheduledCount = 0;

  for (const task of candidates) {
    const preferredDay = maxDate([new Date(task.due_date!), today]);
    const preferredKey = format(preferredDay <= weekEnd ? preferredDay : weekEnd, 'yyyy-MM-dd');

    let targetKey = preferredKey;
    if ((dayCounts.get(targetKey) ?? 0) >= MAX_TASKS_PER_DAY) {
      const openDay = weekDays.find((d) => (dayCounts.get(format(d, 'yyyy-MM-dd')) ?? 0) < MAX_TASKS_PER_DAY);
      targetKey = openDay ? format(openDay, 'yyyy-MM-dd') : format(weekEnd, 'yyyy-MM-dd');
    }
    dayCounts.set(targetKey, (dayCounts.get(targetKey) ?? 0) + 1);

    const wasRescheduled = targetKey !== task.due_date;
    if (wasRescheduled) rescheduledCount += 1;
    assignments.push({ id: task.id, title: task.title, priority: task.priority, day: targetKey, wasRescheduled });
  }

  return {
    assignments,
    rescheduledCount,
    weekStart: format(today, 'yyyy-MM-dd'),
    weekEnd: format(weekEnd, 'yyyy-MM-dd'),
  };
}
