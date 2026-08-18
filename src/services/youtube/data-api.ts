import type { VideoSearchParams, YoutubeService, YoutubeVideo } from '@/services/youtube/types';

// ---------------------------------------------------------------------------
// Real implementation — YouTube Data API v3, used only when VITE_YOUTUBE_API_KEY
// is configured. The Data API is designed for client-side use; restrict the key
// by HTTP referrer in the Google Cloud Console before shipping it publicly.
// ---------------------------------------------------------------------------

export class YoutubeDataApiService implements YoutubeService {
  isLive = true;

  constructor(private apiKey: string) {}

  async searchLearningVideos({ topic, difficulty, category }: VideoSearchParams): Promise<YoutubeVideo[]> {
    const query = encodeURIComponent(`${topic} tutorial ${difficulty ?? ''}`.trim());
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&q=${query}&key=${this.apiKey}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error(`YouTube search failed: ${searchRes.status}`);
    const searchData = await searchRes.json();

    const ids = (searchData.items ?? []).map((item: { id: { videoId: string } }) => item.id.videoId).join(',');
    if (!ids) return [];

    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${ids}&key=${this.apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) throw new Error(`YouTube video details failed: ${detailsRes.status}`);
    const detailsData = await detailsRes.json();

    return (detailsData.items ?? []).map(
      (item: {
        id: string;
        snippet: { title: string; channelTitle: string; description: string; thumbnails: { high?: { url: string } } };
        contentDetails: { duration: string };
      }) => ({
        videoId: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails.high?.url ?? '',
        description: item.snippet.description,
        durationSeconds: parseIsoDuration(item.contentDetails.duration),
        topic,
        difficulty: difficulty ?? 'beginner',
        category: category ?? 'beginner',
        source: 'api' as const,
      })
    );
  }
}

function parseIsoDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}
