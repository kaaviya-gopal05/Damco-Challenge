import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { getAiService } from '@/services/ai.service';
import { isImportantTask } from '@/services/ai/taskPriorityHeuristics';
import type { GeneratedTaskDraft } from '@/services/ai/types';
import type { PendingDateTask, TaskPriority, TodoTask } from '@/types/database';

export async function listTasksForUser(userId: string): Promise<TodoTask[]> {
  const { data, error } = await supabase
    .from('todo_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TodoTask[];
}

export async function listTasksForSpace(spaceId: string): Promise<TodoTask[]> {
  const { data, error } = await supabase
    .from('todo_tasks')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TodoTask[];
}

export interface GenerateTasksInput {
  userId: string;
  spaceId: string;
  brainDump: string;
}

export interface GenerateTasksResult {
  /** Tasks that already had (or didn't need) a date, created immediately. */
  createdTasks: TodoTask[];
  /** Important, undated tasks (e.g. "prepare for interview") held back so the chat can ask
   *  what date each one is for, rather than silently filing them away with no date. */
  pendingDateTasks: PendingDateTask[];
}

/** Never let an important career/academic task settle for "low" just because the AI backend
 *  under-called it — applies uniformly regardless of whether mock or Gemini drafted it. */
function normalizePriority(draft: GeneratedTaskDraft): TaskPriority {
  if (draft.priority !== 'low' || !isImportantTask(draft.title)) return draft.priority;
  return draft.dueDate ? 'high' : 'medium';
}

async function insertTasks(
  userId: string,
  spaceId: string,
  drafts: { title: string; priority: TaskPriority; dueDate?: string | null }[]
): Promise<TodoTask[]> {
  if (drafts.length === 0) return [];
  const { data, error } = await supabase
    .from('todo_tasks')
    .insert(
      drafts.map((draft) => ({
        user_id: userId,
        space_id: spaceId,
        title: draft.title,
        priority: draft.priority,
        due_date: draft.dueDate ?? null,
      }))
    )
    .select();
  if (error) throw error;
  return (data ?? []) as TodoTask[];
}

export async function generateAndCreateTasks({ userId, spaceId, brainDump }: GenerateTasksInput): Promise<GenerateTasksResult> {
  const ai = getAiService();
  const referenceDate = format(new Date(), 'yyyy-MM-dd');
  const drafts = await ai.generatePrioritizedTasks(brainDump, referenceDate);

  const readyDrafts: { title: string; priority: TaskPriority; dueDate?: string }[] = [];
  const pendingDateTasks: PendingDateTask[] = [];

  for (const draft of drafts) {
    const priority = normalizePriority(draft);
    if (isImportantTask(draft.title) && !draft.dueDate) {
      pendingDateTasks.push({ title: draft.title, priority });
    } else {
      readyDrafts.push({ title: draft.title, priority, dueDate: draft.dueDate });
    }
  }

  const createdTasks = await insertTasks(userId, spaceId, readyDrafts);
  return { createdTasks, pendingDateTasks };
}

/** Parses a free-text answer to "what date is this task for?" — mirrors
 *  commandFlowParsing.ts's parseDeadline but returns null (matching the DB column) instead of
 *  undefined, and treats "no date"/"not sure" style answers as declining rather than as an
 *  unparseable date. */
export function parseTaskDueDate(text: string): string | null {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const declines = ['no date', 'not sure', "don't know", 'no', 'none', 'skip', 'n/a', 'nope', 'unknown'];
  if (!lower || declines.some((phrase) => lower.includes(phrase))) return null;
  const isoMatch = trimmed.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

/** Finalizes one task held back by generateAndCreateTasks once the learner answers what date
 *  it's for — a real date upgrades it to "high" (important + dated); declining leaves it at the
 *  "medium" floor an important task never falls below. */
export async function createTaskWithDate(
  userId: string,
  spaceId: string,
  pending: PendingDateTask,
  dateAnswer: string
): Promise<TodoTask> {
  const dueDate = parseTaskDueDate(dateAnswer);
  const priority: TaskPriority = dueDate ? 'high' : pending.priority;
  const [task] = await insertTasks(userId, spaceId, [{ title: pending.title, priority, dueDate: dueDate ?? undefined }]);
  return task;
}

/** Used by the Email page to file a scanned/classified email away as a scheduled task. */
export async function createTaskFromEmail(
  userId: string,
  spaceId: string,
  title: string,
  priority: TaskPriority,
  dueDate: string
): Promise<TodoTask> {
  const [task] = await insertTasks(userId, spaceId, [{ title, priority, dueDate }]);
  return task;
}

export async function setTaskCompletion(taskId: string, isCompleted: boolean): Promise<void> {
  const { error } = await supabase
    .from('todo_tasks')
    .update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null })
    .eq('id', taskId);
  if (error) throw error;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('todo_tasks').delete().eq('id', taskId);
  if (error) throw error;
}
