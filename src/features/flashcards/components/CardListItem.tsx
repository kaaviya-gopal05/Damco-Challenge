import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { Flashcard } from '@/types/database';

const STATUS_VARIANT = { new: 'neutral', learning: 'warning', mastered: 'accent' } as const;

export function CardListItem({ card, onDelete }: { card: Flashcard; onDelete: () => void }) {
  return (
    <div className="group flex items-start gap-4 rounded-xl border border-ink-100 p-4 transition-colors hover:bg-ink-50">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-900">{card.front}</p>
        <p className="mt-1 text-sm text-ink-500">{card.back}</p>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[card.status]}>{card.status}</Badge>
          <span className="text-xs text-ink-400">
            Next review: {new Date(card.next_review_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      <button
        onClick={onDelete}
        className="shrink-0 rounded-lg p-1.5 text-ink-300 opacity-0 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
        aria-label="Delete card"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
