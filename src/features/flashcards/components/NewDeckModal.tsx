import { useState } from 'react';
import { Sparkles, PenLine } from 'lucide-react';
import { Modal, Button, Input, Textarea } from '@/components/ui';
import { useCreateDeck, useGenerateDeckFromTopic } from '@/features/flashcards/hooks/useFlashcards';
import { cn } from '@/lib/utils';

type Mode = 'ai' | 'blank';

export interface NewDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId?: string;
  initialTopic?: string;
  onCreated?: (deckId: string) => void;
}

export function NewDeckModal({ isOpen, onClose, spaceId, initialTopic, onCreated }: NewDeckModalProps) {
  const [mode, setMode] = useState<Mode>('ai');
  const [title, setTitle] = useState(initialTopic ?? '');
  const [description, setDescription] = useState('');
  const createDeck = useCreateDeck();
  const generateDeck = useGenerateDeckFromTopic();

  const isPending = createDeck.isPending || generateDeck.isPending;

  async function handleCreate() {
    if (!title.trim()) return;
    let deckId: string;
    if (mode === 'ai') {
      const deck = await generateDeck.mutateAsync({ topic: title.trim(), spaceId });
      deckId = deck.id;
    } else {
      const deck = await createDeck.mutateAsync({ title: title.trim(), description: description.trim() || undefined, spaceId });
      deckId = deck.id;
    }
    setTitle('');
    setDescription('');
    onClose();
    onCreated?.(deckId);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New flashcard deck"
      description={mode === 'ai' ? "Give a topic and we'll generate a set of flashcards for it." : 'Start with an empty deck and add cards yourself.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            isLoading={isPending}
            disabled={!title.trim()}
            leftIcon={mode === 'ai' ? <Sparkles className="h-4 w-4" /> : undefined}
          >
            {mode === 'ai' ? 'Generate with AI' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-1 self-start rounded-xl bg-ink-100 p-1">
          <button
            onClick={() => setMode('ai')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              mode === 'ai' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-800'
            )}
          >
            <Sparkles className="h-3.5 w-3.5" /> Generate with AI
          </button>
          <button
            onClick={() => setMode('blank')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              mode === 'blank' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-800'
            )}
          >
            <PenLine className="h-3.5 w-3.5" /> Start blank
          </button>
        </div>

        <Input
          label={mode === 'ai' ? 'Topic' : 'Deck title'}
          placeholder={mode === 'ai' ? 'e.g. Binary search trees' : 'e.g. Python Fundamentals'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        {mode === 'blank' && (
          <Textarea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        )}
      </div>
    </Modal>
  );
}
