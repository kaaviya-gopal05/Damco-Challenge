import { useState } from 'react';
import { X, PartyPopper } from 'lucide-react';
import { Button, ProgressBar } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useReviewCard } from '@/features/flashcards/hooks/useFlashcards';
import type { Flashcard, ReviewRating } from '@/types/database';

const RATING_BUTTONS: { rating: ReviewRating; label: string; className: string }[] = [
  { rating: 'again', label: 'Again', className: 'bg-rose-50 text-rose-700 hover:bg-rose-100' },
  { rating: 'hard', label: 'Hard', className: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
  { rating: 'medium', label: 'Medium', className: 'bg-brand-50 text-brand-700 hover:bg-brand-100' },
  { rating: 'easy', label: 'Easy', className: 'bg-accent-50 text-accent-700 hover:bg-accent-100' },
];

export function StudySession({ cards, onExit, title }: { cards: Flashcard[]; onExit: () => void; title: string }) {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const reviewCard = useReviewCard();

  const currentCard = cards[index];
  const isComplete = index >= cards.length || cards.length === 0;

  function handleRate(rating: ReviewRating) {
    if (!currentCard) return;
    reviewCard.mutate({ card: currentCard, rating });
    setReviewedCount((c) => c + 1);
    setIsFlipped(false);
    setIndex((i) => i + 1);
  }

  if (isComplete) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-100 text-accent-600">
          <PartyPopper className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-ink-900">Session complete</h2>
        <p className="mt-1 text-sm text-ink-500">You reviewed {reviewedCount} card{reviewedCount === 1 ? '' : 's'}.</p>
        <Button className="mt-6" onClick={onExit}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
          <p className="text-sm text-ink-500">
            Card {index + 1} of {cards.length}
          </p>
        </div>
        <button onClick={onExit} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100" aria-label="Exit study session">
          <X className="h-5 w-5" />
        </button>
      </div>

      <ProgressBar value={index} max={cards.length} className="mb-8" />

      <div className="mx-auto max-w-xl [perspective:1200px]">
        <button
          onClick={() => setIsFlipped((f) => !f)}
          className={cn(
            'relative flex h-72 w-full items-center justify-center rounded-2xl border border-ink-200 bg-white p-8 text-center shadow-card transition-transform duration-500 [transform-style:preserve-3d]',
            isFlipped && '[transform:rotateY(180deg)]'
          )}
        >
          <div className="absolute inset-0 flex items-center justify-center p-8 [backface-visibility:hidden]">
            <p className="text-lg font-medium text-ink-900">{currentCard.front}</p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-brand-50 p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-lg font-medium text-brand-800">{currentCard.back}</p>
          </div>
        </button>
        <p className="mt-3 text-center text-xs text-ink-400">
          {isFlipped ? 'Click the card to see the question again' : 'Click the card to reveal the answer'}
        </p>
      </div>

      {isFlipped && (
        <div className="mx-auto mt-6 grid max-w-xl grid-cols-4 gap-2">
          {RATING_BUTTONS.map((btn) => (
            <button
              key={btn.rating}
              onClick={() => handleRate(btn.rating)}
              className={cn('rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors', btn.className)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
