import { SLASH_COMMANDS, type SlashCommandId } from '@/features/spaces/components/SlashCommandMenu';

export function SpaceWidgetBar({ onSelect, className }: { onSelect: (id: SlashCommandId) => void; className?: string }) {
  return (
    <div className={className ?? 'flex flex-wrap items-center gap-2'}>
      {SLASH_COMMANDS.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          <c.icon className="h-3.5 w-3.5" />
          {c.description}
        </button>
      ))}
    </div>
  );
}
