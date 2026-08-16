import { useState } from 'react';
import { Modal, Button, Textarea } from '@/components/ui';
import { useCreateCard } from '@/features/flashcards/hooks/useFlashcards';

export function AddCardModal({ deckId, isOpen, onClose }: { deckId: string; isOpen: boolean; onClose: () => void }) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const createCard = useCreateCard(deckId);

  async function handleCreate() {
    if (!front.trim() || !back.trim()) return;
    await createCard.mutateAsync({ front: front.trim(), back: back.trim() });
    setFront('');
    setBack('');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add flashcard"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} isLoading={createCard.isPending} disabled={!front.trim() || !back.trim()}>
            Add card
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Textarea label="Front (question)" value={front} onChange={(e) => setFront(e.target.value)} autoFocus />
        <Textarea label="Back (answer)" value={back} onChange={(e) => setBack(e.target.value)} />
      </div>
    </Modal>
  );
}
