import { addDays } from 'date-fns';
import type { RoadmapWithContent } from '@/types/database';

const DEFAULT_HOURS_PER_DAY = 2;

export interface TaskSchedule {
  startDate: Date;
  endDate: Date;
}

export interface PhaseSchedule {
  startDate: Date;
  endDate: Date;
}

export interface RoadmapSchedule {
  tasks: Map<string, TaskSchedule>;
  phases: Map<string, PhaseSchedule>;
}

/**
 * Derives a study date range per task (and per phase) from roadmap.created_at, hours_per_day,
 * and each task's estimated_hours, walking tasks in order. Computed on the fly rather than
 * stored so it stays correct as tasks are added, completed, or reordered.
 */
export function computeRoadmapSchedule(roadmap: RoadmapWithContent): RoadmapSchedule {
  const hoursPerDay = roadmap.hours_per_day && roadmap.hours_per_day > 0 ? roadmap.hours_per_day : DEFAULT_HOURS_PER_DAY;
  const start = new Date(roadmap.created_at);
  start.setHours(0, 0, 0, 0);

  const tasks = new Map<string, TaskSchedule>();
  const phases = new Map<string, PhaseSchedule>();
  let dayCursor = 0;

  for (const phase of roadmap.phases) {
    const phaseStartDay = dayCursor;
    for (const task of phase.tasks) {
      const hours = task.estimated_hours > 0 ? task.estimated_hours : DEFAULT_HOURS_PER_DAY;
      const days = Math.max(1, Math.ceil(hours / hoursPerDay));
      const taskStart = addDays(start, dayCursor);
      const taskEnd = addDays(start, dayCursor + days - 1);
      tasks.set(task.id, { startDate: taskStart, endDate: taskEnd });
      dayCursor += days;
    }
    const phaseEndDay = phase.tasks.length > 0 ? dayCursor - 1 : phaseStartDay;
    phases.set(phase.id, { startDate: addDays(start, phaseStartDay), endDate: addDays(start, phaseEndDay) });
  }

  return { tasks, phases };
}
