import { useState } from 'react';
import { Plus, Sparkles, PlayCircle, Layers } from 'lucide-react';
import { Button, EmptyState, SkeletonList } from '@/components/ui';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useDecks, useDeckCards, useDeleteCard } from '@/features/flashcards/hooks/useFlashcards';
import { CardListItem } from '@/features/flashcards/components/CardListItem';
import { AddCardModal } from '@/features/flashcards/components/AddCardModal';
import { GenerateCardsModal } from '@/features/flashcards/components/GenerateCardsModal';
import { StudySession } from '@/features/flashcards/components/StudySession';

export function SpaceFlashcardDeckView({ deckId }: { deckId: string }) {
  const { data: decks } = useDecks();
  const { data: cards, isLoading } = useDeckCards(deckId);
  const deleteCard = useDeleteCard(deckId);
  const addCardModal = useDisclosure();
  const generateModal = useDisclosure();
  const [isStudying, setIsStudying] = useState(false);

  const deck = decks?.find((d) => d.id === deckId);

  if (isStudying) {
    return <StudySession cards={cards ?? []} onExit={() => setIsStudying(false)} title={deck?.title ?? 'Studying'} />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">{deck?.title ?? 'Deck'}</h2>
          {deck?.description && <p className="mt-1 text-sm text-ink-500">{deck.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" leftIcon={<Sparkles className="h-4 w-4" />} onClick={generateModal.open}>
            Generate from topic
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={addCardModal.open}>
            Add card
          </Button>
          <Button size="sm" leftIcon={<PlayCircle className="h-4 w-4" />} onClick={() => setIsStudying(true)} disabled={(cards?.length ?? 0) === 0}>
            Study deck
          </Button>
        </div>
      </div>

      {isLoading && <SkeletonList rows={4} />}

      {!isLoading && (cards?.length ?? 0) === 0 && (
        <EmptyState
          icon={Layers}
          title="No cards in this deck yet"
          description="Add cards manually or generate a set from a topic."
          action={<Button onClick={addCardModal.open}>Add your first card</Button>}
        />
      )}

      {!isLoading && (cards?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-3">
          {cards!.map((card) => (
            <CardListItem key={card.id} card={card} onDelete={() => deleteCard.mutate(card.id)} />
          ))}
        </div>
      )}

      <AddCardModal deckId={deckId} isOpen={addCardModal.isOpen} onClose={addCardModal.close} />
      <GenerateCardsModal deckId={deckId} isOpen={generateModal.isOpen} onClose={generateModal.close} />
    </div>
  );
}
