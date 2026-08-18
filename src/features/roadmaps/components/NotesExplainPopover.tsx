import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BookOpen, Loader2, X } from 'lucide-react';
import { getAiService } from '@/services/ai.service';
import { classifySelection } from '@/utils/textSelection';
import type { SelectionExplanation } from '@/services/ai/types';

const POPOVER_WIDTH = 320;

interface PopoverState {
  top: number;
  left: number;
  isLoading: boolean;
  error: boolean;
  result: SelectionExplanation | null;
}

function isShortcut(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e';
}

/**
 * Wraps AI-generated roadmap task notes with a "select text, press Cmd/Ctrl+E" flow:
 * a single word gets a definition + usage example, a short passage (up to 4 sentences)
 * gets a simplified explanation, and anything longer is silently ignored.
 */
export function NotesExplainPopover({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isShortcut(e)) return;

      const selection = window.getSelection();
      const selectedText = selection?.toString() ?? '';
      const anchorNode = selection?.anchorNode ?? null;
      if (!selectedText || !containerRef.current || !anchorNode || !containerRef.current.contains(anchorNode)) {
        return;
      }

      const { mode, text } = classifySelection(selectedText);
      if (mode === 'none' || !selection) return;

      e.preventDefault();
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - POPOVER_WIDTH - 8);
      setPopover({ top: rect.bottom + 8, left, isLoading: true, error: false, result: null });

      getAiService()
        .explainSelection(text)
        .then((result) => setPopover((prev) => (prev ? { ...prev, isLoading: false, result } : prev)))
        .catch(() => setPopover((prev) => (prev ? { ...prev, isLoading: false, error: true } : prev)));
    }

    function handlePointerDown(e: PointerEvent) {
      const popoverEl = document.getElementById('notes-explain-popover');
      if (popoverEl && !popoverEl.contains(e.target as Node)) setPopover(null);
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setPopover(null);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {children}

      {popover && (
        <div
          id="notes-explain-popover"
          style={{ position: 'fixed', top: popover.top, left: popover.left, width: POPOVER_WIDTH }}
          className="z-[60] rounded-xl border border-ink-200 bg-white p-3.5 shadow-popover animate-fade-in"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-brand-600">
              <BookOpen className="h-3.5 w-3.5" /> AI Explain
            </span>
            <button
              onClick={() => setPopover(null)}
              className="flex h-5 w-5 items-center justify-center rounded-md text-ink-400 hover:bg-ink-100"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {popover.isLoading && (
            <div className="flex items-center gap-2 py-2 text-sm text-ink-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Explaining...
            </div>
          )}

          {popover.error && <p className="text-sm text-rose-600">Could not explain this right now.</p>}

          {popover.result && (
            <div>
              <p className="text-sm font-semibold capitalize text-ink-900">{popover.result.term}</p>
              <p className="mt-1 text-sm text-ink-700">{popover.result.explanation}</p>
              {popover.result.example && <p className="mt-1.5 text-xs italic text-ink-500">{popover.result.example}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
