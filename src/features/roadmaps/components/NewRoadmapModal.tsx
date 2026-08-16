import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, Upload, FileText, X } from 'lucide-react';
import { Modal, Button, Textarea, Select, Input } from '@/components/ui';
import { useGenerateRoadmap } from '@/features/roadmaps/hooks/useRoadmaps';
import { extractTextFromPdf } from '@/lib/pdf';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { Difficulty } from '@/types/database';

const EXAMPLES = ['Become a Data Scientist', 'Learn React in 30 days', 'Prepare for a Machine Learning interview'];

const LEVEL_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'beginner', label: "Beginner — I'm new to this" },
  { value: 'intermediate', label: 'Intermediate — I know the basics' },
  { value: 'advanced', label: 'Advanced — I want to go deep' },
];

const HOURS_PER_DAY_PRESETS = [2, 3, 5];

type Step = 'goal' | 'questions';
type GoalMode = 'goal' | 'material';

export interface NewRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGoal?: string;
  goalId?: string;
  spaceId?: string;
  initialLevel?: Difficulty;
  initialDeadline?: string;
  initialHoursPerDay?: number;
  onCreated?: (roadmapId: string) => void;
}

export function NewRoadmapModal({
  isOpen,
  onClose,
  initialGoal,
  goalId,
  spaceId,
  initialLevel,
  initialDeadline,
  initialHoursPerDay,
  onCreated,
}: NewRoadmapModalProps) {
  const [step, setStep] = useState<Step>('goal');
  const [goalMode, setGoalMode] = useState<GoalMode>('goal');
  const [goal, setGoal] = useState(initialGoal ?? '');
  const [materialText, setMaterialText] = useState('');
  const [materialFileName, setMaterialFileName] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [level, setLevel] = useState<Difficulty>(initialLevel ?? 'beginner');
  const [hasDeadline, setHasDeadline] = useState(!!initialDeadline);
  const [deadline, setDeadline] = useState(initialDeadline ?? '');
  const [hoursPerDay, setHoursPerDay] = useState<number>(initialHoursPerDay ?? 2);
  const [customHours, setCustomHours] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateRoadmap = useGenerateRoadmap();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setGoal(initialGoal ?? '');
      setStep('goal');
      setGoalMode('goal');
      setMaterialText('');
      setMaterialFileName('');
      setLevel(initialLevel ?? 'beginner');
      setHasDeadline(!!initialDeadline);
      setDeadline(initialDeadline ?? '');
      setHoursPerDay(initialHoursPerDay ?? 2);
      setCustomHours('');
    }
  }, [isOpen, initialGoal, initialLevel, initialDeadline, initialHoursPerDay]);

  async function handleMaterialFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      notify.error('Please upload a PDF file.');
      return;
    }
    setIsExtracting(true);
    try {
      const { text } = await extractTextFromPdf(file);
      if (text.trim().length < 30) {
        notify.error('Could not read enough text from this PDF.');
        return;
      }
      setMaterialText(text);
      setMaterialFileName(file.name);
    } finally {
      setIsExtracting(false);
    }
  }

  const canProceedFromGoal = goalMode === 'goal' ? !!goal.trim() : !!materialText;

  async function handleGenerate() {
    const roadmap = await generateRoadmap.mutateAsync({
      goal: goalMode === 'material' ? goal.trim() || `Study material: ${materialFileName}` : goal.trim(),
      goalId,
      spaceId,
      level,
      deadline: hasDeadline && deadline ? deadline : undefined,
      hoursPerDay,
      materialText: goalMode === 'material' ? materialText : undefined,
    });
    onClose();
    if (onCreated) onCreated(roadmap.id);
    else navigate(`/app/roadmaps/${roadmap.id}`);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'goal' ? 'Generate a roadmap' : 'A couple of quick questions'}
      description={
        step === 'goal'
          ? "Describe your learning goal, or upload material to build a roadmap from — we'll structure it into phases, topics, and tasks."
          : 'This helps us tailor the difficulty and pace of your roadmap.'
      }
      footer={
        step === 'goal' ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => setStep('questions')} disabled={!canProceedFromGoal}>
              Next
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setStep('goal')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
            <Button
              onClick={handleGenerate}
              isLoading={generateRoadmap.isPending}
              leftIcon={<Sparkles className="h-4 w-4" />}
            >
              Generate roadmap
            </Button>
          </>
        )
      }
    >
      {step === 'goal' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setGoalMode('goal')}
              className={cn(
                'flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                goalMode === 'goal' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500 hover:bg-ink-50'
              )}
            >
              Describe a goal
            </button>
            <button
              type="button"
              onClick={() => setGoalMode('material')}
              className={cn(
                'flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                goalMode === 'material' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500 hover:bg-ink-50'
              )}
            >
              Upload material
            </button>
          </div>

          {goalMode === 'goal' ? (
            <>
              <Textarea
                label="Your goal"
                placeholder="e.g. Become a Data Scientist"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    onClick={() => setGoal(example)}
                    className="rounded-full border border-ink-200 px-3 py-1 text-xs font-medium text-ink-500 hover:border-brand-300 hover:text-brand-600"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleMaterialFile} />
              {materialFileName ? (
                <div className="flex items-center gap-3 rounded-xl border border-ink-200 px-3 py-3">
                  <FileText className="h-5 w-5 shrink-0 text-brand-600" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-800">{materialFileName}</span>
                  <button
                    onClick={() => {
                      setMaterialFileName('');
                      setMaterialText('');
                    }}
                    className="shrink-0 rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  isLoading={isExtracting}
                  leftIcon={!isExtracting ? <Upload className="h-4 w-4" /> : undefined}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload a PDF
                </Button>
              )}
              <Textarea
                label="What should this roadmap focus on? (optional)"
                placeholder="e.g. Focus on chapters 3-5 and the practice problems"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>
      )}

      {step === 'questions' && (
        <div className="flex flex-col gap-5">
          <Select
            label="What's your level in this topic?"
            value={level}
            onChange={(e) => setLevel(e.target.value as Difficulty)}
            options={LEVEL_OPTIONS}
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink-700">Is there a particular deadline?</span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={hasDeadline ? 'outline' : 'primary'}
                onClick={() => setHasDeadline(false)}
              >
                No deadline
              </Button>
              <Button
                type="button"
                size="sm"
                variant={hasDeadline ? 'primary' : 'outline'}
                onClick={() => setHasDeadline(true)}
              >
                Yes, by a date
              </Button>
            </div>
            {hasDeadline && (
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink-700">How many hours can you study per day?</span>
            <div className="flex flex-wrap gap-2">
              {HOURS_PER_DAY_PRESETS.map((h) => (
                <Button
                  key={h}
                  type="button"
                  size="sm"
                  variant={hoursPerDay === h && !customHours ? 'primary' : 'outline'}
                  onClick={() => {
                    setHoursPerDay(h);
                    setCustomHours('');
                  }}
                >
                  {h}h / day
                </Button>
              ))}
              <Input
                type="number"
                min={1}
                max={16}
                step={0.5}
                placeholder="Custom"
                value={customHours}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomHours(value);
                  const parsed = Number(value);
                  if (value && parsed > 0) setHoursPerDay(parsed);
                }}
                className="w-24"
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
