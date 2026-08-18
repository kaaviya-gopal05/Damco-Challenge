import { describe, expect, it } from 'vitest';
import { endOfMonth, startOfMonth } from 'date-fns';
import { buildMonthGrid, buildWeekGrid } from '@/utils/calendarGrid';

describe('buildMonthGrid', () => {
  it('returns a grid length that is a multiple of 7 (complete weeks only)', () => {
    const grid = buildMonthGrid(new Date(2026, 1, 15)); // Feb 2026
    expect(grid.length % 7).toBe(0);
  });

  it('starts on a Sunday and ends on a Saturday', () => {
    const grid = buildMonthGrid(new Date(2026, 1, 15));
    expect(grid[0].getDay()).toBe(0);
    expect(grid[grid.length - 1].getDay()).toBe(6);
  });

  it('includes the first and last day of the target month', () => {
    const monthDate = new Date(2026, 1, 15);
    const grid = buildMonthGrid(monthDate);
    const gridDateStrings = grid.map((d) => d.toDateString());
    expect(gridDateStrings).toContain(startOfMonth(monthDate).toDateString());
    expect(gridDateStrings).toContain(endOfMonth(monthDate).toDateString());
  });

  it("updates to the new month's dates when the month changes", () => {
    const feb = buildMonthGrid(new Date(2026, 1, 1));
    const mar = buildMonthGrid(new Date(2026, 2, 1));
    expect(feb[0].toDateString()).not.toBe(mar[0].toDateString());
    expect(mar.map((d) => d.toDateString())).toContain(startOfMonth(new Date(2026, 2, 1)).toDateString());
  });
});

describe('buildWeekGrid', () => {
  it('returns exactly 7 days, starting Sunday and ending Saturday', () => {
    const grid = buildWeekGrid(new Date(2026, 1, 18));
    expect(grid).toHaveLength(7);
    expect(grid[0].getDay()).toBe(0);
    expect(grid[6].getDay()).toBe(6);
  });

  it('contains the reference date', () => {
    const reference = new Date(2026, 1, 18);
    const grid = buildWeekGrid(reference);
    expect(grid.map((d) => d.toDateString())).toContain(reference.toDateString());
  });
});
