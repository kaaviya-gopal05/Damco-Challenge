import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as roadmapsService from '@/services/roadmaps.service';
import { notify } from '@/lib/toast';
import type { RoadmapTask } from '@/types/database';

type GenerateRoadmapMutationInput = Omit<roadmapsService.GenerateRoadmapInput, 'userId'>;

export function useRoadmaps() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['roadmaps', user?.id],
    queryFn: () => roadmapsService.listRoadmaps(user!.id),
    enabled: !!user,
  });
}

export function useRoadmap(roadmapId: string | undefined) {
  return useQuery({
    queryKey: ['roadmap', roadmapId],
    queryFn: () => roadmapsService.getRoadmap(roadmapId!),
    enabled: !!roadmapId,
  });
}

export function useGenerateRoadmap() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateRoadmapMutationInput) =>
      roadmapsService.generateAndCreateRoadmap({ userId: user!.id, ...input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps', user?.id] });
      if (variables.spaceId) queryClient.invalidateQueries({ queryKey: ['space-contents', variables.spaceId] });
      notify.success('Roadmap generated');
    },
    onError: () => notify.error('Could not generate roadmap. Please try again.'),
  });
}

export function useDeleteRoadmap() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roadmapId: string) => roadmapsService.deleteRoadmap(roadmapId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps', user?.id] });
      notify.success('Roadmap deleted');
    },
    onError: () => notify.error('Could not delete roadmap'),
  });
}

export function useSetTaskCompletion(roadmapId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, isCompleted }: { taskId: string; isCompleted: boolean }) =>
      roadmapsService.setTaskCompletion(user!.id, taskId, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap', roadmapId] });
      queryClient.invalidateQueries({ queryKey: ['roadmaps', user?.id] });
    },
    onError: () => notify.error('Could not update task'),
  });
}

export function useAddTask(roadmapId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ phaseId, title, description, orderIndex }: { phaseId: string; title: string; description?: string; orderIndex: number }) =>
      roadmapsService.addTask(phaseId, { title, description, orderIndex }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap', roadmapId] });
      notify.success('Task added');
    },
    onError: () => notify.error('Could not add task'),
  });
}

export function useUpdateTask(roadmapId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, title, description }: { taskId: string; title: string; description?: string }) =>
      roadmapsService.updateTask(taskId, { title, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap', roadmapId] });
      notify.success('Task updated');
    },
    onError: () => notify.error('Could not update task'),
  });
}

export function useDeleteTask(roadmapId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => roadmapsService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap', roadmapId] });
      notify.success('Task removed');
    },
    onError: () => notify.error('Could not remove task'),
  });
}

export function useTaskNotes(
  roadmapId: string,
  roadmapTitle: string,
  phaseTitle: string,
  task: RoadmapTask | null
) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['task-notes', task?.id],
    queryFn: async () => {
      const notes = await roadmapsService.getOrGenerateTaskNotes(roadmapTitle, phaseTitle, task!);
      queryClient.invalidateQueries({ queryKey: ['roadmap', roadmapId] });
      return notes;
    },
    enabled: !!task,
    staleTime: Infinity,
  });
}

export function useAddPhase(roadmapId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, description, orderIndex }: { title: string; description?: string; orderIndex: number }) =>
      roadmapsService.addPhase(roadmapId, { title, description, orderIndex }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap', roadmapId] });
      notify.success('Phase added');
    },
    onError: () => notify.error('Could not add phase'),
  });
}
