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

// ---------------------------------------------------------------------------
// Mock catalogue — real, well-known educational videos/channels (title, channel,
// topic curated by hand). No invented statistics. See ARCHITECTURE.md §8.
// ---------------------------------------------------------------------------

const CATALOGUE: YoutubeVideo[] = [
  {
    videoId: 'rfscVS0vtbw',
    title: 'Learn Python - Full Course for Beginners',
    channelTitle: 'freeCodeCamp.org',
    thumbnailUrl: 'https://i.ytimg.com/vi/rfscVS0vtbw/hqdefault.jpg',
    description: 'A full walkthrough of Python fundamentals for complete beginners.',
    durationSeconds: 14830,
    topic: 'python',
    difficulty: 'beginner',
    category: 'beginner',
    source: 'mock',
  },
  {
    videoId: 'GB9ChcFYw0M',
    title: 'Machine Learning for Everybody – Full Course',
    channelTitle: 'freeCodeCamp.org',
    thumbnailUrl: 'https://i.ytimg.com/vi/GB9ChcFYw0M/hqdefault.jpg',
    description: 'A beginner-friendly introduction to core machine learning concepts.',
    durationSeconds: 12010,
    topic: 'machine learning',
    difficulty: 'beginner',
    category: 'beginner',
    source: 'mock',
  },
  {
    videoId: 'aircAruvnKk',
    title: 'But what is a neural network? | Deep learning chapter 1',
    channelTitle: '3Blue1Brown',
    thumbnailUrl: 'https://i.ytimg.com/vi/aircAruvnKk/hqdefault.jpg',
    description: 'A visual, intuitive introduction to how neural networks work.',
    durationSeconds: 1140,
    topic: 'deep learning',
    difficulty: 'intermediate',
    category: 'intermediate',
    source: 'mock',
  },
  {
    videoId: 'bMknfKXIFA8',
    title: 'React Course - Beginner\'s Tutorial for React JavaScript Library',
    channelTitle: 'freeCodeCamp.org',
    thumbnailUrl: 'https://i.ytimg.com/vi/bMknfKXIFA8/hqdefault.jpg',
    description: 'A complete beginner course covering React fundamentals and hooks.',
    durationSeconds: 43200,
    topic: 'react',
    difficulty: 'beginner',
    category: 'beginner',
    source: 'mock',
  },
  {
    videoId: 'w7ejDZ8SWv8',
    title: 'React Course for Beginners 2024',
    channelTitle: 'Programming with Mosh',
    thumbnailUrl: 'https://i.ytimg.com/vi/w7ejDZ8SWv8/hqdefault.jpg',
    description: 'A project-based introduction to building React applications.',
    durationSeconds: 9660,
    topic: 'react',
    difficulty: 'beginner',
    category: 'project_tutorial',
    source: 'mock',
  },
  {
    videoId: 'SqcY0GlETPk',
    title: 'React JS Crash Course',
    channelTitle: 'Traversy Media',
    thumbnailUrl: 'https://i.ytimg.com/vi/SqcY0GlETPk/hqdefault.jpg',
    description: 'A fast-paced crash course through React core concepts.',
    durationSeconds: 5100,
    topic: 'react',
    difficulty: 'intermediate',
    category: 'intermediate',
    source: 'mock',
  },
  {
    videoId: 'ZbjSN3sglqU',
    title: 'System Design Interview – Step By Step Guide',
    channelTitle: 'Gaurav Sen',
    thumbnailUrl: 'https://i.ytimg.com/vi/ZbjSN3sglqU/hqdefault.jpg',
    description: 'A framework for approaching system design interview questions.',
    durationSeconds: 900,
    topic: 'system design',
    difficulty: 'advanced',
    category: 'interview_prep',
    source: 'mock',
  },
  {
    videoId: 'q0KGYwNbf-0',
    title: 'Statistics for Data Science',
    channelTitle: 'Krish Naik',
    thumbnailUrl: 'https://i.ytimg.com/vi/q0KGYwNbf-0/hqdefault.jpg',
    description: 'Core statistics concepts every data scientist needs to know.',
    durationSeconds: 3600,
    topic: 'statistics',
    difficulty: 'beginner',
    category: 'beginner',
    source: 'mock',
  },
  {
    videoId: 'vmEHCJofslg',
    title: 'Learn SQL In 60 Minutes',
    channelTitle: 'Web Dev Simplified',
    thumbnailUrl: 'https://i.ytimg.com/vi/vmEHCJofslg/hqdefault.jpg',
    description: 'A fast, practical introduction to SQL for beginners.',
    durationSeconds: 3600,
    topic: 'sql',
    difficulty: 'beginner',
    category: 'beginner',
    source: 'mock',
  },
  {
    videoId: 'p1hGz0w_OCo',
    title: 'Data Structures and Algorithms for Beginners',
    channelTitle: 'freeCodeCamp.org',
    thumbnailUrl: 'https://i.ytimg.com/vi/p1hGz0w_OCo/hqdefault.jpg',
    description: 'A full introduction to core data structures and algorithms.',
    durationSeconds: 21600,
    topic: 'data structures and algorithms',
    difficulty: 'beginner',
    category: 'interview_prep',
    source: 'mock',
  },
  {
    videoId: 'nu_pCVPKzTk',
    title: 'How to Answer "Tell Me About Yourself" - Interview Tips',
    channelTitle: 'Self Made Millennial',
    thumbnailUrl: 'https://i.ytimg.com/vi/nu_pCVPKzTk/hqdefault.jpg',
    description: 'Practical tips for one of the most common behavioral interview questions.',
    durationSeconds: 660,
    topic: 'interview preparation',
    difficulty: 'beginner',
    category: 'interview_prep',
    source: 'mock',
  },
  {
    videoId: 'PkZNo7MFNFg',
    title: 'Learn JavaScript - Full Course for Beginners',
    channelTitle: 'freeCodeCamp.org',
    thumbnailUrl: 'https://i.ytimg.com/vi/PkZNo7MFNFg/hqdefault.jpg',
    description: 'A full walkthrough of modern JavaScript fundamentals.',
    durationSeconds: 11700,
    topic: 'javascript',
    difficulty: 'beginner',
    category: 'beginner',
    source: 'mock',
  },
  {
    videoId: 'r-uOLxNrNk8',
    title: 'Build a Full Stack App with React & Node',
    channelTitle: 'Traversy Media',
    thumbnailUrl: 'https://i.ytimg.com/vi/r-uOLxNrNk8/hqdefault.jpg',
    description: 'A project tutorial building a full-stack application end to end.',
    durationSeconds: 7200,
    topic: 'full stack',
    difficulty: 'intermediate',
    category: 'project_tutorial',
    source: 'mock',
  },
  {
    videoId: 'x0uinJvhNxI',
    title: 'Building a RAG application from scratch',
    channelTitle: 'freeCodeCamp.org',
    thumbnailUrl: 'https://i.ytimg.com/vi/x0uinJvhNxI/hqdefault.jpg',
    description: 'A hands-on tutorial building a retrieval-augmented generation app.',
    durationSeconds: 9000,
    topic: 'ai engineering',
    difficulty: 'advanced',
    category: 'project_tutorial',
    source: 'mock',
  },
  {
    videoId: 'vqgSO8_cRio',
    title: 'Product Management 101',
    channelTitle: 'Product School',
    thumbnailUrl: 'https://i.ytimg.com/vi/vqgSO8_cRio/hqdefault.jpg',
    description: 'An introduction to the core responsibilities of a product manager.',
    durationSeconds: 2700,
    topic: 'product management',
    difficulty: 'beginner',
    category: 'beginner',
    source: 'mock',
  },
];

const mockYoutubeService: YoutubeService = {
  isLive: false,
  async searchLearningVideos({ topic, difficulty, category, maxDurationMinutes }) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const normalizedTopic = topic.trim().toLowerCase();

    return CATALOGUE.filter((video) => {
      const matchesTopic =
        !normalizedTopic ||
        video.topic.includes(normalizedTopic) ||
        video.title.toLowerCase().includes(normalizedTopic) ||
        video.description.toLowerCase().includes(normalizedTopic);
      const matchesDifficulty = !difficulty || video.difficulty === difficulty;
      const matchesCategory = !category || video.category === category;
      const matchesDuration =
        !maxDurationMinutes || !video.durationSeconds || video.durationSeconds / 60 <= maxDurationMinutes;
      return matchesTopic && matchesDifficulty && matchesCategory && matchesDuration;
    });
  },
};

// ---------------------------------------------------------------------------
// Real implementation — YouTube Data API v3, used only when VITE_YOUTUBE_API_KEY
// is configured.
// ---------------------------------------------------------------------------

class YoutubeDataApiService implements YoutubeService {
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

let cachedService: YoutubeService | null = null;

export function getYoutubeService(): YoutubeService {
  if (cachedService) return cachedService;
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  cachedService = apiKey ? new YoutubeDataApiService(apiKey) : mockYoutubeService;
  return cachedService;
}
