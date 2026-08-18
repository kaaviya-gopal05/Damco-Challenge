import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles, Paperclip, Mic, MicOff, ListChecks, X } from 'lucide-react';
import { Tooltip } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useCreateSpace, useAttachToNewSpace } from '@/features/spaces/hooks/useSpaces';
import { useUploadDocument } from '@/features/documents/hooks/useDocuments';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { SLASH_COMMANDS, type SlashCommandId } from '@/features/spaces/components/SlashCommandMenu';

const MAX_LENGTH = 1000;
const FLOW_COMMANDS = ['roadmap', 'mindmap', 'flashcards'] as const;
type FlowCommandId = (typeof FLOW_COMMANDS)[number];

const TOPIC_PLACEHOLDER: Record<FlowCommandId, string> = {
  roadmap: 'e.g. React',
  mindmap: 'e.g. Machine Learning',
  flashcards: 'e.g. Python',
};

const TODO_PLACEHOLDER = 'e.g. Buy groceries, and then I have an exam next month, and I need to finish this pitch deck tonight';

function isFlowCommand(id: SlashCommandId): id is FlowCommandId {
  return (FLOW_COMMANDS as readonly string[]).includes(id);
}

export function NewSpaceChatPage() {
  const [input, setInput] = useState('');
  const [pendingCommand, setPendingCommand] = useState<FlowCommandId | null>(null);
  const [todoHintActive, setTodoHintActive] = useState(false);
  const createSpace = useCreateSpace();
  const attachToNewSpace = useAttachToNewSpace();
  const uploadDocument = useUploadDocument();
  const { data: profile } = useCurrentProfile();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speech = useSpeechToText((text) => setInput(text.slice(0, MAX_LENGTH)));

  const isBusy = createSpace.isPending;
  const topic = input.trim();
  const firstName = (profile?.full_name ?? '').trim().split(/\s+/)[0] || 'there';
  const activeCommand = pendingCommand ? SLASH_COMMANDS.find((c) => c.id === pendingCommand) : undefined;

  async function handleSend() {
    if (!topic || isBusy) return;
    setInput('');
    setTodoHintActive(false);
    if (pendingCommand) {
      const kind = pendingCommand;
      setPendingCommand(null);
      const space = await createSpace.mutateAsync({ title: topic, goalText: topic });
      navigate(`/app/spaces/${space.id}?startFlow=${kind}`);
      return;
    }
    // No pending flow — including right after clicking the To-do widget, which only hints the
    // input rather than setting one. Create the space immediately (a fast DB insert, same as
    // the widget flows above) and navigate right away — the actual message send + AI reply
    // (intent classification, and for a task brain-dump, prioritization) happens after
    // navigation, inside the chat itself, where the normal "Thinking..." bubble shows it's in
    // progress. This avoids sitting on the welcome screen for the full AI round-trip before
    // anything visible happens.
    const title = topic.length > 60 ? `${topic.slice(0, 57)}...` : topic;
    const space = await createSpace.mutateAsync({ title, goalText: topic });
    navigate(`/app/spaces/${space.id}?firstMessage=${encodeURIComponent(topic)}`);
  }

  function handleWidget(id: SlashCommandId) {
    if (isFlowCommand(id)) {
      setPendingCommand(id);
      setTodoHintActive(false);
      textareaRef.current?.focus();
    } else if (id === 'todo') {
      setPendingCommand(null);
      setTodoHintActive(true);
      textareaRef.current?.focus();
    } else if (id === 'pdf') {
      fileInputRef.current?.click();
    } else if (id === 'videos') {
      createSpace.mutate(
        { title: topic || 'New space', goalText: topic || undefined },
        { onSuccess: (space) => navigate(`/app/spaces/${space.id}?open=videos`) }
      );
    }
  }

  async function handlePdfFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const title = file.name.replace(/\.pdf$/i, '');
    uploadDocument.mutate(
      { file },
      {
        onSuccess: async ({ document }) => {
          const space = await attachToNewSpace.mutateAsync({ table: 'documents', recordId: document.id, title, goalText: topic || undefined });
          navigate(`/app/spaces/${space.id}?open=document:${document.id}`);
        },
      }
    );
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-4xl flex-col justify-center gap-8 py-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">
          Hi there,{' '}
          <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
            {firstName}
          </span>
        </h1>
        <h1 className="text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">
          What do you want to{' '}
          <span className="bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent">learn?</span>
        </h1>
        <p className="mt-3 max-w-lg text-sm text-ink-500">
          Use one of the widgets below or describe your goal in the chat box to begin.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {SLASH_COMMANDS.map((c) => (
          <button
            key={c.id}
            onClick={() => handleWidget(c.id)}
            className="flex h-32 flex-col justify-between rounded-2xl border border-ink-200/70 bg-white p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <span className="text-sm font-medium text-ink-800">{c.description}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <c.icon className="h-4 w-4" />
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white p-3 shadow-soft">
        {activeCommand && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-brand-50 px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-brand-700">
              <activeCommand.icon className="h-3.5 w-3.5" />
              {activeCommand.description} — type a topic below
            </span>
            <button
              onClick={() => setPendingCommand(null)}
              className="flex h-5 w-5 items-center justify-center rounded-md text-brand-500 hover:bg-brand-100"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {todoHintActive && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-brand-50 px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-brand-700">
              <ListChecks className="h-3.5 w-3.5" />
              To-do Task List — type or speak your tasks below, then send. No extra questions.
            </span>
            <button
              onClick={() => setTodoHintActive(false)}
              className="flex h-5 w-5 items-center justify-center rounded-md text-brand-500 hover:bg-brand-100"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={pendingCommand ? TOPIC_PLACEHOLDER[pendingCommand] : todoHintActive ? TODO_PLACEHOLDER : 'Ask whatever you want....'}
          rows={3}
          autoFocus
          maxLength={MAX_LENGTH}
          className="w-full resize-none bg-transparent px-2 py-1 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-700"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Add attachment
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-400">
              {input.length}/{MAX_LENGTH}
            </span>
            <Tooltip content={speech.isSupported ? (speech.isListening ? 'Stop listening' : 'Speak instead of typing') : 'Voice input is not supported in this browser'}>
              <button
                onClick={() => (speech.isListening ? speech.stop() : speech.start())}
                disabled={!speech.isSupported}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
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
              disabled={!topic || isBusy}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
              aria-label="Send"
            >
              {isBusy ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfFileChange} />
    </div>
  );
}
