import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as tasksService from '@/services/tasks.service';
import { notify } from '@/lib/toast';

export function useUserTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['todo-tasks', user?.id],
    queryFn: () => tasksService.listTasksForUser(user!.id),
    enabled: !!user,
  });
}

export function useSpaceTasks(spaceId: string) {
  return useQuery({
    queryKey: ['todo-tasks', 'space', spaceId],
    queryFn: () => tasksService.listTasksForSpace(spaceId),
    enabled: !!spaceId,
  });
}

export function useToggleTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, isCompleted }: { taskId: string; isCompleted: boolean }) =>
      tasksService.setTaskCompletion(taskId, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
    },
    onError: () => notify.error('Could not update task'),
  });
}

export function useDeleteTodoTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => tasksService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
      notify.success('Task removed');
    },
    onError: () => notify.error('Could not remove task'),
  });
}
