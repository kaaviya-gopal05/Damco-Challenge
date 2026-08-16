import { useEffect, useState } from 'react';
import { Modal, Button, Input, Textarea } from '@/components/ui';
import type { RoadmapTask } from '@/types/database';

export function EditTaskModal({
  task,
  onClose,
  onSave,
  isSaving,
}: {
  task: RoadmapTask | null;
  onClose: () => void;
  onSave: (updates: { title: string; description?: string }) => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
    }
  }, [task]);

  return (
    <Modal
      isOpen={!!task}
      onClose={onClose}
      title="Edit task"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave({ title: title.trim(), description: description.trim() || undefined })}
            isLoading={isSaving}
            disabled={!title.trim()}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
    </Modal>
  );
}
