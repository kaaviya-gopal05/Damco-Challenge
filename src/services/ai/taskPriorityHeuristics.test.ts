import { describe, expect, it } from 'vitest';
import { addMonths, format } from 'date-fns';
import { draftTasksFromBrainDump } from '@/services/ai/taskPriorityHeuristics';

const REFERENCE_DATE = '2026-01-15';

describe('draftTasksFromBrainDump', () => {
  it('returns an empty list for an empty brain dump', () => {
    expect(draftTasksFromBrainDump('', REFERENCE_DATE)).toEqual([]);
    expect(draftTasksFromBrainDump('   ', REFERENCE_DATE)).toEqual([]);
  });

  it('splits a realistic multi-task brain dump into distinct, sensibly-titled tasks, prioritized correctly', () => {
    const drafts = draftTasksFromBrainDump(
      'I want to buy two eggs, and then one month after, I will have an exam, and then tonight I need to complete this pitch deck.',
      REFERENCE_DATE
    );

    expect(drafts).toHaveLength(3);

    // High priority (tonight) sorts first, then the dated exam, then the undated errand.
    expect(drafts[0].title).toBe('Complete this pitch deck');
    expect(drafts[0].priority).toBe('high');
    expect(drafts[0].dueDate).toBe(REFERENCE_DATE);

    expect(drafts[1].title).toBe('Have an exam');
    expect(drafts[1].priority).toBe('medium');
    expect(drafts[1].dueDate).toBe(format(addMonths(new Date(REFERENCE_DATE), 1), 'yyyy-MM-dd'));

    expect(drafts[2].title).toBe('Buy two eggs');
    expect(drafts[2].priority).toBe('low');
    expect(drafts[2].dueDate).toBeUndefined();
  });

  it('treats "today" the same as "tonight" — high priority, due today', () => {
    const [draft] = draftTasksFromBrainDump('finish the report today', REFERENCE_DATE);
    expect(draft.priority).toBe('high');
    expect(draft.dueDate).toBe(REFERENCE_DATE);
  });

  it('resolves an explicit ISO date without needing a relative-time cue', () => {
    const [draft] = draftTasksFromBrainDump('submit the form by 2026-02-01', REFERENCE_DATE);
    expect(draft.dueDate).toBe('2026-02-01');
    expect(draft.priority).toBe('medium');
  });

  it('splits on periods as well as "and then"', () => {
    const drafts = draftTasksFromBrainDump('Walk the dog. Water the plants.', REFERENCE_DATE);
    expect(drafts).toHaveLength(2);
  });

  it('gives an undated task low priority by default', () => {
    const [draft] = draftTasksFromBrainDump('read a book sometime', REFERENCE_DATE);
    expect(draft.priority).toBe('low');
    expect(draft.dueDate).toBeUndefined();
  });
});
