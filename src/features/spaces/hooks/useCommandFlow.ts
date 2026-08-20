import { useState } from 'react';
import { useAddMessage, useUpdateSpaceTitle } from '@/features/spaces/hooks/useSpaces';
import { useGenerateRoadmap } from '@/features/roadmaps/hooks/useRoadmaps';
import { useCreateMindMapFromAi } from '@/features/mindmaps/hooks/useMindMaps';
import { useGenerateDeckFromTopic } from '@/features/flashcards/hooks/useFlashcards';
import { useCreateResumeDocument, useGenerateCareerProfile } from '@/features/career/hooks/useCareer';
import { extractTextFromPdf } from '@/lib/pdf';
import { notify } from '@/lib/toast';
import { isAffirmative, isValidRoleAnswer, parseDeadline, parseHours, parseLevel } from '@/features/spaces/hooks/commandFlowParsing';
import type { Space, SpaceMessageMetadata, SpaceMessageRole } from '@/types/database';

// 'todo' is deliberately not a flow kind here: unlike roadmap/mindmap/flashcards/career, a task
// brain-dump needs no clarifying questions — the chat's AI intent classifier
// (spaces.service.ts's replyToMessage) detects and prioritizes it directly from whatever the
// learner types or speaks, the moment they hit send. See NewSpaceChatPage.tsx and
// SpaceDetailPage.tsx for how the "/todo" widget just focuses/hints the input instead of
// starting a flow.
export type FlowKind = 'roadmap' | 'mindmap' | 'flashcards' | 'career';

interface FlowQuestion {
  key: string;
  prompt: string;
}

export interface FlowState {
  kind: FlowKind;
  step: number;
  answers: Record<string, string>;
  awaitingMaterial?: boolean;
  /** True only for career's resume step — unlike roadmap's optional study material, a resume
   *  can't be skipped, so the composer hides the Skip button when this is set. */
  materialRequired?: boolean;
}

const CAREER_RESUME_PROMPT = "Upload your resume (PDF) so I can analyze it — it's required to get started.";
const CAREER_ANALYZING_MESSAGE = "Got it — analyzing your resume now.";
const CAREER_ROLE_OR_JD_PROMPT =
  'If you have a job description, attach it as a PDF using the paperclip icon below — or just type the role ' +
  'you\'re targeting (e.g. "Data Scientist", "Product Manager").';

const FLOW_QUESTIONS: Record<FlowKind, FlowQuestion[]> = {
  flashcards: [{ key: 'topic', prompt: 'What topic would you like flashcards on?' }],
  mindmap: [{ key: 'topic', prompt: 'What topic should the mind map be centered on?' }],
  roadmap: [
    { key: 'level', prompt: "What's your current level in this — beginner, intermediate, or advanced?" },
    { key: 'deadline', prompt: 'Do you have a deadline? Reply with a date like 2026-12-01, or say "no".' },
    { key: 'hours', prompt: 'How many hours can you study per day?' },
    { key: 'material', prompt: 'Do you have study material (a PDF) you\'d like this roadmap based on? Reply "yes" or "no".' },
  ],
  // The resume upload itself is handled specially in start()/uploadMaterial() below rather than
  // through the generic question-loop, since it comes first and is mandatory (unlike roadmap's
  // optional, last-step material question). Once the resume is in and analyzed, this single
  // question is all that's left before generating — one prompt covers both the role and an
  // optional job description, answered either by typing the role (see submitAnswer) or by
  // uploading a JD PDF instead (see uploadJobDescription), rather than asking two separate
  // questions back to back.
  career: [{ key: 'roleOrJd', prompt: CAREER_ROLE_OR_JD_PROMPT }],
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
  const updateSpaceTitle = useUpdateSpaceTitle();
  const generateDeck = useGenerateDeckFromTopic();
  const generateMindMap = useCreateMindMapFromAi();
  const generateRoadmap = useGenerateRoadmap();
  const createResumeDocument = useCreateResumeDocument();
  const generateCareerProfile = useGenerateCareerProfile();

  const isGenerating =
    generateDeck.isPending ||
    generateMindMap.isPending ||
    generateRoadmap.isPending ||
    createResumeDocument.isPending ||
    generateCareerProfile.isPending;
  const isBusy = isPosting || isGenerating || isExtracting;

  async function postMessage(role: SpaceMessageRole, content: string, metadata?: SpaceMessageMetadata) {
    setIsPosting(true);
    try {
      await addMessage.mutateAsync({ role, content, metadata });
    } finally {
      setIsPosting(false);
    }
  }

  /**
   * Career always starts by requiring a resume — unlike roadmap/mindmap/flashcards, which open
   * with a text question, career's first (and only mandatory) step is a file. The role question
   * only comes after the resume is uploaded and indexed (see uploadMaterial below).
   */
  async function start(kind: FlowKind) {
    if (kind === 'career') {
      setFlow({ kind: 'career', step: 0, answers: {}, awaitingMaterial: true, materialRequired: true });
      await postMessage('assistant', CAREER_RESUME_PROMPT);
      return;
    }
    const questions = FLOW_QUESTIONS[kind];
    setFlow({ kind, step: 0, answers: {} });
    await postMessage('assistant', questions[0].prompt);
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

  /** Handles both ways the merged role/JD question can be answered — typing the role directly
   *  (submitAnswer) or uploading a JD PDF instead (uploadJobDescription). When only a JD was
   *  given, career-analyze extracts a clean role title from it server-side (see
   *  career.service.ts) rather than this guessing one from raw PDF text — careerProfile.target_role
   *  is always that resolved, clean title, which is what gets used to rename the space and title
   *  the chat message either way. */
  async function finishCareer(
    resumeDocumentId: string,
    resumeText: string,
    resumeFileName: string,
    targetRole?: string,
    jobDescription?: string
  ) {
    try {
      const careerProfile = await generateCareerProfile.mutateAsync({
        spaceId: space.id,
        resumeDocumentId,
        resumeText,
        resumeFileName,
        targetRole,
        jobDescription,
      });
      const title = careerProfile.target_role ?? targetRole ?? 'Career Intelligence';
      // Best-effort — a rename failure shouldn't block the flow, the space just keeps its
      // placeholder title. See spaces.service.ts's updateSpaceTitle.
      updateSpaceTitle.mutate({ spaceId: space.id, title });
      await postMessage(
        'assistant',
        `Generated your skill gap analysis and interview prep for "${title}". Click Open below to view it — you can also keep asking me questions about your resume right here, or paste a job description and ask if you're a good fit.`,
        { artifactType: 'career', artifactId: careerProfile.id, artifactTitle: title }
      );
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

    if (flow.kind === 'career' && currentKey === 'roleOrJd') {
      if (!isValidRoleAnswer(text)) {
        // Stay on the same question rather than advancing — re-post it instead of silently
        // accepting an empty/uncertain answer as if it were a real role. The resume is already
        // uploaded and indexed by this point, so no need to re-collect it here.
        setFlow({ kind: 'career', step: 0, answers });
        await postMessage('assistant', `Sorry, I need a role, or a job description upload. ${CAREER_ROLE_OR_JD_PROMPT}`);
        return;
      }
      setFlow(null);
      await finishCareer(answers.resumeDocumentId, answers.resumeText, answers.resumeFileName, text, undefined);
      return;
    }

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
    const isCareer = flow.kind === 'career';
    setIsExtracting(true);
    let materialText: string | undefined;
    try {
      if (file.type !== 'application/pdf') {
        notify.error(isCareer ? 'Please upload your resume as a PDF.' : 'Please upload a PDF file.');
        return;
      }
      const { text } = await extractTextFromPdf(file);
      if (text.trim().length < 30) {
        notify.error(isCareer ? 'Could not read enough text from this resume.' : 'Could not read enough text from this PDF.');
        return;
      }
      materialText = text;
    } finally {
      setIsExtracting(false);
    }
    await postMessage('user', `Uploaded: ${file.name}`);

    if (isCareer) {
      await postMessage('assistant', CAREER_ANALYZING_MESSAGE);
      try {
        // Indexed right away (chunked + embedded through the same RAG pipeline every PDF uses)
        // so it's ready the moment the role comes in and generation kicks off — and so an
        // immediate follow-up question in this chat can already retrieve against it too.
        const resumeDocumentId = await createResumeDocument.mutateAsync({ resumeText: materialText!, resumeFileName: file.name });
        setFlow({
          kind: 'career',
          step: 0,
          answers: { ...answers, resumeDocumentId, resumeText: materialText!, resumeFileName: file.name },
        });
        await postMessage('assistant', CAREER_ROLE_OR_JD_PROMPT);
      } catch {
        setFlow(null);
        await postMessage('assistant', "I couldn't process that resume just now — please try again.");
      }
      return;
    }

    setFlow(null);
    await finishRoadmap(answers, materialText);
  }

  async function skipMaterial() {
    if (!flow || flow.materialRequired) return;
    const answers = flow.answers;
    setFlow(null);
    await postMessage('user', 'Skip');
    await finishRoadmap(answers);
  }

  /** The merged role/JD question accepts a PDF as an alternative to typing the role — unlike the
   *  resume step, this doesn't switch the composer into "upload only" mode (see
   *  FlowState.awaitingMaterial), so this is wired to a small paperclip button that sits
   *  alongside the normal text input instead. There's no role text to go with a JD upload, so
   *  finishCareer's targetRole is left undefined — career-analyze extracts a clean title from the
   *  JD itself. */
  async function uploadJobDescription(file: File) {
    if (!flow || flow.kind !== 'career' || flow.step !== 0 || flow.awaitingMaterial) return;
    const answers = flow.answers;
    setIsExtracting(true);
    let jdText: string | undefined;
    try {
      if (file.type !== 'application/pdf') {
        notify.error('Please upload the job description as a PDF.');
        return;
      }
      const { text } = await extractTextFromPdf(file);
      if (text.trim().length < 10) {
        notify.error('Could not read enough text from that PDF.');
        return;
      }
      jdText = text;
    } finally {
      setIsExtracting(false);
    }
    await postMessage('user', `Uploaded: ${file.name}`);
    setFlow(null);
    await finishCareer(answers.resumeDocumentId, answers.resumeText, answers.resumeFileName, undefined, jdText);
  }

  return { flow, start, submitAnswer, uploadMaterial, uploadJobDescription, skipMaterial, isBusy };
}
