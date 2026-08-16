import { CheckCircle2, CalendarDays } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { RoadmapPhase, RoadmapTask } from '@/types/database';
import type { RoadmapSchedule } from '@/utils/roadmapSchedule';

function formatRange(start: Date, end: Date): string {
  if (isSameDay(start, end)) return format(start, 'MMM d');
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
}

export function RoadmapTimeline({
  phases,
  schedule,
}: {
  phases: (RoadmapPhase & { tasks: RoadmapTask[] })[];
  schedule: RoadmapSchedule;
}) {
  return (
    <ol className="relative flex flex-col gap-8 pl-8">
      <div className="absolute bottom-2 left-3.5 top-2 w-px bg-ink-200" aria-hidden />
      {phases.map((phase, index) => {
        const completed = phase.tasks.filter((t) => t.is_completed).length;
        const isComplete = phase.tasks.length > 0 && completed === phase.tasks.length;
        const phaseSchedule = schedule.phases.get(phase.id);
        return (
          <li key={phase.id} className="relative">
            <span
              className={cn(
                'absolute -left-8 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white text-xs font-semibold',
                isComplete ? 'border-accent-500 text-accent-600' : 'border-ink-300 text-ink-500'
              )}
            >
              {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </span>
            <p className="font-semibold text-ink-900">{phase.title}</p>
            {phase.description && <p className="mt-0.5 text-sm text-ink-500">{phase.description}</p>}
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
              <span>
                {completed} of {phase.tasks.length} tasks complete
              </span>
              {phaseSchedule && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatRange(phaseSchedule.startDate, phaseSchedule.endDate)}
                </span>
              )}
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {phase.tasks.map((task) => {
                const taskSchedule = schedule.tasks.get(task.id);
                return (
                  <li
                    key={task.id}
                    className={cn(
                      'flex flex-wrap items-baseline gap-x-2 text-sm',
                      task.is_completed ? 'text-ink-400 line-through' : 'text-ink-600'
                    )}
                  >
                    <span>{task.title}</span>
                    {taskSchedule && (
                      <span className="text-xs text-ink-400">{formatRange(taskSchedule.startDate, taskSchedule.endDate)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
