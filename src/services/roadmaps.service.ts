import { supabase } from '@/lib/supabase';
import { getAiService, type RoadmapOptions } from '@/services/ai.service';
import { logActivity } from '@/services/activity.service';
import type { Roadmap, RoadmapPhase, RoadmapTask, RoadmapWithContent, TaskResource } from '@/types/database';

type PhaseWithTasks = RoadmapPhase & { roadmap_tasks: RoadmapTask[] };
type RoadmapRow = Roadmap & { roadmap_phases: PhaseWithTasks[] };

function toRoadmapWithContent(row: RoadmapRow): RoadmapWithContent {
  const { roadmap_phases, ...roadmap } = row;
  return {
    ...roadmap,
    phases: [...roadmap_phases]
      .sort((a, b) => a.order_index - b.order_index)
      .map((phase) => {
        const { roadmap_tasks, ...phaseFields } = phase;
        return {
          ...phaseFields,
          tasks: [...roadmap_tasks].sort((a, b) => a.order_index - b.order_index),
        };
      }),
  };
}

export function roadmapProgress(roadmap: RoadmapWithContent): number {
  const tasks = roadmap.phases.flatMap((p) => p.tasks);
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.is_completed).length;
  return Math.round((completed / tasks.length) * 100);
}

const NESTED_SELECT = '*, roadmap_phases(*, roadmap_tasks(*))';

export async function listRoadmaps(userId: string): Promise<RoadmapWithContent[]> {
  const { data, error } = await supabase
    .from('roadmaps')
    .select(NESTED_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RoadmapRow[]).map(toRoadmapWithContent);
}

export async function getRoadmap(roadmapId: string): Promise<RoadmapWithContent> {
  const { data, error } = await supabase
    .from('roadmaps')
    .select(NESTED_SELECT)
    .eq('id', roadmapId)
    .single();
  if (error) throw error;
  return toRoadmapWithContent(data as unknown as RoadmapRow);
}

export interface GenerateRoadmapInput extends RoadmapOptions {
  userId: string;
  goal: string;
  goalId?: string;
  spaceId?: string;
}

export async function generateAndCreateRoadmap({
  userId,
  goal,
  goalId,
  spaceId,
  level,
  deadline,
  hoursPerDay,
  materialText,
}: GenerateRoadmapInput): Promise<RoadmapWithContent> {
  const ai = getAiService();
  const generated = await ai.generateRoadmap(goal, { level, deadline, hoursPerDay, materialText });

  const { data: roadmap, error: roadmapError } = await supabase
    .from('roadmaps')
    .insert({
      user_id: userId,
      goal_id: goalId ?? null,
      space_id: spaceId ?? null,
      title: generated.title,
      description: generated.description,
      estimated_duration_weeks: generated.estimatedDurationWeeks,
      difficulty: generated.difficulty,
      hours_per_day: hoursPerDay ?? null,
    })
    .select()
    .single();
  if (roadmapError) throw roadmapError;

  for (let i = 0; i < generated.phases.length; i++) {
    const phase = generated.phases[i];
    const { data: phaseRow, error: phaseError } = await supabase
      .from('roadmap_phases')
      .insert({ roadmap_id: roadmap.id, title: phase.title, description: phase.description, order_index: i })
      .select()
      .single();
    if (phaseError) throw phaseError;

    const taskRows = phase.tasks.map((task, j) => ({
      phase_id: phaseRow.id,
      title: task.title,
      description: task.description,
      order_index: j,
      resources: [] as TaskResource[],
      estimated_hours: task.estimatedHours && task.estimatedHours > 0 ? task.estimatedHours : 2,
    }));
    if (taskRows.length > 0) {
      const { error: tasksError } = await supabase.from('roadmap_tasks').insert(taskRows);
      if (tasksError) throw tasksError;
    }
  }

  await logActivity({ userId, activityType: 'roadmap_created', metadata: { roadmapId: roadmap.id, goal } });

  return getRoadmap(roadmap.id);
}

export async function updateRoadmap(
  roadmapId: string,
  updates: Partial<Pick<Roadmap, 'title' | 'description' | 'status' | 'difficulty' | 'estimated_duration_weeks'>>
): Promise<void> {
  const { error } = await supabase.from('roadmaps').update(updates).eq('id', roadmapId);
  if (error) throw error;
}

export async function deleteRoadmap(roadmapId: string): Promise<void> {
  const { error } = await supabase.from('roadmaps').delete().eq('id', roadmapId);
  if (error) throw error;
}

export async function addTask(
  phaseId: string,
  input: { title: string; description?: string; orderIndex: number }
): Promise<RoadmapTask> {
  const { data, error } = await supabase
    .from('roadmap_tasks')
    .insert({
      phase_id: phaseId,
      title: input.title,
      description: input.description ?? null,
      order_index: input.orderIndex,
    })
    .select()
    .single();
  if (error) throw error;
  return data as RoadmapTask;
}

export async function updateTask(
  taskId: string,
  updates: Partial<Pick<RoadmapTask, 'title' | 'description' | 'order_index'>>
): Promise<void> {
  const { error } = await supabase.from('roadmap_tasks').update(updates).eq('id', taskId);
  if (error) throw error;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('roadmap_tasks').delete().eq('id', taskId);
  if (error) throw error;
}

export async function setTaskCompletion(userId: string, taskId: string, isCompleted: boolean): Promise<void> {
  const { error } = await supabase
    .from('roadmap_tasks')
    .update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null })
    .eq('id', taskId);
  if (error) throw error;

  if (isCompleted) {
    await logActivity({ userId, activityType: 'task_completed', metadata: { taskId } });
  }
}

export async function getOrGenerateTaskNotes(
  roadmapTitle: string,
  phaseTitle: string,
  task: RoadmapTask
): Promise<string> {
  if (task.ai_notes) return task.ai_notes;

  const ai = getAiService();
  const notes = await ai.generateTaskNotes({
    roadmapTitle,
    phaseTitle,
    taskTitle: task.title,
    taskDescription: task.description ?? undefined,
  });

  // Best-effort cache write: if this fails (e.g. the ai_notes migration hasn't been run yet),
  // the learner should still see the notes we just generated rather than an error.
  await supabase.from('roadmap_tasks').update({ ai_notes: notes }).eq('id', task.id);

  return notes;
}

export async function addPhase(
  roadmapId: string,
  input: { title: string; description?: string; orderIndex: number }
): Promise<RoadmapPhase> {
  const { data, error } = await supabase
    .from('roadmap_phases')
    .insert({
      roadmap_id: roadmapId,
      title: input.title,
      description: input.description ?? null,
      order_index: input.orderIndex,
    })
    .select()
    .single();
  if (error) throw error;
  return data as RoadmapPhase;
}
