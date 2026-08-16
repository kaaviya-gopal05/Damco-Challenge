import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, PenLine } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';
import { useCreateMindMap, useCreateMindMapFromAi } from '@/features/mindmaps/hooks/useMindMaps';
import { cn } from '@/lib/utils';

type Mode = 'blank' | 'ai';

export interface NewMindMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId?: string;
  initialTopic?: string;
  onCreated?: (mindMapId: string) => void;
}

export function NewMindMapModal({ isOpen, onClose, spaceId, initialTopic, onCreated }: NewMindMapModalProps) {
  const [mode, setMode] = useState<Mode>('ai');
  const [title, setTitle] = useState(initialTopic ?? '');
  const createMindMap = useCreateMindMap();
  const createMindMapFromAi = useCreateMindMapFromAi();
  const navigate = useNavigate();

  const isPending = createMindMap.isPending || createMindMapFromAi.isPending;

  async function handleCreate() {
    if (!title.trim()) return;
    let mindMapId: string;
    if (mode === 'ai') {
      const mindMap = await createMindMapFromAi.mutateAsync({ topic: title.trim(), spaceId });
      mindMapId = mindMap.mindMap.id;
    } else {
      const { mindMap } = await createMindMap.mutateAsync({ title: title.trim(), spaceId });
      mindMapId = mindMap.id;
    }
    setTitle('');
    onClose();
    if (onCreated) onCreated(mindMapId);
    else navigate(`/app/mindmaps/${mindMapId}`);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New mind map"
      description={
        mode === 'ai'
          ? 'Enter a topic and AI will generate a starter set of branches for you to refine.'
          : "Give your central topic a name — you'll add branches on the canvas."
      }
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
          label="Central topic"
          placeholder="e.g. Machine Learning"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          autoFocus
        />
      </div>
    </Modal>
  );
}
