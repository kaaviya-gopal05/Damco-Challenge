import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles, Mic, MicOff, X } from 'lucide-react';
import { Tooltip } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useCreateSpace } from '@/features/spaces/hooks/useSpaces';
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

function isFlowCommand(id: SlashCommandId): id is FlowCommandId {
  return (FLOW_COMMANDS as readonly string[]).includes(id);
}

export function NewSpaceChatPage() {
  const [input, setInput] = useState('');
  const [pendingCommand, setPendingCommand] = useState<FlowCommandId | null>(null);
  const createSpace = useCreateSpace();
  const { data: profile } = useCurrentProfile();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speech = useSpeechToText((text) => setInput(text.slice(0, MAX_LENGTH)));

  const isBusy = createSpace.isPending;
  const topic = input.trim();
  const firstName = (profile?.full_name ?? '').trim().split(/\s+/)[0] || 'there';
  const activeCommand = pendingCommand ? SLASH_COMMANDS.find((c) => c.id === pendingCommand) : undefined;

  async function handleSend() {
    if (!topic || isBusy) return;
    setInput('');
    if (pendingCommand) {
      const kind = pendingCommand;
      setPendingCommand(null);
      const space = await createSpace.mutateAsync({ title: topic, goalText: topic });
      navigate(`/app/spaces/${space.id}?startFlow=${kind}`);
      return;
    }
    // No pending flow. Create the space immediately (a fast DB insert, same as the widget flows
    // above) and navigate right away — the actual message send + AI reply (intent classification,
    // and for a task brain-dump, prioritization) happens after navigation, inside the chat
    // itself, where the normal "Thinking..." bubble shows it's in progress. This avoids sitting
    // on the welcome screen for the full AI round-trip before anything visible happens.
    const title = topic.length > 60 ? `${topic.slice(0, 57)}...` : topic;
    const space = await createSpace.mutateAsync({ title, goalText: topic });
    navigate(`/app/spaces/${space.id}?firstMessage=${encodeURIComponent(topic)}`);
  }

  function handleWidget(id: SlashCommandId) {
    if (isFlowCommand(id)) {
      setPendingCommand(id);
      textareaRef.current?.focus();
    } else if (id === 'career') {
      // Unlike roadmap/mindmap/flashcards, career doesn't collect a topic here — its first
      // question is a mandatory resume upload, asked once inside the space's chat, so there's
      // nothing useful to type on this screen first.
      createSpace.mutate(
        { title: topic || 'Career Intelligence', goalText: topic || undefined },
        { onSuccess: (space) => navigate(`/app/spaces/${space.id}?startFlow=career`) }
      );
    } else if (id === 'videos') {
      createSpace.mutate(
        { title: topic || 'New space', goalText: topic || undefined },
        { onSuccess: (space) => navigate(`/app/spaces/${space.id}?open=videos`) }
      );
    }
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
          placeholder={pendingCommand ? TOPIC_PLACEHOLDER[pendingCommand] : 'Ask whatever you want....'}
          rows={3}
          autoFocus
          maxLength={MAX_LENGTH}
          className="w-full resize-none bg-transparent px-2 py-1 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-end border-t border-ink-100 pt-2">
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
    </div>
  );
}
