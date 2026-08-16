import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';
import { useGenerateCardsFromTopic } from '@/features/flashcards/hooks/useFlashcards';

export function GenerateCardsModal({ deckId, isOpen, onClose }: { deckId: string; isOpen: boolean; onClose: () => void }) {
  const [topic, setTopic] = useState('');
  const generate = useGenerateCardsFromTopic(deckId);

  async function handleGenerate() {
    if (!topic.trim()) return;
    await generate.mutateAsync({ topic: topic.trim(), count: 8 });
    setTopic('');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate flashcards from a topic"
      description="We'll generate a set of flashcards covering the topic you describe."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={generate.isPending}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} isLoading={generate.isPending} disabled={!topic.trim()} leftIcon={<Sparkles className="h-4 w-4" />}>
            Generate
          </Button>
        </>
      }
    >
      <Input
        label="Topic"
        placeholder="e.g. Binary search trees"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        autoFocus
      />
    </Modal>
  );
}
