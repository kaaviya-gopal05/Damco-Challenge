import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Map as MapIcon, Share2, Layers, FileText, ArrowUpRight, Archive } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Card, CardContent, EmptyState, SkeletonList, Tabs, TabList, Tab, TabPanel } from '@/components/ui';
import { useRoadmaps } from '@/features/roadmaps/hooks/useRoadmaps';
import { useMindMaps } from '@/features/mindmaps/hooks/useMindMaps';
import { useDecks } from '@/features/flashcards/hooks/useFlashcards';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useSpaces } from '@/features/spaces/hooks/useSpaces';
import type { LucideIcon } from 'lucide-react';

type MemoryKind = 'roadmap' | 'mindmap' | 'flashcards' | 'document';

interface MemoryItem {
  kind: MemoryKind;
  id: string;
  title: string;
  spaceId: string | null;
  createdAt: string;
  extra?: string;
}

const KIND_ICON: Record<MemoryKind, LucideIcon> = {
  roadmap: MapIcon,
  mindmap: Share2,
  flashcards: Layers,
  document: FileText,
};

const KIND_LABEL: Record<MemoryKind, string> = {
  roadmap: 'Roadmap',
  mindmap: 'Mind Map',
  flashcards: 'Flashcard Deck',
  document: 'PDF Document',
};

function MemoryCard({ item, spaceTitle }: { item: MemoryItem; spaceTitle: string | null }) {
  const Icon = KIND_ICON[item.kind];
  const href = item.spaceId ? `/app/spaces/${item.spaceId}?open=${item.kind}:${item.id}` : '/app/spaces';
  return (
    <Link to={href}>
      <Card className="h-full transition-shadow hover:shadow-card">
        <CardContent className="flex h-full flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon className="h-4 w-4" />
            </div>
            <Badge variant="neutral">{KIND_LABEL[item.kind]}</Badge>
          </div>
          <div className="flex-1">
            <p className="font-medium text-ink-900">{item.title}</p>
            {item.extra && <p className="mt-0.5 text-xs text-ink-400">{item.extra}</p>}
          </div>
          <div className="flex items-center justify-between text-xs text-ink-400">
            <span className="truncate">{spaceTitle ?? 'No space'}</span>
            <span className="flex shrink-0 items-center gap-1 font-medium text-brand-600">
              Open <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function MemoryPage() {
  const { data: roadmaps, isLoading: roadmapsLoading } = useRoadmaps();
  const { data: mindMaps, isLoading: mindMapsLoading } = useMindMaps();
  const { data: decks, isLoading: decksLoading } = useDecks();
  const { data: documents, isLoading: documentsLoading } = useDocuments();
  const { data: spaces } = useSpaces();
  const [tab, setTab] = useState<'all' | MemoryKind>('all');

  const isLoading = roadmapsLoading || mindMapsLoading || decksLoading || documentsLoading;

  const spaceTitleById = useMemo(() => new Map((spaces ?? []).map((s) => [s.id, s.title])), [spaces]);

  const items: MemoryItem[] = useMemo(() => {
    const all: MemoryItem[] = [
      ...(roadmaps ?? []).map((r) => ({ kind: 'roadmap' as const, id: r.id, title: r.title, spaceId: r.space_id, createdAt: r.created_at })),
      ...(mindMaps ?? []).map((m) => ({ kind: 'mindmap' as const, id: m.id, title: m.title, spaceId: m.space_id, createdAt: m.created_at })),
      ...(decks ?? []).map((d) => ({ kind: 'flashcards' as const, id: d.id, title: d.title, spaceId: d.space_id, createdAt: d.created_at })),
      ...(documents ?? []).map((d) => ({
        kind: 'document' as const,
        id: d.id,
        title: d.title,
        spaceId: d.space_id,
        createdAt: d.created_at,
        extra: d.status !== 'ready' ? d.status : undefined,
      })),
    ];
    // A null space_id means the owning space was deleted — that content has no home
    // to open into anymore, so don't list it.
    return all
      .filter((item) => item.spaceId !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [roadmaps, mindMaps, decks, documents]);

  const filtered = tab === 'all' ? items : items.filter((i) => i.kind === tab);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Memory" description="Everything you've generated, across every space, in one library." />

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="Nothing generated yet"
          description="Roadmaps, mind maps, flashcards, and PDFs you create in any space will show up here."
        />
      ) : (
        <Tabs defaultValue="all" onValueChange={(v) => setTab(v as typeof tab)}>
          <TabList className="mb-6 flex-wrap">
            <Tab value="all">All ({items.length})</Tab>
            <Tab value="roadmap">Roadmaps ({items.filter((i) => i.kind === 'roadmap').length})</Tab>
            <Tab value="mindmap">Mind Maps ({items.filter((i) => i.kind === 'mindmap').length})</Tab>
            <Tab value="flashcards">Flashcards ({items.filter((i) => i.kind === 'flashcards').length})</Tab>
            <Tab value="document">Documents ({items.filter((i) => i.kind === 'document').length})</Tab>
          </TabList>

          <TabPanel value={tab}>
            {filtered.length === 0 ? (
              <EmptyState icon={Archive} title="Nothing here yet" description="Try a different category." />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((item) => (
                  <MemoryCard key={`${item.kind}-${item.id}`} item={item} spaceTitle={item.spaceId ? spaceTitleById.get(item.spaceId) ?? null : null} />
                ))}
              </div>
            )}
          </TabPanel>
        </Tabs>
      )}
    </div>
  );
}
