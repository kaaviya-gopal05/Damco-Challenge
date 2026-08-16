import { supabase } from '@/lib/supabase';
import { getAiService } from '@/services/ai.service';
import { logActivity } from '@/services/activity.service';
import { schedule } from '@/utils/spacedRepetition';
import type { Flashcard, FlashcardDeck, ReviewRating } from '@/types/database';

export async function listDecks(userId: string): Promise<FlashcardDeck[]> {
  const { data, error } = await supabase
    .from('flashcard_decks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FlashcardDeck[];
}

export async function createDeck(
  userId: string,
  input: { title: string; description?: string; roadmapId?: string; documentId?: string; spaceId?: string }
): Promise<FlashcardDeck> {
  const { data, error } = await supabase
    .from('flashcard_decks')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      roadmap_id: input.roadmapId ?? null,
      document_id: input.documentId ?? null,
      space_id: input.spaceId ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await logActivity({ userId, activityType: 'flashcard_deck_created', metadata: { deckId: data.id, title: input.title } });

  return data as FlashcardDeck;
}

export async function deleteDeck(deckId: string): Promise<void> {
  const { error } = await supabase.from('flashcard_decks').delete().eq('id', deckId);
  if (error) throw error;
}

export async function listCardsForDeck(deckId: string): Promise<Flashcard[]> {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Flashcard[];
}

export async function listAllCards(userId: string): Promise<Flashcard[]> {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*, flashcard_decks!inner(user_id)')
    .eq('flashcard_decks.user_id', userId);
  if (error) throw error;
  return (data ?? []) as Flashcard[];
}

export async function listDueCards(userId: string, limit = 50): Promise<Flashcard[]> {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*, flashcard_decks!inner(user_id)')
    .eq('flashcard_decks.user_id', userId)
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Flashcard[];
}

export async function createCard(deckId: string, front: string, back: string): Promise<Flashcard> {
  const { data, error } = await supabase
    .from('flashcards')
    .insert({ deck_id: deckId, front, back })
    .select()
    .single();
  if (error) throw error;
  return data as Flashcard;
}

export async function updateCard(cardId: string, updates: Partial<Pick<Flashcard, 'front' | 'back'>>): Promise<void> {
  const { error } = await supabase.from('flashcards').update(updates).eq('id', cardId);
  if (error) throw error;
}

export async function deleteCard(cardId: string): Promise<void> {
  const { error } = await supabase.from('flashcards').delete().eq('id', cardId);
  if (error) throw error;
}

export async function reviewCard(userId: string, card: Flashcard, rating: ReviewRating): Promise<Flashcard> {
  const result = schedule(card, rating);

  const { data, error } = await supabase
    .from('flashcards')
    .update({
      interval_days: result.intervalDays,
      ease_factor: result.easeFactor,
      repetitions: result.repetitions,
      status: result.status,
      last_reviewed_at: new Date().toISOString(),
      next_review_at: result.nextReviewAt,
    })
    .eq('id', card.id)
    .select()
    .single();
  if (error) throw error;

  const { error: reviewError } = await supabase.from('flashcard_reviews').insert({
    flashcard_id: card.id,
    user_id: userId,
    rating,
    previous_interval_days: card.interval_days,
    new_interval_days: result.intervalDays,
  });
  if (reviewError) throw reviewError;

  await logActivity({ userId, activityType: 'flashcard_reviewed', metadata: { cardId: card.id, rating } });

  return data as Flashcard;
}

export async function generateCardsFromTopic(deckId: string, topic: string, count = 8): Promise<Flashcard[]> {
  const ai = getAiService();
  const drafts = await ai.generateFlashcardsForTopic(topic, count);
  return insertDrafts(deckId, drafts.length > 0 ? drafts : [{ front: topic, back: `Review notes on ${topic}.` }]);
}

export async function createDeckWithGeneratedCards(
  userId: string,
  topic: string,
  count = 10,
  spaceId?: string
): Promise<FlashcardDeck> {
  const deck = await createDeck(userId, { title: topic, spaceId });
  await generateCardsFromTopic(deck.id, topic, count);
  return deck;
}

export async function generateCardsFromText(deckId: string, text: string, count = 10): Promise<Flashcard[]> {
  const ai = getAiService();
  const drafts = await ai.generateFlashcards(text, count);
  return insertDrafts(deckId, drafts);
}

async function insertDrafts(deckId: string, drafts: { front: string; back: string }[]): Promise<Flashcard[]> {
  if (drafts.length === 0) return [];
  const { data, error } = await supabase
    .from('flashcards')
    .insert(drafts.map((d) => ({ deck_id: deckId, front: d.front, back: d.back })))
    .select();
  if (error) throw error;
  return (data ?? []) as Flashcard[];
}
