import { format, isSameMonth, isToday } from 'date-fns';
import { buildMonthGrid } from '@/utils/calendarGrid';
import { CalendarEventChip } from '@/features/calendar/components/CalendarEventChip';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/utils/calendarEvents';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_EVENTS = 3;

export function MonthView({
  monthDate,
  eventsByDate,
  onSelectDay,
}: {
  monthDate: Date;
  eventsByDate: Map<string, CalendarEvent[]>;
  onSelectDay: (day: Date) => void;
}) {
  const days = buildMonthGrid(monthDate);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200">
      <div className="grid grid-cols-7 border-b border-ink-200 bg-ink-50">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-xs font-semibold text-ink-500">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate.get(dateKey) ?? [];
          const visible = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
          const overflow = dayEvents.length - visible.length;
          const inMonth = isSameMonth(day, monthDate);

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDay(day)}
              className={cn(
                'flex min-h-[104px] flex-col items-stretch gap-1 border-b border-r border-ink-100 p-1.5 text-left transition-colors hover:bg-brand-50/40',
                !inMonth && 'bg-ink-50/50'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isToday(day) ? 'bg-brand-600 text-white' : inMonth ? 'text-ink-700' : 'text-ink-300'
                )}
              >
                {format(day, 'd')}
              </span>
              <div className="flex flex-col gap-0.5">
                {visible.map((event) => (
                  <CalendarEventChip key={`${event.kind}-${event.id}`} event={event} />
                ))}
                {overflow > 0 && <span className="px-1 text-[11px] text-ink-400">+{overflow} more</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
