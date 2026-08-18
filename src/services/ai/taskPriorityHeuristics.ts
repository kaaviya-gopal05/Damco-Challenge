import { addDays, addMonths, addWeeks, format } from 'date-fns';
import type { TaskPriority } from '@/types/database';
import type { GeneratedTaskDraft } from '@/services/ai/types';

// ---------------------------------------------------------------------------
// Pure heuristic behind mockAiService.generatePrioritizedTasks — splits a
// free-text/voice "brain dump" into individual tasks, resolves relative time
// references ("tonight", "one month after") into absolute dates relative to a
// reference date, and assigns a priority. Deliberately simple pattern-matching,
// not real NLP — the real implementation (GeminiService) does the actual
// understanding; this just needs to demo sensibly with zero configuration.
// ---------------------------------------------------------------------------

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function parseAmount(token: string): number {
  const lower = token.toLowerCase();
  if (NUMBER_WORDS[lower] !== undefined) return NUMBER_WORDS[lower];
  const n = parseInt(token, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

const URGENT_PATTERN = /\b(tonight|today|this (morning|afternoon|evening)|asap|right away|\bnow\b)\b/i;
const TOMORROW_PATTERN = /\btomorrow\b/i;
const ISO_DATE_PATTERN = /\d{4}-\d{2}-\d{2}/;
const RELATIVE_PATTERN =
  /\b(a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(day|week|month)s?\s*(after|from now|later)?\b/i;
const NEXT_WEEK_PATTERN = /\bnext week\b/i;
const NEXT_MONTH_PATTERN = /\bnext month\b/i;

interface ResolvedDueDate {
  dueDate?: string;
  isUrgent: boolean;
}

function resolveDueDate(clause: string, referenceDate: Date): ResolvedDueDate {
  if (URGENT_PATTERN.test(clause)) {
    return { dueDate: formatDate(referenceDate), isUrgent: true };
  }
  if (TOMORROW_PATTERN.test(clause)) {
    return { dueDate: formatDate(addDays(referenceDate, 1)), isUrgent: false };
  }

  const isoMatch = clause.match(ISO_DATE_PATTERN);
  if (isoMatch) {
    return { dueDate: isoMatch[0], isUrgent: false };
  }

  const relativeMatch = clause.match(RELATIVE_PATTERN);
  if (relativeMatch) {
    const amount = parseAmount(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const date =
      unit === 'day' ? addDays(referenceDate, amount) : unit === 'week' ? addWeeks(referenceDate, amount) : addMonths(referenceDate, amount);
    return { dueDate: formatDate(date), isUrgent: false };
  }

  if (NEXT_WEEK_PATTERN.test(clause)) {
    return { dueDate: formatDate(addWeeks(referenceDate, 1)), isUrgent: false };
  }
  if (NEXT_MONTH_PATTERN.test(clause)) {
    return { dueDate: formatDate(addMonths(referenceDate, 1)), isUrgent: false };
  }

  return { isUrgent: false };
}

const FILLER_PATTERNS = [URGENT_PATTERN, TOMORROW_PATTERN, RELATIVE_PATTERN, NEXT_WEEK_PATTERN, NEXT_MONTH_PATTERN];

function toTitle(clause: string): string {
  let cleaned = clause;
  for (const pattern of FILLER_PATTERNS) {
    cleaned = cleaned.replace(new RegExp(pattern.source, 'gi'), '');
  }
  cleaned = cleaned
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .replace(/^(and\s+)?(i\s+(want to|will|need to|have to|must|should|gotta)\s*)/i, '')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();

  if (!cleaned) cleaned = clause.trim();
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return cleaned.length > 80 ? `${cleaned.slice(0, 77)}...` : cleaned;
}

function splitClauses(text: string): string[] {
  return text
    .split(/\.\s*|\band then\b|(?:^|\s)then\b/i)
    .map((s) => s.replace(/^[,\s]+|[,\s]+$/g, ''))
    .filter((s) => s.length > 2);
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export function draftTasksFromBrainDump(brainDump: string, referenceDateISO: string): GeneratedTaskDraft[] {
  const parsedReference = new Date(referenceDateISO);
  const referenceDate = Number.isNaN(parsedReference.getTime()) ? new Date() : parsedReference;

  const drafts = splitClauses(brainDump).map((clause) => {
    const { dueDate, isUrgent } = resolveDueDate(clause, referenceDate);
    const priority: TaskPriority = isUrgent ? 'high' : dueDate ? 'medium' : 'low';
    return { title: toTitle(clause), priority, dueDate };
  });

  return drafts.sort((a, b) => {
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    }
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}
