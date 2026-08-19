import { Link } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { TaskPriority, TodoTask } from '@/types/database';

const PRIORITY_DOT: Record<TaskPriority, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
};

export function TodoTasksCard({ tasks }: { tasks: TodoTask[] }) {
  const open = tasks.filter((t) => !t.is_completed);
  const counts: Record<TaskPriority, number> = {
    high: open.filter((t) => t.priority === 'high').length,
    medium: open.filter((t) => t.priority === 'medium').length,
    low: open.filter((t) => t.priority === 'low').length,
  };
  const upNext = [...open]
    .sort((a, b) => {
      const order: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
      if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      return a.due_date ? -1 : b.due_date ? 1 : 0;
    })
    .slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle>To-do tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {open.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Nothing on your plate"
            description={`Type or speak your tasks in any space's chat — I'll organize and prioritize them.`}
          />
        ) : (
          <>
            <div className="flex items-center gap-4 text-sm">
              {(['high', 'medium', 'low'] as const).map((priority) => (
                <span key={priority} className="flex items-center gap-1.5 text-ink-600">
                  <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[priority])} />
                  {counts[priority]} <span className="capitalize text-ink-400">{priority}</span>
                </span>
              ))}
            </div>
            <ul className="mt-3 flex flex-col gap-1">
              {upNext.map((task) => (
                <li key={task.id} className="flex items-center gap-2.5 rounded-xl px-2 py-2">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', PRIORITY_DOT[task.priority])} />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{task.title}</span>
                  {task.due_date && <span className="shrink-0 text-xs text-ink-400">{task.due_date}</span>}
                </li>
              ))}
            </ul>
            <Link to="/app/tasks">
              <Button size="sm" variant="outline" className="mt-3">
                View Task List
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
