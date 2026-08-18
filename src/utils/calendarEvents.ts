import { format } from 'date-fns';
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

/**
 * Combines every roadmap task's computed study schedule (see roadmapSchedule.ts) with
 * every to-do task's due date into a single day-keyed lookup for the calendar. A
 * roadmap task is placed on its computed start date — real, derived scheduling data,
 * not a fabricated one; a to-do task with no due date is omitted (it still shows up in
 * the Task List page, just can't be placed on a specific day).
 */
export function buildCalendarEvents(roadmaps: RoadmapWithContent[], tasks: TodoTask[]): Map<string, CalendarEvent[]> {
  const eventsByDate = new Map<string, CalendarEvent[]>();

  function add(dateKey: string, event: CalendarEvent) {
    const existing = eventsByDate.get(dateKey);
    if (existing) existing.push(event);
    else eventsByDate.set(dateKey, [event]);
  }

  for (const roadmap of roadmaps) {
    const schedule = computeRoadmapSchedule(roadmap);
    for (const phase of roadmap.phases) {
      for (const task of phase.tasks) {
        const taskSchedule = schedule.tasks.get(task.id);
        if (!taskSchedule) continue;
        const dateKey = format(taskSchedule.startDate, 'yyyy-MM-dd');
        add(dateKey, {
          kind: 'roadmap-task',
          id: task.id,
          title: task.title,
          dateKey,
          isCompleted: task.is_completed,
          roadmapId: roadmap.id,
          roadmapTitle: roadmap.title,
        });
      }
    }
  }

  for (const task of tasks) {
    if (!task.due_date) continue;
    add(task.due_date, {
      kind: 'todo-task',
      id: task.id,
      title: task.title,
      dateKey: task.due_date,
      isCompleted: task.is_completed,
      priority: task.priority,
    });
  }

  return eventsByDate;
}
