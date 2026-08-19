import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import { buildCalendarEvents } from '@/utils/calendarEvents';
import type { RoadmapTask, RoadmapWithContent, TodoTask } from '@/types/database';

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
    hours_per_day: 2,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    phases: [],
    ...overrides,
  };
}

function makeTodoTask(overrides: Partial<TodoTask> = {}): TodoTask {
  return {
    id: 'task-1',
    user_id: 'user-1',
    space_id: 'space-1',
    title: 'Buy eggs',
    priority: 'low',
    due_date: null,
    is_completed: false,
    completed_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildCalendarEvents', () => {
  it('places a roadmap task on its computed schedule start date', () => {
    const roadmap = makeRoadmap({
      created_at: '2026-01-01T00:00:00.000Z',
      phases: [
        { id: 'phase-1', roadmap_id: 'roadmap-1', title: 'Phase 1', description: null, order_index: 0, created_at: '', updated_at: '', tasks: [makeTask('t1', 2)] },
      ],
    });
    const events = buildCalendarEvents([roadmap], []);
    const dateKey = format(new Date(2026, 0, 1), 'yyyy-MM-dd');
    const dayEvents = events.get(dateKey) ?? [];
    expect(dayEvents.some((e) => e.kind === 'roadmap-task' && e.id === 't1')).toBe(true);
  });

  it('places a todo task on its due date', () => {
    const task = makeTodoTask({ id: 'todo-1', due_date: '2026-03-15' });
    const events = buildCalendarEvents([], [task]);
    const dayEvents = events.get('2026-03-15') ?? [];
    expect(dayEvents).toHaveLength(1);
    expect(dayEvents[0]).toMatchObject({ kind: 'todo-task', id: 'todo-1', priority: 'low' });
  });

  it('omits a todo task with no due date entirely', () => {
    const task = makeTodoTask({ id: 'todo-2', due_date: null });
    const events = buildCalendarEvents([], [task]);
    const allEvents = Array.from(events.values()).flat();
    expect(allEvents.find((e) => e.id === 'todo-2')).toBeUndefined();
  });

  it('combines roadmap and todo events landing on the same day', () => {
    const roadmap = makeRoadmap({
      created_at: '2026-03-15T00:00:00.000Z',
      phases: [
        { id: 'phase-1', roadmap_id: 'roadmap-1', title: 'Phase 1', description: null, order_index: 0, created_at: '', updated_at: '', tasks: [makeTask('t1', 2)] },
      ],
    });
    const task = makeTodoTask({ id: 'todo-1', due_date: '2026-03-15' });
    const events = buildCalendarEvents([roadmap], [task]);
    const dayEvents = events.get('2026-03-15') ?? [];
    expect(dayEvents).toHaveLength(2);
    expect(dayEvents.map((e) => e.kind).sort()).toEqual(['roadmap-task', 'todo-task']);
  });

  it('pushes an incomplete roadmap task to the next day once today is full', () => {
    // Three independent one-task roadmaps, all paced to land on the same day — a learner with
    // several active roadmaps at once. Only the first two should fit; the third gets nudged.
    const roadmaps = ['a', 'b', 'c'].map((letter) =>
      makeRoadmap({
        id: `roadmap-${letter}`,
        created_at: '2026-06-01T00:00:00.000Z',
        phases: [
          {
            id: `phase-${letter}`,
            roadmap_id: `roadmap-${letter}`,
            title: 'Phase 1',
            description: null,
            order_index: 0,
            created_at: '',
            updated_at: '',
            tasks: [makeTask(`t-${letter}`, 2)],
          },
        ],
      })
    );
    const events = buildCalendarEvents(roadmaps, []);
    expect(events.get('2026-06-01') ?? []).toHaveLength(2);
    expect(events.get('2026-06-02') ?? []).toHaveLength(1);
  });

  it('never pushes a roadmap task past its estimated finish date', () => {
    // A single-week roadmap whose one incomplete task collides with a full day every day
    // through its finish date (created_at + estimated_duration_weeks) — it must land at or
    // before that boundary, never spill into the following week.
    const finishDateKey = '2026-07-08';
    const filler = Array.from({ length: 8 }, (_, i) => {
      const dateKey = format(new Date(2026, 6, 1 + i), 'yyyy-MM-dd');
      return [
        makeTodoTask({ id: `filler-a-${i}`, due_date: dateKey }),
        makeTodoTask({ id: `filler-b-${i}`, due_date: dateKey }),
      ];
    }).flat();
    const roadmap = makeRoadmap({
      created_at: '2026-07-01T00:00:00.000Z',
      estimated_duration_weeks: 1,
      phases: [
        { id: 'phase-1', roadmap_id: 'roadmap-1', title: 'Phase 1', description: null, order_index: 0, created_at: '', updated_at: '', tasks: [makeTask('t1', 2)] },
      ],
    });
    const events = buildCalendarEvents([roadmap], filler);
    const placedPastFinish = events.get('2026-07-09')?.some((e) => e.id === 't1') ?? false;
    const placedAtFinish = events.get(finishDateKey)?.some((e) => e.id === 't1') ?? false;
    expect(placedPastFinish).toBe(false);
    expect(placedAtFinish).toBe(true);
  });
});
