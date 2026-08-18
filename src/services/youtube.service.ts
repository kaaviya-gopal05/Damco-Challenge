import { mockYoutubeService } from '@/services/youtube/mock-catalogue';
import { YoutubeDataApiService } from '@/services/youtube/data-api';

export type { VideoSearchParams, YoutubeService, YoutubeVideo } from '@/services/youtube/types';
import type { YoutubeService } from '@/services/youtube/types';

let cachedService: YoutubeService | null = null;

export function getYoutubeService(): YoutubeService {
  if (cachedService) return cachedService;
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  cachedService = apiKey ? new YoutubeDataApiService(apiKey) : mockYoutubeService;
  return cachedService;
}
