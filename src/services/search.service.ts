import { supabase } from '@/lib/supabase';

export type SearchResultKind = 'roadmap' | 'task' | 'flashcard_deck' | 'document' | 'mind_map' | 'saved_video' | 'space';

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle?: string;
  path: string;
}

function spacePath(spaceId: string | null): string {
  return spaceId ? `/app/spaces/${spaceId}` : '/app/spaces';
}

export async function searchAll(userId: string, query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const like = `%${trimmed}%`;

  const [spaces, roadmaps, tasks, decks, documents, mindMaps, savedVideos] = await Promise.all([
    supabase.from('spaces').select('id, title, goal_text').eq('user_id', userId).ilike('title', like).limit(5),
    supabase.from('roadmaps').select('id, title, description, space_id').eq('user_id', userId).ilike('title', like).limit(5),
    supabase
      .from('roadmap_tasks')
      .select('id, title, phase_id, roadmap_phases!inner(roadmap_id, roadmaps!inner(user_id, space_id))')
      .eq('roadmap_phases.roadmaps.user_id', userId)
      .ilike('title', like)
      .limit(5),
    supabase.from('flashcard_decks').select('id, title, description, space_id').eq('user_id', userId).ilike('title', like).limit(5),
    supabase
      .from('documents')
      .select('id, title, space_id')
      .eq('user_id', userId)
      .eq('is_resume', false)
      .ilike('title', like)
      .limit(5),
    supabase.from('mind_maps').select('id, title, description, space_id').eq('user_id', userId).ilike('title', like).limit(5),
    supabase
      .from('saved_resources')
      .select('id, youtube_resource_id, youtube_resources!inner(title, channel_title)')
      .eq('user_id', userId)
      .ilike('youtube_resources.title', like)
      .limit(5),
  ]);

  const results: SearchResult[] = [];

  for (const s of spaces.data ?? []) {
    results.push({ kind: 'space', id: s.id, title: s.title, subtitle: s.goal_text ?? 'Space', path: spacePath(s.id) });
  }
  for (const r of roadmaps.data ?? []) {
    results.push({ kind: 'roadmap', id: r.id, title: r.title, subtitle: r.description ?? undefined, path: spacePath(r.space_id) });
  }
  for (const t of (tasks.data ?? []) as unknown as {
    id: string;
    title: string;
    phase_id: string;
    roadmap_phases: { roadmap_id: string; roadmaps: { user_id: string; space_id: string | null } };
  }[]) {
    results.push({ kind: 'task', id: t.id, title: t.title, subtitle: 'Roadmap task', path: spacePath(t.roadmap_phases.roadmaps.space_id) });
  }
  for (const d of decks.data ?? []) {
    results.push({ kind: 'flashcard_deck', id: d.id, title: d.title, subtitle: d.description ?? 'Flashcard deck', path: spacePath(d.space_id) });
  }
  for (const doc of documents.data ?? []) {
    results.push({ kind: 'document', id: doc.id, title: doc.title, subtitle: 'PDF document', path: spacePath(doc.space_id) });
  }
  for (const m of mindMaps.data ?? []) {
    results.push({ kind: 'mind_map', id: m.id, title: m.title, subtitle: m.description ?? 'Mind map', path: spacePath(m.space_id) });
  }
  for (const v of (savedVideos.data ?? []) as unknown as {
    id: string;
    youtube_resource_id: string;
    youtube_resources: { title: string; channel_title: string };
  }[]) {
    results.push({
      kind: 'saved_video',
      id: v.id,
      title: v.youtube_resources.title,
      subtitle: v.youtube_resources.channel_title,
      path: '/app/spaces',
    });
  }

  return results;
}
