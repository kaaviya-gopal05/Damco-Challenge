import { format, isToday } from 'date-fns';
import { buildWeekGrid } from '@/utils/calendarGrid';
import { CalendarEventChip } from '@/features/calendar/components/CalendarEventChip';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/utils/calendarEvents';

export function WeekView({
  weekDate,
  eventsByDate,
  onSelectDay,
}: {
  weekDate: Date;
  eventsByDate: Map<string, CalendarEvent[]>;
  onSelectDay: (day: Date) => void;
}) {
  const days = buildWeekGrid(weekDate);

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayEvents = eventsByDate.get(dateKey) ?? [];
        return (
          <div key={dateKey} className="flex min-h-[320px] flex-col rounded-xl border border-ink-200">
            <button
              onClick={() => onSelectDay(day)}
              className="flex flex-col items-center gap-0.5 border-b border-ink-100 py-2 hover:bg-ink-50"
            >
              <span className="text-[11px] font-medium uppercase text-ink-400">{format(day, 'EEE')}</span>
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold',
                  isToday(day) ? 'bg-brand-600 text-white' : 'text-ink-800'
                )}
              >
                {format(day, 'd')}
              </span>
            </button>
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-thin p-1.5">
              {dayEvents.length === 0 ? (
                <p className="mt-4 text-center text-[11px] text-ink-300">No events</p>
              ) : (
                dayEvents.map((event) => <CalendarEventChip key={`${event.kind}-${event.id}`} event={event} dense />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
