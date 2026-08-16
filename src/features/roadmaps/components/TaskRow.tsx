import { CheckCircle2, Circle, MoreVertical, Pencil, Trash2, Sparkles, CalendarDays } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { Dropdown, DropdownItem } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { RoadmapTask } from '@/types/database';
import type { TaskSchedule } from '@/utils/roadmapSchedule';

function formatRange(schedule: TaskSchedule): string {
  if (isSameDay(schedule.startDate, schedule.endDate)) return format(schedule.startDate, 'MMM d');
  return `${format(schedule.startDate, 'MMM d')} – ${format(schedule.endDate, 'MMM d')}`;
}

export function TaskRow({
  task,
  schedule,
  onToggle,
  onEdit,
  onDelete,
  onOpenNotes,
}: {
  task: RoadmapTask;
  schedule?: TaskSchedule;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenNotes: () => void;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-ink-50">
      <button onClick={onToggle} className="mt-0.5 shrink-0" aria-label={task.is_completed ? 'Mark incomplete' : 'Mark complete'}>
        {task.is_completed ? (
          <CheckCircle2 className="h-5 w-5 text-accent-500" />
        ) : (
          <Circle className="h-5 w-5 text-ink-300 hover:text-brand-400" />
        )}
      </button>
      <button onClick={onOpenNotes} className="min-w-0 flex-1 text-left" aria-label={`View AI notes for ${task.title}`}>
        <span
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium',
            task.is_completed ? 'text-ink-400 line-through' : 'text-ink-800 group-hover:text-brand-700'
          )}
        >
          {task.title}
          <Sparkles className="h-3 w-3 shrink-0 text-brand-400 opacity-0 group-hover:opacity-100" />
        </span>
        {task.description && <span className="mt-0.5 block text-xs text-ink-400">{task.description}</span>}
        {schedule && (
          <span className="mt-1 flex items-center gap-1 text-xs text-ink-400">
            <CalendarDays className="h-3 w-3" />
            {formatRange(schedule)}
            <span className="text-ink-300">· ~{task.estimated_hours}h</span>
          </span>
        )}
      </button>
      <Dropdown
        align="right"
        trigger={
          <button className="shrink-0 rounded-lg p-1.5 text-ink-300 opacity-0 hover:bg-ink-100 group-hover:opacity-100" aria-label="Task options">
            <MoreVertical className="h-4 w-4" />
          </button>
        }
      >
        <DropdownItem onClick={onOpenNotes}>
          <Sparkles className="h-4 w-4" /> View AI notes
        </DropdownItem>
        <DropdownItem onClick={onEdit}>
          <Pencil className="h-4 w-4" /> Edit task
        </DropdownItem>
        <DropdownItem destructive onClick={onDelete}>
          <Trash2 className="h-4 w-4" /> Delete task
        </DropdownItem>
      </Dropdown>
    </div>
  );
}
