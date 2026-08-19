import { describe, expect, it } from 'vitest';
import { parseTaskDueDate } from '@/services/tasks.service';

describe('parseTaskDueDate', () => {
  it('parses an explicit ISO date', () => {
    expect(parseTaskDueDate('2026-12-01')).toBe('2026-12-01');
  });

  it('parses an ISO date embedded in a full sentence', () => {
    expect(parseTaskDueDate('It is due on 2026-12-01, thanks')).toBe('2026-12-01');
  });

  it.each(['no date', 'no', 'not sure', "don't know", 'skip', 'n/a'])('treats "%s" as declining to give a date', (answer) => {
    expect(parseTaskDueDate(answer)).toBeNull();
  });

  it('returns null for unparseable free text', () => {
    expect(parseTaskDueDate('sometime whenever')).toBeNull();
  });
});
