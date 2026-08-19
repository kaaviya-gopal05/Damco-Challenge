import { useMemo } from 'react';
import { format, addDays, startOfDay } from 'date-fns';
import { CalendarClock, Sparkles, RotateCcw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { AiMarkdown } from '@/components/markdown/AiMarkdown';
import { useGenerateWeeklyPlan, useLatestWeeklyPlan } from '@/features/dashboard/hooks/useWeeklyPlan';
import type { TaskPriority, WeeklyPlanFocusItem } from '@/types/database';

const PRIORITY_DOT: Record<TaskPriority, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
};

function groupByDay(items: WeeklyPlanFocusItem[]): Map<string, WeeklyPlanFocusItem[]> {
  const map = new Map<string, WeeklyPlanFocusItem[]>();
  for (const item of items) {
    const list = map.get(item.day) ?? [];
    list.push(item);
    map.set(item.day, list);
  }
  return map;
}

export function WeeklyPlanCard() {
  const { data: plan, isLoading } = useLatestWeeklyPlan();
  const generate = useGenerateWeeklyPlan();

  const weekDays = useMemo(() => {
    const start = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  const isStale = plan ? plan.weekStart !== format(weekDays[0], 'yyyy-MM-dd') : false;
  const grouped = plan ? groupByDay(plan.focusItems) : new Map<string, WeeklyPlanFocusItem[]>();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brand-600" />
            Weekly Plan
          </CardTitle>
          <CardDescription>
            Autonomously rebalances your overdue and this-week tasks across the next 7 days, then AI writes the recap.
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant={plan ? 'outline' : 'primary'}
          leftIcon={plan ? <RotateCcw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          isLoading={generate.isPending || isLoading}
          onClick={() => generate.mutate()}
        >
          {plan ? 'Regenerate' : 'Generate This Week’s Plan'}
        </Button>
      </CardHeader>
      <CardContent>
        {!plan && !isLoading ? (
          <p className="text-sm text-ink-500">
            No plan yet this week. Generating one will spread your overdue and upcoming to-do tasks evenly across the
            next 7 days (no more than 3 a day) and reschedule anything that's piling up — for real, not just a
            suggestion.
          </p>
        ) : plan ? (
          <div className="flex flex-col gap-4">
            {isStale && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                This plan is from a previous week — click Regenerate for a fresh one.
              </p>
            )}
            <AiMarkdown content={plan.summary} />
            {plan.dailyRhythm && <p className="text-sm italic text-ink-500">{plan.dailyRhythm}</p>}
            {plan.rescheduledCount > 0 && (
              <p className="text-xs font-medium text-brand-600">
                {plan.rescheduledCount} task{plan.rescheduledCount === 1 ? '' : 's'} rescheduled automatically to avoid pile-ups.
              </p>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
              {weekDays.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const items = grouped.get(key) ?? [];
                return (
                  <div key={key} className="rounded-xl border border-ink-100 p-2">
                    <p className="text-xs font-semibold text-ink-700">{format(day, 'EEE')}</p>
                    <p className="text-[10px] text-ink-400">{format(day, 'MMM d')}</p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {items.length === 0 ? (
                        <li className="text-[11px] text-ink-300">—</li>
                      ) : (
                        items.map((item, i) => (
                          <li key={i} className="flex items-start gap-1 text-[11px] leading-tight text-ink-600">
                            <span
                              className={cn(
                                'mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full',
                                item.priority ? PRIORITY_DOT[item.priority] : 'bg-brand-400'
                              )}
                            />
                            <span className="line-clamp-2">{item.title}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
            {plan.focusItems.some((i) => i.source === 'roadmap') && (
              <p className="flex items-center gap-1 text-[11px] text-ink-400">
                <Badge variant="neutral" className="h-4 px-1.5 py-0 text-[10px]">
                  roadmap
                </Badge>
                items are shown for context and aren't moved — only to-do tasks are rescheduled.
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
