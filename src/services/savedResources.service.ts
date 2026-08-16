import { supabase } from '@/lib/supabase';
import { logActivity } from '@/services/activity.service';
import type { YoutubeVideo } from '@/services/youtube.service';
import type { SavedResource, YoutubeResource } from '@/types/database';

export async function cacheYoutubeResource(video: YoutubeVideo): Promise<YoutubeResource> {
  const { data, error } = await supabase
    .from('youtube_resources')
    .upsert(
      {
        video_id: video.videoId,
        title: video.title,
        channel_title: video.channelTitle,
        thumbnail_url: video.thumbnailUrl,
        description: video.description,
        duration_seconds: video.durationSeconds,
        topic: video.topic,
        difficulty: video.difficulty,
        category: video.category,
        source: video.source,
      },
      { onConflict: 'video_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as YoutubeResource;
}

export interface SavedResourceWithVideo extends SavedResource {
  youtube_resources: YoutubeResource;
}

export async function listSavedResources(userId: string): Promise<SavedResourceWithVideo[]> {
  const { data, error } = await supabase
    .from('saved_resources')
    .select('*, youtube_resources(*)')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SavedResourceWithVideo[];
}

export async function saveResource(userId: string, video: YoutubeVideo, notes?: string): Promise<void> {
  const resource = await cacheYoutubeResource(video);
  const { error } = await supabase
    .from('saved_resources')
    .upsert(
      { user_id: userId, youtube_resource_id: resource.id, notes: notes ?? null },
      { onConflict: 'user_id,youtube_resource_id' }
    );
  if (error) throw error;

  await logActivity({ userId, activityType: 'video_saved', metadata: { videoId: video.videoId } });
}

export async function unsaveResource(userId: string, youtubeResourceId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_resources')
    .delete()
    .eq('user_id', userId)
    .eq('youtube_resource_id', youtubeResourceId);
  if (error) throw error;
}

export async function markVideoWatched(userId: string, video: YoutubeVideo): Promise<void> {
  await logActivity({
    userId,
    activityType: 'video_watched',
    metadata: { videoId: video.videoId },
    minutes: video.durationSeconds ? Math.round(video.durationSeconds / 60) : undefined,
  });
}
