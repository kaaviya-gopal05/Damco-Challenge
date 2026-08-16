import { Bookmark, BookmarkCheck, ExternalLink, Clock } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { formatDuration, cn } from '@/lib/utils';
import type { YoutubeVideo } from '@/services/youtube.service';

export function VideoCard({
  video,
  isSaved,
  onSave,
  onUnsave,
  onWatch,
  isSaving,
}: {
  video: YoutubeVideo;
  isSaved: boolean;
  onSave: () => void;
  onUnsave: () => void;
  onWatch: () => void;
  isSaving?: boolean;
}) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative aspect-video w-full bg-ink-100">
        {video.thumbnailUrl && (
          <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
        {video.durationSeconds && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-ink-950/80 px-1.5 py-0.5 text-xs font-medium text-white">
            <Clock className="h-3 w-3" /> {formatDuration(video.durationSeconds)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="brand">{video.difficulty}</Badge>
          <Badge variant="neutral">{video.category.replace('_', ' ')}</Badge>
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-semibold text-ink-900">{video.title}</p>
        <p className="mt-1 text-xs text-ink-500">{video.channelTitle}</p>
        <p className="mt-2 line-clamp-2 text-xs text-ink-400">{video.description}</p>

        <div className="mt-auto flex items-center gap-2 pt-4">
          <Button size="sm" leftIcon={<ExternalLink className="h-3.5 w-3.5" />} onClick={onWatch} className="flex-1">
            Watch
          </Button>
          <button
            onClick={isSaved ? onUnsave : onSave}
            disabled={isSaving}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors',
              isSaved ? 'border-brand-300 bg-brand-50 text-brand-600' : 'border-ink-200 text-ink-400 hover:border-brand-300 hover:text-brand-600'
            )}
            aria-label={isSaved ? 'Remove from saved videos' : 'Save video'}
          >
            {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </Card>
  );
}
