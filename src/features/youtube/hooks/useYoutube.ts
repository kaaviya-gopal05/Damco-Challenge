import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getYoutubeService, type VideoSearchParams, type YoutubeVideo } from '@/services/youtube.service';
import * as savedResourcesService from '@/services/savedResources.service';
import { notify } from '@/lib/toast';

export function useVideoSearch(params: VideoSearchParams, enabled: boolean) {
  return useQuery({
    queryKey: ['youtube-search', params],
    queryFn: () => getYoutubeService().searchLearningVideos(params),
    enabled,
  });
}

export function useIsYoutubeLive() {
  return getYoutubeService().isLive;
}

export function useSavedResources() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['saved-resources', user?.id],
    queryFn: () => savedResourcesService.listSavedResources(user!.id),
    enabled: !!user,
  });
}

export function useSaveVideo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (video: YoutubeVideo) => savedResourcesService.saveResource(user!.id, video),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-resources', user?.id] });
      notify.success('Saved to your workspace');
    },
    onError: () => notify.error('Could not save video'),
  });
}

export function useUnsaveVideo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (youtubeResourceId: string) => savedResourcesService.unsaveResource(user!.id, youtubeResourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-resources', user?.id] });
      notify.success('Removed from saved videos');
    },
    onError: () => notify.error('Could not remove video'),
  });
}

export function useMarkVideoWatched() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: (video: YoutubeVideo) => savedResourcesService.markVideoWatched(user!.id, video),
  });
}
