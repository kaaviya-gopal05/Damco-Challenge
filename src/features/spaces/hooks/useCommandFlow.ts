import { useState } from 'react';
import { useAddMessage } from '@/features/spaces/hooks/useSpaces';
import { useGenerateRoadmap } from '@/features/roadmaps/hooks/useRoadmaps';
import { useCreateMindMapFromAi } from '@/features/mindmaps/hooks/useMindMaps';
import { useGenerateDeckFromTopic } from '@/features/flashcards/hooks/useFlashcards';
import { extractTextFromPdf } from '@/lib/pdf';
import { notify } from '@/lib/toast';
import { isAffirmative, parseDeadline, parseHours, parseLevel } from '@/features/spaces/hooks/commandFlowParsing';
import type { Space, SpaceMessageMetadata, SpaceMessageRole } from '@/types/database';

// 'todo' is deliberately not a flow kind here: unlike roadmap/mindmap/flashcards, a task
// brain-dump needs no clarifying questions — the chat's AI intent classifier
// (spaces.service.ts's replyToMessage) detects and prioritizes it directly from whatever the
// learner types or speaks, the moment they hit send. See NewSpaceChatPage.tsx and
// SpaceDetailPage.tsx for how the "/todo" widget just focuses/hints the input instead of
// starting a flow.
export type FlowKind = 'roadmap' | 'mindmap' | 'flashcards';

interface FlowQuestion {
  key: string;
  prompt: string;
}

export interface FlowState {
  kind: FlowKind;
  step: number;
  answers: Record<string, string>;
  awaitingMaterial?: boolean;
}

const FLOW_QUESTIONS: Record<FlowKind, FlowQuestion[]> = {
  flashcards: [{ key: 'topic', prompt: 'What topic would you like flashcards on?' }],
  mindmap: [{ key: 'topic', prompt: 'What topic should the mind map be centered on?' }],
  roadmap: [
    { key: 'level', prompt: "What's your current level in this — beginner, intermediate, or advanced?" },
    { key: 'deadline', prompt: 'Do you have a deadline? Reply with a date like 2026-12-01, or say "no".' },
    { key: 'hours', prompt: 'How many hours can you study per day?' },
    { key: 'material', prompt: 'Do you have study material (a PDF) you\'d like this roadmap based on? Reply "yes" or "no".' },
  ],
};

export function useCommandFlow(space: Space) {
  const [flow, setFlow] = useState<FlowState | null>(null);
  // Tracked manually rather than via addMessage.isPending: a mutation kicked off from a
  // mount-time effect (the startFlow auto-trigger) can have its React Query observer torn
  // down and recreated by StrictMode's double-invoke, leaving isPending stuck true even
  // after the insert succeeds. Plain component state doesn't have that failure mode.
  const [isPosting, setIsPosting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const addMessage = useAddMessage(space);
  const generateDeck = useGenerateDeckFromTopic();
  const generateMindMap = useCreateMindMapFromAi();
  const generateRoadmap = useGenerateRoadmap();

  const isGenerating = generateDeck.isPending || generateMindMap.isPending || generateRoadmap.isPending;
  const isBusy = isPosting || isGenerating || isExtracting;

  async function postMessage(role: SpaceMessageRole, content: string, metadata?: SpaceMessageMetadata) {
    setIsPosting(true);
    try {
      await addMessage.mutateAsync({ role, content, metadata });
    } finally {
      setIsPosting(false);
    }
  }

  function start(kind: FlowKind) {
    const questions = FLOW_QUESTIONS[kind];
    setFlow({ kind, step: 0, answers: {} });
    postMessage('assistant', questions[0].prompt);
  }

  async function finishRoadmap(answers: Record<string, string>, materialText?: string) {
    try {
      const roadmap = await generateRoadmap.mutateAsync({
        goal: space.goal_text ?? space.title,
        spaceId: space.id,
        level: parseLevel(answers.level),
        deadline: parseDeadline(answers.deadline),
        hoursPerDay: parseHours(answers.hours),
        materialText,
      });
      await postMessage('assistant', `Generated a roadmap: "${roadmap.title}".`, {
        artifactType: 'roadmap',
        artifactId: roadmap.id,
        artifactTitle: roadmap.title,
      });
    } catch {
      await postMessage('assistant', "I couldn't generate that just now — please try again.");
    }
  }

  async function submitAnswer(text: string) {
    if (!flow) return;
    await postMessage('user', text);

    const questions = FLOW_QUESTIONS[flow.kind];
    const currentKey = questions[flow.step].key;
    const answers = { ...flow.answers, [currentKey]: text };
    const nextStep = flow.step + 1;

    if (currentKey === 'material') {
      if (isAffirmative(text)) {
        setFlow({ kind: flow.kind, step: nextStep, answers, awaitingMaterial: true });
        await postMessage('assistant', 'Upload your PDF below, or skip.');
      } else {
        setFlow(null);
        await finishRoadmap(answers);
      }
      return;
    }

    if (nextStep < questions.length) {
      setFlow({ kind: flow.kind, step: nextStep, answers });
      await postMessage('assistant', questions[nextStep].prompt);
      return;
    }

    setFlow(null);
    try {
      if (flow.kind === 'flashcards') {
        const deck = await generateDeck.mutateAsync({ topic: answers.topic, spaceId: space.id });
        await postMessage('assistant', `Generated a flashcard deck: "${deck.title}".`, {
          artifactType: 'flashcards',
          artifactId: deck.id,
          artifactTitle: deck.title,
        });
      } else if (flow.kind === 'mindmap') {
        const { mindMap } = await generateMindMap.mutateAsync({ topic: answers.topic, spaceId: space.id });
        await postMessage('assistant', `Generated a mind map: "${mindMap.title}".`, {
          artifactType: 'mindmap',
          artifactId: mindMap.id,
          artifactTitle: mindMap.title,
        });
      } else {
        await finishRoadmap(answers);
      }
    } catch {
      await postMessage('assistant', "I couldn't generate that just now — please try again.");
    }
  }

  async function uploadMaterial(file: File) {
    if (!flow) return;
    const answers = flow.answers;
    setIsExtracting(true);
    let materialText: string | undefined;
    try {
      if (file.type !== 'application/pdf') {
        notify.error('Please upload a PDF file.');
        return;
      }
      const { text } = await extractTextFromPdf(file);
      if (text.trim().length < 30) {
        notify.error('Could not read enough text from this PDF.');
        return;
      }
      materialText = text;
    } finally {
      setIsExtracting(false);
    }
    setFlow(null);
    await postMessage('user', `Uploaded: ${file.name}`);
    await finishRoadmap(answers, materialText);
  }

  async function skipMaterial() {
    if (!flow) return;
    const answers = flow.answers;
    setFlow(null);
    await postMessage('user', 'Skip');
    await finishRoadmap(answers);
  }

  return { flow, start, submitAnswer, uploadMaterial, skipMaterial, isBusy };
}
