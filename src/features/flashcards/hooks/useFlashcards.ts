import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as flashcardsService from '@/services/flashcards.service';
import type { Flashcard, ReviewRating } from '@/types/database';
import { notify } from '@/lib/toast';

export function useDecks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['flashcard-decks', user?.id],
    queryFn: () => flashcardsService.listDecks(user!.id),
    enabled: !!user,
  });
}

export function useDueCards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['due-flashcards', user?.id],
    queryFn: () => flashcardsService.listDueCards(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useAllCards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all-flashcards', user?.id],
    queryFn: () => flashcardsService.listAllCards(user!.id),
    enabled: !!user,
  });
}

export function useDeckCards(deckId: string | undefined) {
  return useQuery({
    queryKey: ['flashcards', deckId],
    queryFn: () => flashcardsService.listCardsForDeck(deckId!),
    enabled: !!deckId,
  });
}

export function useCreateDeck() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; description?: string; roadmapId?: string; documentId?: string; spaceId?: string }) =>
      flashcardsService.createDeck(user!.id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['flashcard-decks', user?.id] });
      if (variables.spaceId) queryClient.invalidateQueries({ queryKey: ['space-contents', variables.spaceId] });
      notify.success('Deck created');
    },
    onError: () => notify.error('Could not create deck'),
  });
}

export function useDeleteDeck() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deckId: string) => flashcardsService.deleteDeck(deckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcard-decks', user?.id] });
      notify.success('Deck deleted');
    },
    onError: () => notify.error('Could not delete deck'),
  });
}

export function useCreateCard(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ front, back }: { front: string; back: string }) =>
      flashcardsService.createCard(deckId, front, back),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards', deckId] });
      notify.success('Card added');
    },
    onError: () => notify.error('Could not add card'),
  });
}

export function useDeleteCard(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => flashcardsService.deleteCard(cardId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards', deckId] }),
    onError: () => notify.error('Could not delete card'),
  });
}

export function useReviewCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ card, rating }: { card: Flashcard; rating: ReviewRating }) =>
      flashcardsService.reviewCard(user!.id, card, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['due-flashcards', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-flashcards', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
    onError: () => notify.error('Could not save review'),
  });
}

export function useGenerateCardsFromTopic(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topic, count }: { topic: string; count?: number }) =>
      flashcardsService.generateCardsFromTopic(deckId, topic, count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards', deckId] });
      notify.success('Flashcards generated');
    },
    onError: () => notify.error('Could not generate flashcards'),
  });
}

export function useGenerateDeckFromTopic() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topic, count, spaceId }: { topic: string; count?: number; spaceId?: string }) =>
      flashcardsService.createDeckWithGeneratedCards(user!.id, topic, count, spaceId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['flashcard-decks', user?.id] });
      if (variables.spaceId) queryClient.invalidateQueries({ queryKey: ['space-contents', variables.spaceId] });
      notify.success('Flashcards generated');
    },
    onError: () => notify.error('Could not generate flashcards. Please try again.'),
  });
}
