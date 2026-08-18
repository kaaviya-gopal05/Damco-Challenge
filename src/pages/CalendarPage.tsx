import { useMemo, useState } from 'react';
import { addDays, addMonths, addWeeks, format, subDays, subMonths, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, SkeletonList, Tabs, TabList, Tab } from '@/components/ui';
import { useRoadmaps } from '@/features/roadmaps/hooks/useRoadmaps';
import { useUserTasks } from '@/features/tasks/hooks/useTasks';
import { buildCalendarEvents } from '@/utils/calendarEvents';
import { MonthView } from '@/features/calendar/components/MonthView';
import { WeekView } from '@/features/calendar/components/WeekView';
import { DayView } from '@/features/calendar/components/DayView';

type ViewMode = 'day' | 'week' | 'month';

export function CalendarPage() {
  const { data: roadmaps, isLoading: roadmapsLoading } = useRoadmaps();
  const { data: tasks, isLoading: tasksLoading } = useUserTasks();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [cursorDate, setCursorDate] = useState(() => new Date());

  const eventsByDate = useMemo(() => buildCalendarEvents(roadmaps ?? [], tasks ?? []), [roadmaps, tasks]);
  const isLoading = roadmapsLoading || tasksLoading;

  function goPrev() {
    setCursorDate((d) => (viewMode === 'month' ? subMonths(d, 1) : viewMode === 'week' ? subWeeks(d, 1) : subDays(d, 1)));
  }

  function goNext() {
    setCursorDate((d) => (viewMode === 'month' ? addMonths(d, 1) : viewMode === 'week' ? addWeeks(d, 1) : addDays(d, 1)));
  }

  function selectDay(day: Date) {
    setCursorDate(day);
    setViewMode('day');
  }

  const heading =
    viewMode === 'month'
      ? format(cursorDate, 'MMMM yyyy')
      : viewMode === 'week'
        ? `Week of ${format(cursorDate, 'MMM d, yyyy')}`
        : format(cursorDate, 'EEEE, MMMM d, yyyy');

  return (
    <div className="animate-fade-in">
      <PageHeader title="Calendar" description="Your roadmap schedule and to-do tasks, all in one place." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursorDate(new Date())}>
            Today
          </Button>
          <p className="ml-2 text-sm font-semibold text-ink-900">{heading}</p>
        </div>

        <Tabs defaultValue="month" value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabList>
            <Tab value="day">Day</Tab>
            <Tab value="week">Week</Tab>
            <Tab value="month">Month</Tab>
          </TabList>
        </Tabs>
      </div>

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : viewMode === 'month' ? (
        <MonthView monthDate={cursorDate} eventsByDate={eventsByDate} onSelectDay={selectDay} />
      ) : viewMode === 'week' ? (
        <WeekView weekDate={cursorDate} eventsByDate={eventsByDate} onSelectDay={selectDay} />
      ) : (
        <DayView date={cursorDate} eventsByDate={eventsByDate} />
      )}
    </div>
  );
}
