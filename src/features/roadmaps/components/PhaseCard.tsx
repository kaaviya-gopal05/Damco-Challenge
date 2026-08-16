import { useState } from 'react';
import { ChevronDown, Plus, CalendarDays } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { Card, CardContent, ProgressBar, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { TaskRow } from '@/features/roadmaps/components/TaskRow';
import type { RoadmapPhase, RoadmapTask } from '@/types/database';
import type { PhaseSchedule, TaskSchedule } from '@/utils/roadmapSchedule';

export function PhaseCard({
  phase,
  index,
  phaseSchedule,
  taskSchedules,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onOpenTaskNotes,
}: {
  phase: RoadmapPhase & { tasks: RoadmapTask[] };
  index: number;
  phaseSchedule?: PhaseSchedule;
  taskSchedules: Map<string, TaskSchedule>;
  onToggleTask: (taskId: string, isCompleted: boolean) => void;
  onEditTask: (task: RoadmapTask) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (title: string) => void;
  onOpenTaskNotes: (task: RoadmapTask) => void;
}) {
  const [isOpen, setIsOpen] = useState(index === 0);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const completed = phase.tasks.filter((t) => t.is_completed).length;
  const progress = phase.tasks.length === 0 ? 0 : Math.round((completed / phase.tasks.length) * 100);

  function submitNewTask() {
    if (!newTaskTitle.trim()) return;
    onAddTask(newTaskTitle.trim());
    setNewTaskTitle('');
    setIsAdding(false);
  }

  return (
    <Card>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink-900">{phase.title}</span>
          {phase.description && <span className="block truncate text-xs text-ink-400">{phase.description}</span>}
          {phaseSchedule && (
            <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-400">
              <CalendarDays className="h-3 w-3" />
              {isSameDay(phaseSchedule.startDate, phaseSchedule.endDate)
                ? format(phaseSchedule.startDate, 'MMM d')
                : `${format(phaseSchedule.startDate, 'MMM d')} – ${format(phaseSchedule.endDate, 'MMM d')}`}
            </span>
          )}
        </span>
        <span className="w-24 shrink-0">
          <ProgressBar value={progress} size="sm" />
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <CardContent className="pt-0">
          <div className="flex flex-col gap-0.5 border-t border-ink-100 pt-2">
            {phase.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                schedule={taskSchedules.get(task.id)}
                onToggle={() => onToggleTask(task.id, !task.is_completed)}
                onEdit={() => onEditTask(task)}
                onDelete={() => onDeleteTask(task.id)}
                onOpenNotes={() => onOpenTaskNotes(task)}
              />
            ))}
          </div>

          {isAdding ? (
            <div className="mt-2 flex items-center gap-2">
              <Input
                autoFocus
                placeholder="New task title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitNewTask()}
                className="flex-1"
              />
              <Button size="sm" onClick={submitNewTask} disabled={!newTaskTitle.trim()}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="mt-2 flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-ink-400 hover:bg-ink-50 hover:text-brand-600"
            >
              <Plus className="h-4 w-4" /> Add task
            </button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
