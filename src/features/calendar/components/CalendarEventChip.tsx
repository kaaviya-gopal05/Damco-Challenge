import { ListChecks, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/utils/calendarEvents';

const PRIORITY_CLASSES: Record<string, string> = {
  high: 'bg-rose-50 text-rose-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-emerald-50 text-emerald-700',
};

export function CalendarEventChip({ event, dense = false }: { event: CalendarEvent; dense?: boolean }) {
  const isRoadmap = event.kind === 'roadmap-task';
  const colorClass = isRoadmap ? 'bg-brand-50 text-brand-700' : PRIORITY_CLASSES[event.priority ?? 'low'];
  const Icon = isRoadmap ? Map : ListChecks;

  return (
    <div
      className={cn(
        'flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-xs font-medium',
        colorClass,
        event.isCompleted && 'opacity-50 line-through',
        dense ? 'w-full' : ''
      )}
      title={isRoadmap ? `${event.roadmapTitle} — ${event.title}` : event.title}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{event.title}</span>
    </div>
  );
}
