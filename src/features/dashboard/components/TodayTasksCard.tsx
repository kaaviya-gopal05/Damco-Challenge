import { Circle, ListTodo } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, EmptyState } from '@/components/ui';
import type { RoadmapWithContent } from '@/types/database';
import { cn } from '@/lib/utils';

export function TodayTasksCard({
  roadmaps,
  onToggle,
}: {
  roadmaps: RoadmapWithContent[];
  onToggle: (taskId: string, isCompleted: boolean) => void;
}) {
  const pendingTasks = roadmaps
    .filter((r) => r.status === 'active')
    .flatMap((r) => r.phases.flatMap((p) => p.tasks.map((t) => ({ ...t, roadmapTitle: r.title }))))
    .filter((t) => !t.is_completed)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's learning tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {pendingTasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="Nothing pending"
            description="You're all caught up on your roadmap tasks."
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {pendingTasks.map((task) => (
              <li key={task.id}>
                <button
                  onClick={() => onToggle(task.id, true)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-ink-50'
                  )}
                >
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" />
                  <span>
                    <span className="block text-sm font-medium text-ink-800">{task.title}</span>
                    <span className="block text-xs text-ink-400">{task.roadmapTitle}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
