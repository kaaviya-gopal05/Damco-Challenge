import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MessageSquare, X, GripVertical } from 'lucide-react';
import { EmptyState, SkeletonList } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useSpace } from '@/features/spaces/hooks/useSpaces';
import { useCommandFlow, type FlowKind } from '@/features/spaces/hooks/useCommandFlow';
import { useUploadDocument } from '@/features/documents/hooks/useDocuments';
import { SpaceChatPanel } from '@/features/spaces/components/SpaceChatPanel';
import { SpaceArtifactPanel } from '@/features/spaces/components/SpaceArtifactPanel';
import type { ActiveView } from '@/features/spaces/types';
import type { SlashCommandId } from '@/features/spaces/components/SlashCommandMenu';
import type { Space } from '@/types/database';

const FLOW_KINDS: FlowKind[] = ['roadmap', 'mindmap', 'flashcards'];
const OVERVIEW_CHAT_WIDTH = 70;
const DETAIL_CHAT_WIDTH = 50;
const MIN_CHAT_WIDTH = 25;
const MAX_CHAT_WIDTH = 80;

function parseOpenParam(open: string | null): ActiveView | null {
  if (!open) return null;
  if (open === 'videos') return { type: open };
  const [type, id] = open.split(':');
  if (id && ['roadmap', 'mindmap', 'flashcards', 'document'].includes(type)) {
    return { type, id } as ActiveView;
  }
  return null;
}

function SpaceDetailContent({ space, spaceId }: { space: Space; spaceId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const uploadDocument = useUploadDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeView, setActiveView] = useState<ActiveView>({ type: 'overview' });
  const [panelOpen, setPanelOpen] = useState(true);
  const [chatWidthPercent, setChatWidthPercent] = useState(OVERVIEW_CHAT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const commandFlow = useCommandFlow(space);
  const startedFlowRef = useRef<string | null>(null);

  const isDetailView = activeView.type !== 'overview';

  function openView(view: ActiveView) {
    setActiveView(view);
    setPanelOpen(true);
    setChatWidthPercent(view.type === 'overview' ? OVERVIEW_CHAT_WIDTH : DETAIL_CHAT_WIDTH);
  }

  useEffect(() => {
    const parsed = parseOpenParam(searchParams.get('open'));
    if (parsed) openView(parsed);
    const startFlow = searchParams.get('startFlow');
    if (startFlow && FLOW_KINDS.includes(startFlow as FlowKind) && startedFlowRef.current !== spaceId) {
      startedFlowRef.current = spaceId;
      commandFlow.start(startFlow as FlowKind);
      // Consume the param immediately so a remount (StrictMode's double-invoke, browser
      // back/forward, etc.) can't see it again and re-trigger the question flow after
      // generation has already finished.
      setSearchParams(
        (params) => {
          params.delete('startFlow');
          return params;
        },
        { replace: true }
      );
    }
    // Only apply on first load of a given space, not on every param change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  useEffect(() => {
    if (!isDragging) return;
    function handlePointerMove(e: PointerEvent) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      setChatWidthPercent(Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, percent)));
    }
    function handlePointerUp() {
      setIsDragging(false);
    }
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  function handleTriggerCommand(id: SlashCommandId) {
    switch (id) {
      case 'roadmap':
      case 'mindmap':
      case 'flashcards':
        commandFlow.start(id);
        break;
      case 'pdf':
        fileInputRef.current?.click();
        break;
      case 'videos':
        openView({ type: 'videos' });
        break;
    }
  }

  function handlePdfFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    uploadDocument.mutate(
      { file, spaceId },
      {
        onSuccess: ({ document }) => openView({ type: 'document', id: document.id }),
      }
    );
  }

  const showDivider = panelOpen && isDetailView;

  return (
    <div ref={containerRef} className="flex h-full animate-fade-in">
      <div
        style={{ width: panelOpen ? `${chatWidthPercent}%` : '100%' }}
        className="flex min-w-0 flex-col bg-white"
      >
        <SpaceChatPanel
          space={space}
          onTriggerCommand={handleTriggerCommand}
          onOpenArtifact={openView}
          flow={commandFlow.flow}
          onSubmitFlowAnswer={commandFlow.submitAnswer}
          onUploadMaterial={commandFlow.uploadMaterial}
          onSkipMaterial={commandFlow.skipMaterial}
          isFlowBusy={commandFlow.isBusy}
        />
      </div>

      {showDivider && (
        <div
          onPointerDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          className={cn(
            'group relative w-1.5 shrink-0 cursor-col-resize bg-ink-100 transition-colors hover:bg-brand-300',
            isDragging && 'bg-brand-400'
          )}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
        >
          <div className="absolute left-1/2 top-1/2 flex h-9 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-soft ring-1 ring-ink-200 transition-colors group-hover:ring-brand-300">
            <GripVertical className="h-3.5 w-3.5 text-ink-400" />
          </div>
        </div>
      )}

      {panelOpen && (
        <div
          style={{ width: `${100 - chatWidthPercent}%` }}
          className="relative min-w-0 overflow-y-auto scrollbar-thin border-l border-ink-200/70 bg-ink-50"
        >
          <button
            onClick={() => setPanelOpen(false)}
            className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink-500 shadow-soft transition-colors hover:bg-ink-100 hover:text-ink-800"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
          <SpaceArtifactPanel
            space={space}
            activeView={activeView}
            setActiveView={openView}
            onTriggerCommand={handleTriggerCommand}
          />
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfFileChange} />
    </div>
  );
}

export function SpaceDetailPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { data: space, isLoading } = useSpace(spaceId);

  if (isLoading) {
    return (
      <div className="p-6">
        <SkeletonList rows={4} />
      </div>
    );
  }
  if (!space || !spaceId) {
    return (
      <div className="p-6">
        <EmptyState icon={MessageSquare} title="Space not found" description="It may have been deleted." />
      </div>
    );
  }

  return <SpaceDetailContent space={space} spaceId={spaceId} />;
}
