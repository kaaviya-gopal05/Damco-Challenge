import type { Flashcard, FlashcardStatus, ReviewRating } from '@/types/database';

export interface SchedulingResult {
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  status: FlashcardStatus;
  nextReviewAt: string;
}

const RATING_QUALITY: Record<ReviewRating, number> = {
  again: 0,
  hard: 3,
  medium: 4,
  easy: 5,
};

/**
 * Simplified SM-2 spaced-repetition scheduler. A card starts "new", becomes "learning"
 * after its first successful review, and "mastered" once its interval passes 21 days.
 */
export function schedule(
  card: Pick<Flashcard, 'interval_days' | 'ease_factor' | 'repetitions'>,
  rating: ReviewRating
): SchedulingResult {
  const quality = RATING_QUALITY[rating];
  let { interval_days: intervalDays, ease_factor: easeFactor, repetitions } = card;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const status: FlashcardStatus = intervalDays >= 21 ? 'mastered' : repetitions > 0 ? 'learning' : 'new';

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

  return {
    intervalDays,
    easeFactor: Number(easeFactor.toFixed(2)),
    repetitions,
    status,
    nextReviewAt: nextReviewAt.toISOString(),
  };
}
