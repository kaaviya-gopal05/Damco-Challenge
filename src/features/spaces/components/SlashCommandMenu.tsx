import { Map, Share2, Layers, FileText, PlayCircle, ListChecks } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type SlashCommandId = 'roadmap' | 'mindmap' | 'flashcards' | 'pdf' | 'videos' | 'todo';

export interface SlashCommand {
  id: SlashCommandId;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'roadmap', label: '/roadmap', description: 'Generate a study roadmap', icon: Map },
  { id: 'mindmap', label: '/mindmap', description: 'Generate a mind map', icon: Share2 },
  { id: 'flashcards', label: '/flashcards', description: 'Generate flashcards', icon: Layers },
  { id: 'pdf', label: '/pdf', description: 'Upload a PDF for AI insights', icon: FileText },
  { id: 'videos', label: '/videos', description: 'Find learning videos', icon: PlayCircle },
  { id: 'todo', label: '/todo', description: 'To-do Task List', icon: ListChecks },
];

export function SlashCommandMenu({ query, onSelect }: { query: string; onSelect: (id: SlashCommandId) => void }) {
  const filtered = SLASH_COMMANDS.filter((c) => c.id.startsWith(query.toLowerCase()));

  if (filtered.length === 0) {
    return (
      <div className="absolute bottom-full left-0 mb-2 w-full rounded-xl border border-ink-200 bg-white p-3 text-sm text-ink-400 shadow-popover">
        No matching command.
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 mb-2 flex max-w-full flex-wrap items-center gap-1.5 rounded-full border border-ink-200 bg-white p-1.5 shadow-popover">
      {filtered.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          <c.icon className="h-3.5 w-3.5" />
          {c.description}
        </button>
      ))}
    </div>
  );
}
