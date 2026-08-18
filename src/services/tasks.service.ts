import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { getAiService } from '@/services/ai.service';
import type { TodoTask } from '@/types/database';

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

export async function generateAndCreateTasks({ userId, spaceId, brainDump }: GenerateTasksInput): Promise<TodoTask[]> {
  const ai = getAiService();
  const referenceDate = format(new Date(), 'yyyy-MM-dd');
  const drafts = await ai.generatePrioritizedTasks(brainDump, referenceDate);

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
