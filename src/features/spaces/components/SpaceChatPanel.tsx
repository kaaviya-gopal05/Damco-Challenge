import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Loader2, ArrowUpRight, Map, Share2, Layers, ListChecks, Upload, X, Mic, MicOff } from 'lucide-react';
import { SkeletonList, Tooltip } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useSpaceMessages, useSendChatMessage } from '@/features/spaces/hooks/useSpaces';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { SlashCommandMenu, type SlashCommandId } from '@/features/spaces/components/SlashCommandMenu';
import { SpaceWidgetBar } from '@/features/spaces/components/SpaceWidgetBar';
import type { ActiveView } from '@/features/spaces/types';
import type { FlowState } from '@/features/spaces/hooks/useCommandFlow';
import type { Space, SpaceMessage } from '@/types/database';

const ARTIFACT_ICON = { roadmap: Map, mindmap: Share2, flashcards: Layers, document: Share2, todo: ListChecks } as const;

function ArtifactOpenCard({ message, onOpen }: { message: SpaceMessage; onOpen: (view: ActiveView) => void }) {
  const { artifactType, artifactId, artifactTitle } = message.metadata;
  if (!artifactType || !artifactId) return null;
  const Icon = ARTIFACT_ICON[artifactType];
  return (
    <button
      onClick={() => onOpen({ type: artifactType, id: artifactId } as ActiveView)}
      className="mt-1.5 flex w-full max-w-[85%] items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink-900">{artifactTitle}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600">
        Open <ArrowUpRight className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

export function SpaceChatPanel({
  space,
  onTriggerCommand,
  onOpenArtifact,
  flow,
  onSubmitFlowAnswer,
  onUploadMaterial,
  onSkipMaterial,
  isFlowBusy,
  todoHintActive,
  onDismissTodoHint,
  firstMessage,
}: {
  space: Space;
  onTriggerCommand: (id: SlashCommandId) => void;
  onOpenArtifact: (view: ActiveView) => void;
  flow: FlowState | null;
  onSubmitFlowAnswer: (text: string) => void;
  onUploadMaterial: (file: File) => void;
  onSkipMaterial: () => void;
  isFlowBusy: boolean;
  todoHintActive: boolean;
  onDismissTodoHint: () => void;
  /** A message to send automatically the moment this panel mounts — set when the space was just
   *  created from a plain typed/spoken message on the "new space" screen, so the send (and its
   *  "Thinking..." bubble) happens here instead of blocking navigation on the AI round-trip. */
  firstMessage?: string | null;
}) {
  const { data: messages, isLoading } = useSpaceMessages(space.id);
  const sendMessage = useSendChatMessage(space);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speech = useSpeechToText(setInput);
  const firstMessageSentRef = useRef(false);

  const isSlash = input.startsWith('/');
  const slashQuery = isSlash ? input.slice(1) : '';
  const isBusy = sendMessage.isPending || isFlowBusy;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, isBusy]);

  useEffect(() => {
    if (todoHintActive) textareaRef.current?.focus();
  }, [todoHintActive]);

  useEffect(() => {
    if (firstMessage && !firstMessageSentRef.current) {
      firstMessageSentRef.current = true;
      sendMessage.mutate(firstMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstMessage]);

  function handleSelectCommand(id: SlashCommandId) {
    setInput('');
    onTriggerCommand(id);
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || isSlash || isBusy) return;
    setInput('');
    onDismissTodoHint();
    if (flow) {
      onSubmitFlowAnswer(content);
    } else {
      // No active flow — including right after the To-do widget's hint, which only focuses
      // the input rather than asking a question. The chat's own AI intent classifier (see
      // spaces.service.ts's replyToMessage) reads this message directly: a task brain-dump is
      // prioritized and saved immediately, with zero follow-up questions.
      await sendMessage.mutateAsync(content);
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-col bg-white">
      <div className="border-b border-ink-100 px-4 py-4">
        <p className="truncate font-semibold text-ink-900">{space.title}</p>
        {space.goal_text && <p className="mt-0.5 line-clamp-2 text-xs text-ink-400">{space.goal_text}</p>}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        {isLoading && <SkeletonList rows={3} />}

        {!isLoading && !isBusy && (messages?.length ?? 0) === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
            <Sparkles className="h-6 w-6 text-brand-400" />
            <p className="text-sm font-medium text-ink-700">Start the conversation</p>
            <p className="max-w-[240px] text-xs text-ink-400">
              Ask for a roadmap, mind map, or flashcards in your own words, or use a widget below.
            </p>
            <SpaceWidgetBar onSelect={onTriggerCommand} className="flex flex-wrap items-center justify-center gap-1.5" />
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages?.map((m) => (
            <div key={m.id} className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm',
                  m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-800'
                )}
              >
                {m.content}
              </div>
              {m.role === 'assistant' && <ArtifactOpenCard message={m} onOpen={onOpenArtifact} />}
            </div>
          ))}
          {isBusy && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-ink-100 px-3.5 py-2.5 text-sm text-ink-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {isFlowBusy ? 'Working on it...' : 'Thinking...'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative border-t border-ink-100 p-3">
        {isSlash && <SlashCommandMenu query={slashQuery} onSelect={handleSelectCommand} />}
        {todoHintActive && !flow && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-brand-50 px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-brand-700">
              <ListChecks className="h-3.5 w-3.5" />
              To-do Task List — type or speak your tasks below, then send. No extra questions.
            </span>
            <button
              onClick={onDismissTodoHint}
              className="flex h-5 w-5 items-center justify-center rounded-md text-brand-500 hover:bg-brand-100"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {flow?.awaitingMaterial ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => materialInputRef.current?.click()}
              disabled={isBusy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload PDF
            </button>
            <button
              onClick={onSkipMaterial}
              disabled={isBusy}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Skip
            </button>
            <input
              ref={materialInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) onUploadMaterial(file);
              }}
            />
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isSlash) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                flow
                  ? 'Type your answer...'
                  : todoHintActive
                    ? 'e.g. Buy groceries, and then I have an exam next month, and I need to finish this pitch deck tonight'
                    : 'Message, or type / for actions...'
              }
              rows={1}
              className="max-h-32 flex-1 resize-none rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <Tooltip content={speech.isSupported ? (speech.isListening ? 'Stop listening' : 'Speak your message') : 'Voice input is not supported in this browser'}>
              <button
                onClick={() => (speech.isListening ? speech.stop() : speech.start())}
                disabled={!speech.isSupported || isBusy}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  speech.isListening
                    ? 'border-rose-300 bg-rose-50 text-rose-600'
                    : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
                )}
                aria-label={speech.isListening ? 'Stop voice input' : 'Start voice input'}
              >
                {speech.isListening ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
              </button>
            </Tooltip>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSlash || isBusy}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
