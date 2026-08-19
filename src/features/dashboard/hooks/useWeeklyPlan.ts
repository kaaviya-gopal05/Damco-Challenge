import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { generateWeeklyPlan, getLatestWeeklyPlan } from '@/services/weeklyPlan.service';
import { notify } from '@/lib/toast';

export function useLatestWeeklyPlan() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['weekly-plan', user?.id],
    queryFn: () => getLatestWeeklyPlan(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useGenerateWeeklyPlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateWeeklyPlan(user!.id),
    onSuccess: (plan) => {
      queryClient.setQueryData(['weekly-plan', user?.id], plan);
      queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
      notify.success(
        plan.rescheduledCount > 0
          ? `This week's plan is ready — ${plan.rescheduledCount} task${plan.rescheduledCount === 1 ? '' : 's'} rescheduled.`
          : `This week's plan is ready.`
      );
    },
    onError: () => notify.error('Could not generate a weekly plan just now.'),
  });
}
