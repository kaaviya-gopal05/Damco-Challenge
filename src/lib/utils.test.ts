import { describe, expect, it } from 'vitest';
import { cn, formatDuration, initialsFromName, truncate } from '@/lib/utils';

describe('cn', () => {
  it('merges class names and resolves Tailwind conflicts (last one wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });
});

describe('formatDuration', () => {
  it('returns an empty string for null/0', () => {
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(0)).toBe('');
  });

  it('formats under an hour as minutes only', () => {
    expect(formatDuration(125 * 60)).toBe('2h 5m');
  });

  it('formats under a minute as 0m', () => {
    expect(formatDuration(45)).toBe('0m');
  });

  it('formats an exact hour with no leftover minutes', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
  });
});

describe('truncate', () => {
  it('returns the original string when under the limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates and appends an ellipsis when over the limit', () => {
    expect(truncate('hello world', 5)).toBe('hello…');
  });

  it('trims trailing whitespace before appending the ellipsis', () => {
    expect(truncate('hello   world', 8)).toBe('hello…');
  });
});

describe('initialsFromName', () => {
  it('returns "?" for null/undefined/empty', () => {
    expect(initialsFromName(null)).toBe('?');
    expect(initialsFromName(undefined)).toBe('?');
    expect(initialsFromName('')).toBe('?');
  });

  it('uses the first two letters of a single-word name', () => {
    expect(initialsFromName('Kaaviya')).toBe('KA');
  });

  it('uses first-letter-of-first + first-letter-of-last for multi-word names', () => {
    expect(initialsFromName('Kaaviya Gopal')).toBe('KG');
    expect(initialsFromName('Kaaviya G. Gopal')).toBe('KG');
  });
});
