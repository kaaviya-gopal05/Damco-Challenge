import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Map,
  ListTodo,
  Layers,
  FileText,
  Share2,
  PlayCircle,
  MessageSquare,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useUiStore } from '@/lib/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { searchAll, type SearchResultKind } from '@/services/search.service';
import { cn } from '@/lib/utils';

const KIND_ICON: Record<SearchResultKind, LucideIcon> = {
  space: MessageSquare,
  roadmap: Map,
  task: ListTodo,
  flashcard_deck: Layers,
  document: FileText,
  mind_map: Share2,
  saved_video: PlayCircle,
};

const KIND_LABEL: Record<SearchResultKind, string> = {
  space: 'Space',
  roadmap: 'Roadmap',
  task: 'Task',
  flashcard_deck: 'Flashcard Deck',
  document: 'PDF Document',
  mind_map: 'Mind Map',
  saved_video: 'Saved Video',
};

export function CommandPalette() {
  const { isCommandPaletteOpen, closeCommandPalette, toggleCommandPalette } = useUiStore();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 250);
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === 'Escape') closeCommandPalette();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toggleCommandPalette, closeCommandPalette]);

  useEffect(() => {
    if (!isCommandPaletteOpen) setQuery('');
  }, [isCommandPaletteOpen]);

  const { data: results, isFetching } = useQuery({
    queryKey: ['global-search', user?.id, debouncedQuery],
    queryFn: () => searchAll(user!.id, debouncedQuery),
    enabled: !!user && isCommandPaletteOpen && debouncedQuery.trim().length >= 2,
  });

  if (!isCommandPaletteOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-24">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm animate-fade-in" onClick={closeCommandPalette} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-popover animate-scale-in">
        <div className="flex items-center gap-3 border-b border-ink-100 px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search roadmaps, flashcards, documents, mind maps, videos..."
            className="h-14 w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
          {isFetching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-300" />}
          <kbd className="hidden shrink-0 rounded-md border border-ink-200 px-1.5 py-0.5 text-[10px] font-medium text-ink-400 sm:block">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto scrollbar-thin p-2">
          {query.trim().length < 2 && (
            <p className="px-3 py-8 text-center text-sm text-ink-400">
              Type at least 2 characters to search across your workspace.
            </p>
          )}
          {query.trim().length >= 2 && !isFetching && (results?.length ?? 0) === 0 && (
            <p className="px-3 py-8 text-center text-sm text-ink-400">No results for "{query}".</p>
          )}
          {(results ?? []).map((result) => {
            const Icon = KIND_ICON[result.kind];
            return (
              <button
                key={`${result.kind}-${result.id}`}
                onClick={() => {
                  navigate(result.path);
                  closeCommandPalette();
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ink-50'
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink-900">{result.title}</span>
                  {result.subtitle && (
                    <span className="block truncate text-xs text-ink-400">{result.subtitle}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-ink-300">{KIND_LABEL[result.kind]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
