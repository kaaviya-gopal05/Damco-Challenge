import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile } from '@/services/profile.service';
import { notify } from '@/lib/toast';
import type { Profile } from '@/types/database';

export function useCurrentProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'headline' | 'timezone'>>) =>
      updateProfile(user!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      notify.success('Profile updated');
    },
    onError: () => notify.error('Could not update profile'),
  });
}
