import { ListChecks } from 'lucide-react';
import { EmptyState, SkeletonList } from '@/components/ui';
import { TodoTaskCard } from '@/features/tasks/components/TodoTaskCard';
import { useSpaceTasks, useToggleTask, useDeleteTodoTask } from '@/features/tasks/hooks/useTasks';
import type { TaskPriority } from '@/types/database';

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export function SpaceTodoView({ spaceId }: { spaceId: string }) {
  const { data: tasks, isLoading } = useSpaceTasks(spaceId);
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTodoTask();

  if (isLoading) return <SkeletonList rows={4} />;

  if (!tasks || tasks.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No tasks yet"
        description={`Type "/todo" in the chat and tell it what you need to get done — I'll organize it by priority.`}
      />
    );
  }

  const sorted = [...tasks].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col gap-2.5">
      {sorted.map((task) => (
        <TodoTaskCard
          key={task.id}
          task={task}
          onToggle={(isCompleted) => toggleTask.mutate({ taskId: task.id, isCompleted })}
          onDelete={() => deleteTask.mutate(task.id)}
        />
      ))}
    </div>
  );
}
