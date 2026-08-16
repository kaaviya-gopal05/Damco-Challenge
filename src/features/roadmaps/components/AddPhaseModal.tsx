import { useState } from 'react';
import { Modal, Button, Input, Textarea } from '@/components/ui';

export function AddPhaseModal({
  isOpen,
  onClose,
  onAdd,
  isSaving,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (input: { title: string; description?: string }) => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  function handleAdd() {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), description: description.trim() || undefined });
    setTitle('');
    setDescription('');
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add a phase"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} isLoading={isSaving} disabled={!title.trim()}>
            Add phase
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Phase title" placeholder="e.g. Advanced Topics" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <Textarea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
    </Modal>
  );
}
