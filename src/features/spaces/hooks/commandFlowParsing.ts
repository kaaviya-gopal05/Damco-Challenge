import type { Difficulty } from '@/types/database';

export function isAffirmative(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return lower.startsWith('y') || lower.includes('sure') || lower.includes('please');
}

export function parseLevel(text: string): Difficulty {
  const lower = text.toLowerCase();
  if (lower.includes('inter')) return 'intermediate';
  if (lower.includes('adv')) return 'advanced';
  return 'beginner';
}

export function parseDeadline(text: string): string | undefined {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  if (!lower || ['no', 'none', 'skip', 'n/a', 'nope'].includes(lower)) return undefined;
  const isoMatch = trimmed.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

export function parseHours(text: string): number {
  const match = text.match(/\d+(\.\d+)?/);
  const value = match ? parseFloat(match[0]) : NaN;
  return Number.isFinite(value) && value > 0 ? value : 2;
}

const UNCERTAIN_ROLE_ANSWERS = new Set(["i don't know", 'idk', 'not sure', 'unsure', 'no', 'none', 'skip', 'n/a', 'na', 'nope']);

/** A direct answer to "what role are you targeting?" is only rejected (re-asked) when it's
 *  empty or an explicit non-answer — anything else, however phrased, is taken at face value as
 *  the role, same trust level the rest of this flow gives a topic/goal answer. */
export function isValidRoleAnswer(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;
  return !UNCERTAIN_ROLE_ANSWERS.has(trimmed.toLowerCase());
}
