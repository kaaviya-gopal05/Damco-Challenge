import { useState } from 'react';
import { Plus, Trash2, Map } from 'lucide-react';
import { Badge, Button, Dialog, ProgressBar, SkeletonList, Tabs, TabList, Tab, TabPanel, EmptyState } from '@/components/ui';
import {
  useRoadmap,
  useSetTaskCompletion,
  useAddTask,
  useUpdateTask,
  useDeleteTask,
  useAddPhase,
  useDeleteRoadmap,
} from '@/features/roadmaps/hooks/useRoadmaps';
import { roadmapProgress } from '@/services/roadmaps.service';
import { computeRoadmapSchedule } from '@/utils/roadmapSchedule';
import { PhaseCard } from '@/features/roadmaps/components/PhaseCard';
import { RoadmapTimeline } from '@/features/roadmaps/components/RoadmapTimeline';
import { EditTaskModal } from '@/features/roadmaps/components/EditTaskModal';
import { AddPhaseModal } from '@/features/roadmaps/components/AddPhaseModal';
import { TaskNotesPanel } from '@/features/roadmaps/components/TaskNotesPanel';
import { useDisclosure } from '@/hooks/useDisclosure';
import type { RoadmapTask } from '@/types/database';

export function SpaceRoadmapView({ roadmapId, onDeleted }: { roadmapId: string; onDeleted: () => void }) {
  const { data: roadmap, isLoading } = useRoadmap(roadmapId);
  const setTaskCompletion = useSetTaskCompletion(roadmapId);
  const addTask = useAddTask(roadmapId);
  const updateTask = useUpdateTask(roadmapId);
  const deleteTask = useDeleteTask(roadmapId);
  const addPhase = useAddPhase(roadmapId);
  const deleteRoadmap = useDeleteRoadmap();

  const addPhaseModal = useDisclosure();
  const deleteDialog = useDisclosure();
  const [editingTask, setEditingTask] = useState<RoadmapTask | null>(null);
  const [notesTask, setNotesTask] = useState<{ task: RoadmapTask; phaseTitle: string } | null>(null);

  if (isLoading) return <SkeletonList rows={4} />;
  if (!roadmap) return <EmptyState icon={Map} title="Roadmap not found" description="It may have been deleted." />;

  const progress = roadmapProgress(roadmap);
  const schedule = computeRoadmapSchedule(roadmap);

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">{roadmap.title}</h2>
          {roadmap.description && <p className="mt-1 text-sm text-ink-500">{roadmap.description}</p>}
        </div>
        <Button variant="outline" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={deleteDialog.open}>
          Delete
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {roadmap.difficulty && <Badge variant="brand">{roadmap.difficulty}</Badge>}
        {roadmap.estimated_duration_weeks && <Badge variant="neutral">~{roadmap.estimated_duration_weeks} weeks</Badge>}
        <Badge variant={roadmap.status === 'active' ? 'success' : 'neutral'}>{roadmap.status}</Badge>
      </div>

      <div className="mb-6 max-w-md">
        <ProgressBar value={progress} showLabel />
      </div>

      <Tabs defaultValue="list">
        <TabList>
          <Tab value="list">List view</Tab>
          <Tab value="timeline">Timeline</Tab>
        </TabList>

        <TabPanel value="list">
          <div className="mt-4 flex flex-col gap-4">
            {roadmap.phases.map((phase, index) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                index={index}
                phaseSchedule={schedule.phases.get(phase.id)}
                taskSchedules={schedule.tasks}
                onToggleTask={(taskId, isCompleted) => setTaskCompletion.mutate({ taskId, isCompleted })}
                onEditTask={(task) => setEditingTask(task)}
                onDeleteTask={(taskId) => deleteTask.mutate(taskId)}
                onAddTask={(title) => addTask.mutate({ phaseId: phase.id, title, orderIndex: phase.tasks.length })}
                onOpenTaskNotes={(task) => setNotesTask({ task, phaseTitle: phase.title })}
              />
            ))}
            <Button
              variant="outline"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={addPhaseModal.open}
              className="self-start"
            >
              Add phase
            </Button>
          </div>
        </TabPanel>

        <TabPanel value="timeline">
          <div className="mt-6">
            <RoadmapTimeline phases={roadmap.phases} schedule={schedule} />
          </div>
        </TabPanel>
      </Tabs>

      <EditTaskModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        isSaving={updateTask.isPending}
        onSave={async (updates) => {
          if (editingTask) {
            await updateTask.mutateAsync({ taskId: editingTask.id, ...updates });
            setEditingTask(null);
          }
        }}
      />

      <AddPhaseModal
        isOpen={addPhaseModal.isOpen}
        onClose={addPhaseModal.close}
        isSaving={addPhase.isPending}
        onAdd={async (input) => {
          await addPhase.mutateAsync({ ...input, orderIndex: roadmap.phases.length });
          addPhaseModal.close();
        }}
      />

      <TaskNotesPanel
        roadmapId={roadmapId}
        roadmapTitle={roadmap.title}
        phaseTitle={notesTask?.phaseTitle ?? ''}
        task={notesTask?.task ?? null}
        onClose={() => setNotesTask(null)}
      />

      <Dialog
        isOpen={deleteDialog.isOpen}
        onClose={deleteDialog.close}
        onConfirm={async () => {
          await deleteRoadmap.mutateAsync(roadmapId);
          deleteDialog.close();
          onDeleted();
        }}
        title="Delete this roadmap?"
        description="This will permanently delete all phases and tasks in this roadmap."
        confirmLabel="Delete"
        isDestructive
        isLoading={deleteRoadmap.isPending}
      />
    </div>
  );
}
