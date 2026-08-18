import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { CalendarEventChip } from '@/features/calendar/components/CalendarEventChip';
import type { CalendarEvent } from '@/utils/calendarEvents';

export function DayView({ date, eventsByDate }: { date: Date; eventsByDate: Map<string, CalendarEvent[]> }) {
  const events = eventsByDate.get(format(date, 'yyyy-MM-dd')) ?? [];

  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nothing scheduled"
        description="No roadmap tasks or to-do items are due on this day."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map((event) => (
        <div key={`${event.kind}-${event.id}`} className="rounded-xl border border-ink-200 bg-white p-3">
          <CalendarEventChip event={event} />
          {event.kind === 'roadmap-task' && (
            <p className="mt-1.5 text-xs text-ink-400">From roadmap: {event.roadmapTitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}
