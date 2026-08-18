import type { Difficulty, VideoCategory } from '@/types/database';

export interface YoutubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  description: string;
  durationSeconds: number | null;
  topic: string;
  difficulty: Difficulty;
  category: VideoCategory;
  source: 'mock' | 'api';
}

export interface VideoSearchParams {
  topic: string;
  difficulty?: Difficulty;
  category?: VideoCategory;
  maxDurationMinutes?: number;
}

export interface YoutubeService {
  searchLearningVideos(params: VideoSearchParams): Promise<YoutubeVideo[]>;
  isLive: boolean;
}
