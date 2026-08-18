import { ArrowLeft, Map, Share2, Layers, FileText, PlayCircle, ListChecks, Sparkles } from 'lucide-react';
import { Badge, Button, Card, CardContent, SkeletonList } from '@/components/ui';
import { useSpaceContents } from '@/features/spaces/hooks/useSpaces';
import { useSpaceTasks } from '@/features/tasks/hooks/useTasks';
import { SpaceRoadmapView } from '@/features/spaces/components/panels/SpaceRoadmapView';
import { SpaceMindMapView } from '@/features/spaces/components/panels/SpaceMindMapView';
import { SpaceFlashcardDeckView } from '@/features/spaces/components/panels/SpaceFlashcardDeckView';
import { SpaceDocumentView } from '@/features/spaces/components/panels/SpaceDocumentView';
import { SpaceVideosView } from '@/features/spaces/components/panels/SpaceVideosView';
import { SpaceTodoView } from '@/features/spaces/components/panels/SpaceTodoView';
import type { ActiveView } from '@/features/spaces/types';
import type { SlashCommandId } from '@/features/spaces/components/SlashCommandMenu';
import type { Space } from '@/types/database';

function SourceEmptyCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: typeof Map;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2.5 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon className="h-4 w-4" />
          </div>
          <p className="text-sm font-semibold text-ink-900">{title}</p>
        </div>
        <p className="text-xs text-ink-500">{description}</p>
        <Button
          size="sm"
          leftIcon={<Sparkles className="h-3.5 w-3.5" />}
          onClick={onAction}
          className="self-start"
        >
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

export function SpaceArtifactPanel({
  space,
  activeView,
  setActiveView,
  onTriggerCommand,
}: {
  space: Space;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onTriggerCommand: (id: SlashCommandId) => void;
}) {
  const { data: contents, isLoading } = useSpaceContents(space.id);
  const { data: tasks } = useSpaceTasks(space.id);

  if (activeView.type !== 'overview') {
    return (
      <div className="p-6">
        <button
          onClick={() => setActiveView({ type: 'overview' })}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to overview
        </button>
        {activeView.type === 'roadmap' && (
          <SpaceRoadmapView roadmapId={activeView.id} onDeleted={() => setActiveView({ type: 'overview' })} />
        )}
        {activeView.type === 'mindmap' && <SpaceMindMapView mindMapId={activeView.id} />}
        {activeView.type === 'flashcards' && <SpaceFlashcardDeckView deckId={activeView.id} />}
        {activeView.type === 'document' && <SpaceDocumentView documentId={activeView.id} />}
        {activeView.type === 'videos' && <SpaceVideosView defaultTopic={space.title} />}
        {activeView.type === 'todo' && <SpaceTodoView spaceId={space.id} />}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <SkeletonList rows={4} />
      </div>
    );
  }

  const roadmap = contents?.roadmaps[0];
  const mindMap = contents?.mindMaps[0];
  const deck = contents?.flashcardDecks[0];
  const documents = contents?.documents ?? [];

  return (
    <div className="flex flex-col gap-3 p-4">
      {roadmap ? (
        <Card className="cursor-pointer transition-shadow hover:shadow-card" onClick={() => setActiveView({ type: 'roadmap', id: roadmap.id })}>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Map className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-ink-900">{roadmap.title}</p>
              </div>
              {roadmap.difficulty && <Badge variant="brand">{roadmap.difficulty}</Badge>}
            </div>
            <p className="text-xs text-ink-400">Roadmap · {roadmap.status}</p>
          </CardContent>
        </Card>
      ) : (
        <SourceEmptyCard
          icon={Map}
          title="Roadmap"
          description="Generate a structured, trackable study plan for this goal."
          actionLabel="Generate roadmap"
          onAction={() => onTriggerCommand('roadmap')}
        />
      )}

      {mindMap ? (
        <Card className="cursor-pointer transition-shadow hover:shadow-card" onClick={() => setActiveView({ type: 'mindmap', id: mindMap.id })}>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Share2 className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-ink-900">{mindMap.title}</p>
            </div>
            <p className="text-xs text-ink-400">Mind map</p>
          </CardContent>
        </Card>
      ) : (
        <SourceEmptyCard
          icon={Share2}
          title="Mind map"
          description="Break this topic into a visual hierarchy of ideas."
          actionLabel="Generate mind map"
          onAction={() => onTriggerCommand('mindmap')}
        />
      )}

      {deck ? (
        <Card className="cursor-pointer transition-shadow hover:shadow-card" onClick={() => setActiveView({ type: 'flashcards', id: deck.id })}>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Layers className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-ink-900">{deck.title}</p>
            </div>
            <p className="text-xs text-ink-400">Flashcard deck</p>
          </CardContent>
        </Card>
      ) : (
        <SourceEmptyCard
          icon={Layers}
          title="Flashcards"
          description="Generate a set of cards for active recall on this topic."
          actionLabel="Generate flashcards"
          onAction={() => onTriggerCommand('flashcards')}
        />
      )}

      {documents.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-2.5 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <FileText className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Documents</p>
            </div>
            <div className="flex flex-col gap-1.5">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setActiveView({ type: 'document', id: doc.id })}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-ink-50"
                >
                  <span className="truncate text-ink-800">{doc.title}</span>
                  <Badge variant={doc.status === 'ready' ? 'success' : doc.status === 'failed' ? 'danger' : 'warning'}>
                    {doc.status}
                  </Badge>
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              onClick={() => onTriggerCommand('pdf')}
              className="self-start"
            >
              Upload another PDF
            </Button>
          </CardContent>
        </Card>
      ) : (
        <SourceEmptyCard
          icon={FileText}
          title="PDF Intelligence"
          description="Upload a PDF to get a summary, key points, Q&A, and a quiz."
          actionLabel="Upload PDF"
          onAction={() => onTriggerCommand('pdf')}
        />
      )}

      <Card className="cursor-pointer transition-shadow hover:shadow-card" onClick={() => setActiveView({ type: 'videos' })}>
        <CardContent className="flex items-center gap-2.5 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <PlayCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900">Learning Videos</p>
            <p className="truncate text-xs text-ink-400">Find curated videos for "{space.title}"</p>
          </div>
        </CardContent>
      </Card>

      {tasks && tasks.length > 0 ? (
        <Card className="cursor-pointer transition-shadow hover:shadow-card" onClick={() => setActiveView({ type: 'todo' })}>
          <CardContent className="flex items-center gap-2.5 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <ListChecks className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">To-do List</p>
              <p className="truncate text-xs text-ink-400">
                {tasks.filter((t) => !t.is_completed).length} open task{tasks.filter((t) => !t.is_completed).length === 1 ? '' : 's'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <SourceEmptyCard
          icon={ListChecks}
          title="To-do List"
          description="Speak or type what you need to get done — I'll organize it by priority."
          actionLabel="Add tasks"
          onAction={() => onTriggerCommand('todo')}
        />
      )}
    </div>
  );
}
