import { format, startOfDay } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { scheduleTasksAcrossWeek, MAX_TASKS_PER_DAY } from './weeklyPlanSchedule';
import type { TodoTask } from '@/types/database';

const NOW = new Date('2026-06-10T09:00:00.000Z'); // a Wednesday

function task(overrides: Partial<TodoTask> & { id: string }): TodoTask {
  return {
    user_id: 'user-1',
    space_id: 'space-1',
    title: `Task ${overrides.id}`,
    priority: 'medium',
    due_date: null,
    is_completed: false,
    completed_at: null,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

describe('scheduleTasksAcrossWeek', () => {
  it('leaves undated tasks completely untouched', () => {
    const result = scheduleTasksAcrossWeek([task({ id: '1', due_date: null })], NOW);
    expect(result.assignments).toHaveLength(0);
    expect(result.rescheduledCount).toBe(0);
  });

  it('excludes completed tasks even if overdue', () => {
    const result = scheduleTasksAcrossWeek(
      [task({ id: '1', due_date: '2026-06-01', is_completed: true })],
      NOW
    );
    expect(result.assignments).toHaveLength(0);
  });

  it('excludes tasks due more than a week out', () => {
    const result = scheduleTasksAcrossWeek([task({ id: '1', due_date: '2026-07-01' })], NOW);
    expect(result.assignments).toHaveLength(0);
  });

  it('pulls an overdue task forward to today and marks it rescheduled', () => {
    const result = scheduleTasksAcrossWeek([task({ id: '1', due_date: '2026-06-01' })], NOW);
    expect(result.assignments).toEqual([
      expect.objectContaining({ id: '1', day: result.weekStart, wasRescheduled: true }),
    ]);
  });

  it('leaves a task on its already-scheduled day untouched (not rescheduled)', () => {
    const result = scheduleTasksAcrossWeek([task({ id: '1', due_date: todayKey(NOW) })], NOW);
    expect(result.assignments[0]).toMatchObject({ wasRescheduled: false });
  });

  it('orders same-day overflow by priority: high before medium before low', () => {
    const today = todayKey(NOW);
    const tasks = [
      task({ id: 'low', due_date: today, priority: 'low' }),
      task({ id: 'high', due_date: today, priority: 'high' }),
      task({ id: 'medium', due_date: today, priority: 'medium' }),
    ];
    const result = scheduleTasksAcrossWeek(tasks, NOW);
    // All three fit under MAX_TASKS_PER_DAY on the same day — priority order determines
    // which ones would spill first if a 4th task were added, but here just confirm sort order
    // is preserved through the assignment list.
    expect(result.assignments.map((a) => a.id)).toEqual(['high', 'medium', 'low']);
  });

  it(`caps each day at ${MAX_TASKS_PER_DAY} tasks and spills overflow into the next open day`, () => {
    const today = todayKey(NOW);
    const tasks = Array.from({ length: MAX_TASKS_PER_DAY + 1 }, (_, i) =>
      task({ id: `t${i}`, due_date: today, priority: 'high' })
    );
    const result = scheduleTasksAcrossWeek(tasks, NOW);

    const onToday = result.assignments.filter((a) => a.day === today);
    expect(onToday).toHaveLength(MAX_TASKS_PER_DAY);

    const overflow = result.assignments.find((a) => a.day !== today);
    expect(overflow).toBeDefined();
    expect(overflow?.wasRescheduled).toBe(true);
  });

  it('never assigns a day outside the 7-day window', () => {
    const today = todayKey(NOW);
    // Flood a single day well past capacity so overflow has to spill across the whole week.
    const tasks = Array.from({ length: MAX_TASKS_PER_DAY * 8 }, (_, i) =>
      task({ id: `t${i}`, due_date: today, priority: 'high' })
    );
    const result = scheduleTasksAcrossWeek(tasks, NOW);

    for (const assignment of result.assignments) {
      expect(assignment.day >= result.weekStart).toBe(true);
      expect(assignment.day <= result.weekEnd).toBe(true);
    }
  });
});

/** Same today-key derivation the module itself uses, so tests aren't sensitive to the local
 *  timezone the runner happens to be in — only to whether the module's own day-key logic holds. */
function todayKey(now: Date): string {
  return format(startOfDay(now), 'yyyy-MM-dd');
}
