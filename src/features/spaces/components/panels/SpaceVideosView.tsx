import { useState } from 'react';
import { Search, PlayCircle } from 'lucide-react';
import { Badge, Button, EmptyState, Input, Select, SkeletonList, Tabs, TabList, Tab, TabPanel } from '@/components/ui';
import { VIDEO_CATEGORIES } from '@/lib/constants';
import {
  useVideoSearch,
  useIsYoutubeLive,
  useSavedResources,
  useSaveVideo,
  useUnsaveVideo,
  useMarkVideoWatched,
} from '@/features/youtube/hooks/useYoutube';
import { VideoCard } from '@/features/youtube/components/VideoCard';
import type { Difficulty, VideoCategory } from '@/types/database';
import type { YoutubeVideo } from '@/services/youtube.service';

const DIFFICULTIES: { value: Difficulty | ''; label: string }[] = [
  { value: '', label: 'Any difficulty' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export function SpaceVideosView({ defaultTopic }: { defaultTopic: string }) {
  const [topic, setTopic] = useState(defaultTopic);
  const [submittedTopic, setSubmittedTopic] = useState(defaultTopic);
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [category, setCategory] = useState<VideoCategory | ''>('');

  const isLive = useIsYoutubeLive();
  const { data: videos, isLoading } = useVideoSearch(
    { topic: submittedTopic, difficulty: difficulty || undefined, category: category || undefined },
    true
  );
  const { data: savedResources } = useSavedResources();
  const saveVideo = useSaveVideo();
  const unsaveVideo = useUnsaveVideo();
  const markWatched = useMarkVideoWatched();

  const savedVideoIds = new Set((savedResources ?? []).map((s) => s.youtube_resources.video_id));
  const savedResourceIdByVideoId = new Map(
    (savedResources ?? []).map((s) => [s.youtube_resources.video_id, s.youtube_resource_id])
  );

  function handleWatch(video: YoutubeVideo) {
    window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank', 'noopener,noreferrer');
    markWatched.mutate(video);
  }

  return (
    <div>
      <Tabs defaultValue="discover">
        <TabList className="mb-6">
          <Tab value="discover">Discover</Tab>
          <Tab value="saved">Saved ({savedResources?.length ?? 0})</Tab>
        </TabList>

        <TabPanel value="discover">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedTopic(topic);
            }}
            className="mb-6 flex flex-col gap-3"
          >
            <Input
              label="Topic, skill, or learning goal"
              placeholder="e.g. Machine Learning"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Select
                  label="Difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty | '')}
                  options={DIFFICULTIES.map((d) => ({ value: d.value, label: d.label }))}
                />
              </div>
              <div className="flex-1">
                <Select
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VideoCategory | '')}
                  options={[{ value: '', label: 'All categories' }, ...VIDEO_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))]}
                />
              </div>
            </div>
            <Button type="submit" className="self-start">
              Search
            </Button>
          </form>

          {!isLive && (
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="neutral">Demo data</Badge>
              <p className="text-xs text-ink-400">
                Configure VITE_YOUTUBE_API_KEY to pull live results from the YouTube Data API.
              </p>
            </div>
          )}

          {isLoading && <SkeletonList rows={3} />}

          {!isLoading && (videos?.length ?? 0) === 0 && (
            <EmptyState icon={PlayCircle} title="No videos found" description="Try a different topic or clear the filters." />
          )}

          {!isLoading && (videos?.length ?? 0) > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {videos!.map((video) => (
                <VideoCard
                  key={video.videoId}
                  video={video}
                  isSaved={savedVideoIds.has(video.videoId)}
                  onSave={() => saveVideo.mutate(video)}
                  onUnsave={() => {
                    const resourceId = savedResourceIdByVideoId.get(video.videoId);
                    if (resourceId) unsaveVideo.mutate(resourceId);
                  }}
                  onWatch={() => handleWatch(video)}
                  isSaving={saveVideo.isPending}
                />
              ))}
            </div>
          )}
        </TabPanel>

        <TabPanel value="saved">
          {(savedResources?.length ?? 0) === 0 ? (
            <EmptyState icon={PlayCircle} title="No saved videos yet" description="Save videos from Discover to build your watch list." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {savedResources!.map((saved) => {
                const r = saved.youtube_resources;
                const video = {
                  videoId: r.video_id,
                  title: r.title,
                  channelTitle: r.channel_title,
                  thumbnailUrl: r.thumbnail_url ?? '',
                  description: r.description ?? '',
                  durationSeconds: r.duration_seconds,
                  topic: r.topic ?? '',
                  difficulty: r.difficulty ?? 'beginner',
                  category: r.category ?? 'beginner',
                  source: r.source,
                } as const;
                return (
                  <VideoCard
                    key={saved.id}
                    video={video}
                    isSaved
                    onSave={() => {}}
                    onUnsave={() => unsaveVideo.mutate(saved.youtube_resource_id)}
                    onWatch={() => handleWatch(video)}
                  />
                );
              })}
            </div>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}
