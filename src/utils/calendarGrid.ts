import { eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';

/**
 * Builds every cell needed for a month grid view: the target month's days, plus the
 * leading/trailing days from adjacent months required to fill complete weeks (so the
 * grid is always a clean multiple of 7 cells, never a ragged partial week).
 */
export function buildMonthGrid(monthDate: Date): Date[] {
  const start = startOfWeek(startOfMonth(monthDate));
  const end = endOfWeek(endOfMonth(monthDate));
  return eachDayOfInterval({ start, end });
}

/** Builds the 7 days of the week containing `anyDateInWeek`. */
export function buildWeekGrid(anyDateInWeek: Date): Date[] {
  const start = startOfWeek(anyDateInWeek);
  const end = endOfWeek(anyDateInWeek);
  return eachDayOfInterval({ start, end });
}
