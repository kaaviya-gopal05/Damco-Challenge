import { describe, expect, it } from 'vitest';
import { schedule } from '@/utils/spacedRepetition';

const NEW_CARD = { interval_days: 0, ease_factor: 2.5, repetitions: 0 };

describe('schedule', () => {
  it('resets repetitions and sets a 1-day interval on "again"', () => {
    const card = { interval_days: 10, ease_factor: 2.5, repetitions: 3 };
    const result = schedule(card, 'again');
    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
    expect(result.status).toBe('new');
  });

  it('schedules a brand-new card to 1 day on its first successful review', () => {
    const result = schedule(NEW_CARD, 'medium');
    expect(result.repetitions).toBe(1);
    expect(result.intervalDays).toBe(1);
    expect(result.status).toBe('learning');
  });

  it('schedules the second successful review to 6 days', () => {
    const afterFirst = schedule(NEW_CARD, 'medium');
    const afterSecond = schedule(
      { interval_days: afterFirst.intervalDays, ease_factor: afterFirst.easeFactor, repetitions: afterFirst.repetitions },
      'medium'
    );
    expect(afterSecond.repetitions).toBe(2);
    expect(afterSecond.intervalDays).toBe(6);
  });

  it('grows the interval by the ease factor from the third review onward', () => {
    const card = { interval_days: 6, ease_factor: 2.5, repetitions: 2 };
    const result = schedule(card, 'easy');
    expect(result.repetitions).toBe(3);
    expect(result.intervalDays).toBe(Math.round(6 * 2.5));
  });

  it('never lets the ease factor drop below 1.3, even after repeated "again" ratings', () => {
    let card = { interval_days: 1, ease_factor: 1.3, repetitions: 0 };
    for (let i = 0; i < 5; i++) {
      const result = schedule(card, 'again');
      card = { interval_days: result.intervalDays, ease_factor: result.easeFactor, repetitions: result.repetitions };
    }
    expect(card.ease_factor).toBeGreaterThanOrEqual(1.3);
  });

  it('marks a card mastered once its interval reaches 21 days', () => {
    const card = { interval_days: 10, ease_factor: 2.5, repetitions: 3 };
    const result = schedule(card, 'easy');
    expect(result.intervalDays).toBeGreaterThanOrEqual(21);
    expect(result.status).toBe('mastered');
  });

  it('sets nextReviewAt to a date intervalDays in the future', () => {
    const before = Date.now();
    const result = schedule(NEW_CARD, 'medium');
    const next = new Date(result.nextReviewAt).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    expect(next).toBeGreaterThanOrEqual(before + oneDayMs - 5000);
  });
});
