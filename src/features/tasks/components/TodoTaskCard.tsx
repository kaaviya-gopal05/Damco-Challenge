import { Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge, type BadgeVariant } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { TaskPriority, TodoTask } from '@/types/database';

const PRIORITY_BADGE: Record<TaskPriority, BadgeVariant> = {
  high: 'danger',
  medium: 'warning',
  low: 'success',
};

export function TodoTaskCard({
  task,
  onToggle,
  onDelete,
  spaceLabel,
}: {
  task: TodoTask;
  onToggle: (isCompleted: boolean) => void;
  onDelete: () => void;
  spaceLabel?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3">
      <input
        type="checkbox"
        checked={task.is_completed}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
        aria-label={`Mark "${task.title}" ${task.is_completed ? 'incomplete' : 'complete'}`}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium text-ink-900', task.is_completed && 'text-ink-400 line-through')}>
          {task.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant={PRIORITY_BADGE[task.priority]}>{task.priority}</Badge>
          {task.due_date && (
            <span className="text-xs text-ink-400">Due {format(parseISO(task.due_date), 'MMM d, yyyy')}</span>
          )}
          {spaceLabel && <span className="text-xs text-ink-400">· {spaceLabel}</span>}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
        aria-label={`Delete "${task.title}"`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
