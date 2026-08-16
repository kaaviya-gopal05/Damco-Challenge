import { Link } from 'react-router-dom';
import { PlayCircle, Bookmark } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, EmptyState, SkeletonList } from '@/components/ui';
import { useVideoSearch, useSaveVideo, useIsYoutubeLive } from '@/features/youtube/hooks/useYoutube';

export function RecommendedVideosCard({ topic }: { topic: string }) {
  const { data: videos, isLoading } = useVideoSearch({ topic }, true);
  const saveVideo = useSaveVideo();
  const isLive = useIsYoutubeLive();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Recommended for you</CardTitle>
        {!isLive && <Badge variant="neutral">Demo data</Badge>}
      </CardHeader>
      <CardContent>
        {isLoading && <SkeletonList rows={2} />}
        {!isLoading && (videos?.length ?? 0) === 0 && (
          <EmptyState icon={PlayCircle} title="No recommendations yet" description="Search Learning Videos to get started." />
        )}
        {!isLoading && (videos?.length ?? 0) > 0 && (
          <ul className="flex flex-col gap-3">
            {videos!.slice(0, 3).map((video) => (
              <li key={video.videoId} className="flex items-center gap-3">
                <img
                  src={video.thumbnailUrl}
                  alt=""
                  className="h-12 w-20 shrink-0 rounded-lg object-cover bg-ink-100"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800">{video.title}</p>
                  <p className="truncate text-xs text-ink-400">{video.channelTitle}</p>
                </div>
                <button
                  onClick={() => saveVideo.mutate(video)}
                  className="shrink-0 rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-brand-600"
                  aria-label="Save video"
                >
                  <Bookmark className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link to="/app/spaces">
          <Button variant="outline" size="sm" className="mt-4">
            Browse all videos
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
