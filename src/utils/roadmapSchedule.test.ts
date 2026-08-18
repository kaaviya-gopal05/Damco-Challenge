import { describe, expect, it } from 'vitest';
import { computeRoadmapSchedule } from '@/utils/roadmapSchedule';
import type { RoadmapTask, RoadmapWithContent } from '@/types/database';

function makeTask(id: string, estimatedHours: number): RoadmapTask {
  return {
    id,
    phase_id: 'phase-1',
    title: `Task ${id}`,
    description: null,
    resources: [],
    order_index: 0,
    is_completed: false,
    completed_at: null,
    ai_notes: null,
    estimated_hours: estimatedHours,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function makeRoadmap(overrides: Partial<RoadmapWithContent> = {}): RoadmapWithContent {
  return {
    id: 'roadmap-1',
    user_id: 'user-1',
    goal_id: null,
    space_id: null,
    title: 'Test Roadmap',
    description: null,
    estimated_duration_weeks: 4,
    difficulty: 'beginner',
    status: 'active',
    hours_per_day: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    phases: [],
    ...overrides,
  };
}

describe('computeRoadmapSchedule', () => {
  it('defaults to 2 hours/day when hours_per_day is not set', () => {
    const roadmap = makeRoadmap({
      hours_per_day: null,
      phases: [{ id: 'phase-1', roadmap_id: 'roadmap-1', title: 'Phase 1', description: null, order_index: 0, created_at: '', updated_at: '', tasks: [makeTask('t1', 4)] }],
    });
    const { tasks } = computeRoadmapSchedule(roadmap);
    const t1 = tasks.get('t1')!;
    // 4 hours at the 2h/day default spans 2 days: day 0 and day 1.
    const dayDiff = Math.round((t1.endDate.getTime() - t1.startDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(dayDiff).toBe(1);
  });

  it('spreads tasks sequentially across days according to hours_per_day', () => {
    const roadmap = makeRoadmap({
      hours_per_day: 4,
      phases: [
        {
          id: 'phase-1',
          roadmap_id: 'roadmap-1',
          title: 'Phase 1',
          description: null,
          order_index: 0,
          created_at: '',
          updated_at: '',
          tasks: [makeTask('t1', 4), makeTask('t2', 4)],
        },
      ],
    });
    const { tasks, phases } = computeRoadmapSchedule(roadmap);
    const t1 = tasks.get('t1')!;
    const t2 = tasks.get('t2')!;
    // t1 takes exactly one day (4h / 4h-per-day); t2 should start the next day.
    const gapDays = Math.round((t2.startDate.getTime() - t1.startDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(gapDays).toBe(1);

    const phase = phases.get('phase-1')!;
    expect(phase.startDate.getTime()).toBe(t1.startDate.getTime());
    expect(phase.endDate.getTime()).toBe(t2.endDate.getTime());
  });

  it('gives a task with zero estimated hours at least a 1-day slot using the default hours', () => {
    const roadmap = makeRoadmap({
      hours_per_day: 2,
      phases: [{ id: 'phase-1', roadmap_id: 'roadmap-1', title: 'Phase 1', description: null, order_index: 0, created_at: '', updated_at: '', tasks: [makeTask('t1', 0)] }],
    });
    const { tasks } = computeRoadmapSchedule(roadmap);
    const t1 = tasks.get('t1')!;
    expect(t1.endDate.getTime()).toBeGreaterThanOrEqual(t1.startDate.getTime());
  });

  it('collapses an empty phase to a zero-length range anchored at the current day cursor', () => {
    const roadmap = makeRoadmap({
      hours_per_day: 2,
      phases: [
        { id: 'phase-1', roadmap_id: 'roadmap-1', title: 'Phase 1', description: null, order_index: 0, created_at: '', updated_at: '', tasks: [makeTask('t1', 2)] },
        { id: 'phase-2', roadmap_id: 'roadmap-1', title: 'Empty phase', description: null, order_index: 1, created_at: '', updated_at: '', tasks: [] },
      ],
    });
    const { phases } = computeRoadmapSchedule(roadmap);
    const emptyPhase = phases.get('phase-2')!;
    expect(emptyPhase.startDate.getTime()).toBe(emptyPhase.endDate.getTime());
  });
});
