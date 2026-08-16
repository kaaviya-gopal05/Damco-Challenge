import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { AiMarkdown } from '@/components/markdown/AiMarkdown';
import { useTaskNotes } from '@/features/roadmaps/hooks/useRoadmaps';
import type { RoadmapTask } from '@/types/database';

export function TaskNotesPanel({
  roadmapId,
  roadmapTitle,
  phaseTitle,
  task,
  onClose,
}: {
  roadmapId: string;
  roadmapTitle: string;
  phaseTitle: string;
  task: RoadmapTask | null;
  onClose: () => void;
}) {
  const { data: notes, isLoading, isError } = useTaskNotes(roadmapId, roadmapTitle, phaseTitle, task);

  useEffect(() => {
    if (!task) return;
    document.body.style.overflow = 'hidden';
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [task, onClose]);

  if (!task) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-fade-in">
      <header className="flex shrink-0 items-center gap-4 border-b border-ink-100 px-4 py-4 sm:px-8">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-500 hover:bg-ink-100 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-ink-400">
            {roadmapTitle} · {phaseTitle}
          </p>
          <h1 className="truncate text-lg font-bold text-ink-900">{task.title}</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
          <div className="mb-6 flex items-center gap-1.5 text-xs font-medium text-brand-600">
            <Sparkles className="h-3.5 w-3.5" />
            AI-generated notes
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
              <p className="text-sm text-ink-400">Generating notes for this topic...</p>
            </div>
          )}

          {isError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
              Could not generate notes for this task. Please try again.
            </p>
          )}

          {!isLoading && !isError && notes && <AiMarkdown content={notes} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
