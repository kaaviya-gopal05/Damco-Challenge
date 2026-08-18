import { useMemo } from 'react';
import { ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState, SkeletonList } from '@/components/ui';
import { TodoTaskCard } from '@/features/tasks/components/TodoTaskCard';
import { useUserTasks, useToggleTask, useDeleteTodoTask } from '@/features/tasks/hooks/useTasks';
import { useSpaces } from '@/features/spaces/hooks/useSpaces';
import { cn } from '@/lib/utils';
import type { TaskPriority, TodoTask } from '@/types/database';

const PRIORITY_COLUMNS: { priority: TaskPriority; label: string; dot: string; header: string }[] = [
  { priority: 'high', label: 'High priority', dot: 'bg-rose-500', header: 'border-rose-200 bg-rose-50/60' },
  { priority: 'medium', label: 'Medium priority', dot: 'bg-amber-500', header: 'border-amber-200 bg-amber-50/60' },
  { priority: 'low', label: 'Low priority', dot: 'bg-emerald-500', header: 'border-emerald-200 bg-emerald-50/60' },
];

function sortTasks(tasks: TodoTask[]): TodoTask[] {
  return [...tasks].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });
}

export function TaskListPage() {
  const { data: tasks, isLoading } = useUserTasks();
  const { data: spaces } = useSpaces();
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTodoTask();

  const spaceTitleById = useMemo(() => new Map((spaces ?? []).map((s) => [s.id, s.title])), [spaces]);

  const columns = useMemo(
    () =>
      PRIORITY_COLUMNS.map((col) => ({
        ...col,
        tasks: sortTasks((tasks ?? []).filter((t) => t.priority === col.priority)),
      })),
    [tasks]
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Task List"
        description="Every to-do task organized by AI across your spaces, split by priority."
      />

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : (tasks ?? []).length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description={`Open a space, type "/todo", and tell it what you need to get done — I'll organize it by priority.`}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {columns.map((col) => (
            <div key={col.priority} className="flex flex-col rounded-2xl border border-ink-200/70 bg-white">
              <div className={cn('flex items-center gap-2 rounded-t-2xl border-b px-4 py-3', col.header)}>
                <span className={cn('h-2 w-2 shrink-0 rounded-full', col.dot)} />
                <p className="text-sm font-semibold text-ink-900">{col.label}</p>
                <span className="ml-auto text-xs font-medium text-ink-400">{col.tasks.length}</span>
              </div>
              <div className="flex flex-col gap-2.5 p-3">
                {col.tasks.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-ink-400">Nothing here.</p>
                ) : (
                  col.tasks.map((task) => (
                    <TodoTaskCard
                      key={task.id}
                      task={task}
                      spaceLabel={spaceTitleById.get(task.space_id)}
                      onToggle={(isCompleted) => toggleTask.mutate({ taskId: task.id, isCompleted })}
                      onDelete={() => deleteTask.mutate(task.id)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
