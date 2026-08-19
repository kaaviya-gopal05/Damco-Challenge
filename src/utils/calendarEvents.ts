import { addDays, format } from 'date-fns';
import { computeRoadmapSchedule } from '@/utils/roadmapSchedule';
import type { RoadmapWithContent, TaskPriority, TodoTask } from '@/types/database';

export type CalendarEventKind = 'roadmap-task' | 'todo-task';

export interface CalendarEvent {
  kind: CalendarEventKind;
  id: string;
  title: string;
  dateKey: string;
  isCompleted: boolean;
  /** roadmap-task only */
  roadmapId?: string;
  roadmapTitle?: string;
  /** todo-task only */
  priority?: TaskPriority;
}

/** Calendar cells stay readable once a learner has several active roadmaps at once. */
const MAX_ITEMS_PER_DAY = 2;
const FALLBACK_ROADMAP_WEEKS = 12;

function dateKeyOf(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Combines every roadmap task's computed study schedule (see roadmapSchedule.ts) with every
 * to-do task's due date into a single day-keyed lookup for the calendar. A to-do due date is a
 * firm commitment the learner typed in themselves, so it's placed exactly there and never
 * moved; a to-do task with no due date is omitted (it still shows up in the Task List page,
 * just can't be placed on a specific day).
 *
 * Incomplete roadmap tasks follow their roadmap's own study pace, but when several land on the
 * same day — routine once there's more than one active roadmap, since each one paces itself
 * independently from its own created_at — they'd otherwise pile up and make that day
 * unreadable. So each roadmap's incomplete tasks are merged into one pace-ordered queue and,
 * whenever a day is already at MAX_ITEMS_PER_DAY, the extra task is nudged forward to the next
 * day with room. That nudging never crosses the roadmap's own estimated finish date
 * (created_at + estimated_duration_weeks) — a real deadline still wins over evenness. Completed
 * tasks and dated to-do tasks are historical/firm and are never moved.
 */
export function buildCalendarEvents(roadmaps: RoadmapWithContent[], tasks: TodoTask[]): Map<string, CalendarEvent[]> {
  const eventsByDate = new Map<string, CalendarEvent[]>();
  const dayLoad = new Map<string, number>();

  function place(dateKey: string, event: CalendarEvent) {
    const existing = eventsByDate.get(dateKey);
    if (existing) existing.push(event);
    else eventsByDate.set(dateKey, [event]);
    dayLoad.set(dateKey, (dayLoad.get(dateKey) ?? 0) + 1);
  }

  // Firm, user-entered commitments go first so roadmap tasks route around them.
  for (const task of tasks) {
    if (!task.due_date) continue;
    place(task.due_date, {
      kind: 'todo-task',
      id: task.id,
      title: task.title,
      dateKey: task.due_date,
      isCompleted: task.is_completed,
      priority: task.priority,
    });
  }

  interface PendingRoadmapTask {
    id: string;
    title: string;
    roadmapId: string;
    roadmapTitle: string;
    naturalDate: Date;
    latestDate: Date;
  }
  const pending: PendingRoadmapTask[] = [];

  for (const roadmap of roadmaps) {
    const schedule = computeRoadmapSchedule(roadmap);
    const weeks =
      roadmap.estimated_duration_weeks && roadmap.estimated_duration_weeks > 0
        ? roadmap.estimated_duration_weeks
        : FALLBACK_ROADMAP_WEEKS;
    const roadmapStart = new Date(roadmap.created_at);
    roadmapStart.setHours(0, 0, 0, 0);
    const latestDate = addDays(roadmapStart, weeks * 7);

    for (const phase of roadmap.phases) {
      for (const task of phase.tasks) {
        const taskSchedule = schedule.tasks.get(task.id);
        if (!taskSchedule) continue;

        if (task.is_completed) {
          const dateKey = dateKeyOf(taskSchedule.startDate);
          place(dateKey, {
            kind: 'roadmap-task',
            id: task.id,
            title: task.title,
            dateKey,
            isCompleted: true,
            roadmapId: roadmap.id,
            roadmapTitle: roadmap.title,
          });
          continue;
        }

        pending.push({
          id: task.id,
          title: task.title,
          roadmapId: roadmap.id,
          roadmapTitle: roadmap.title,
          naturalDate: taskSchedule.startDate,
          latestDate,
        });
      }
    }
  }

  // Interleaving by natural pace date (rather than roadmap-by-roadmap) means no single
  // roadmap's backlog monopolizes the front of the queue.
  pending.sort((a, b) => a.naturalDate.getTime() - b.naturalDate.getTime());

  for (const item of pending) {
    let date = item.naturalDate;
    while ((dayLoad.get(dateKeyOf(date)) ?? 0) >= MAX_ITEMS_PER_DAY && date.getTime() < item.latestDate.getTime()) {
      date = addDays(date, 1);
    }
    const dateKey = dateKeyOf(date);
    place(dateKey, {
      kind: 'roadmap-task',
      id: item.id,
      title: item.title,
      dateKey,
      isCompleted: false,
      roadmapId: item.roadmapId,
      roadmapTitle: item.roadmapTitle,
    });
  }

  return eventsByDate;
}
