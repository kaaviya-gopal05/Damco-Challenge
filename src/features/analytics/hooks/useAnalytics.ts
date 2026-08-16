import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getAnalyticsSummary } from '@/services/analytics.service';

export function useAnalyticsSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['analytics-summary', user?.id],
    queryFn: () => getAnalyticsSummary(user!.id),
    enabled: !!user,
  });
}
