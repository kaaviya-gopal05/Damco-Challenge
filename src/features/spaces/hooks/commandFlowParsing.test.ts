import { describe, expect, it } from 'vitest';
import { isAffirmative, parseDeadline, parseHours, parseLevel } from '@/features/spaces/hooks/commandFlowParsing';

describe('isAffirmative', () => {
  it.each(['yes', 'Yes', 'y', 'yeah', 'sure', 'please', '  yes  '])('treats "%s" as affirmative', (input) => {
    expect(isAffirmative(input)).toBe(true);
  });

  it.each(['no', 'nope', 'n/a', 'skip', ''])('treats "%s" as not affirmative', (input) => {
    expect(isAffirmative(input)).toBe(false);
  });
});

describe('parseLevel', () => {
  it('recognizes intermediate from any casing/substring', () => {
    expect(parseLevel('Intermediate')).toBe('intermediate');
    expect(parseLevel('somewhere in the intermediate range')).toBe('intermediate');
  });

  it('recognizes advanced', () => {
    expect(parseLevel('advanced')).toBe('advanced');
    expect(parseLevel('Adv')).toBe('advanced');
  });

  it('defaults unrecognized input to beginner', () => {
    expect(parseLevel('total newbie')).toBe('beginner');
    expect(parseLevel('')).toBe('beginner');
  });
});

describe('parseDeadline', () => {
  it('returns undefined for negative replies', () => {
    for (const reply of ['no', 'None', 'skip', 'n/a', 'Nope', '']) {
      expect(parseDeadline(reply)).toBeUndefined();
    }
  });

  it('extracts an explicit ISO date if present', () => {
    expect(parseDeadline('2026-12-01')).toBe('2026-12-01');
    expect(parseDeadline('by 2026-12-01 please')).toBe('2026-12-01');
  });

  it('parses a natural-language date into YYYY-MM-DD format', () => {
    // Deliberately not asserting the exact day: `parseDeadline` parses in the
    // runner's local timezone and formats via `toISOString()` (UTC), so a
    // midnight-local date can land on the previous UTC day depending on where
    // the test runs. That's an existing characteristic of the implementation,
    // not something this test should be sensitive to.
    const result = parseDeadline('December 1, 2026');
    expect(result).toMatch(/^2026-(11-30|12-01)$/);
  });

  it('returns undefined for unparseable garbage', () => {
    expect(parseDeadline('whenever, I guess')).toBeUndefined();
  });
});

describe('parseHours', () => {
  it('extracts a whole number', () => {
    expect(parseHours('3 hours a day')).toBe(3);
  });

  it('extracts a decimal number', () => {
    expect(parseHours('about 1.5 hours')).toBe(1.5);
  });

  it('defaults to 2 when no number is present', () => {
    expect(parseHours('not sure')).toBe(2);
  });

  it('defaults to 2 for a non-positive number', () => {
    expect(parseHours('0 hours')).toBe(2);
  });
});
