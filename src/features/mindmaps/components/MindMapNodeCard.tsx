import { useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MindMapNode } from '@/types/database';

export function MindMapNodeCard({
  node,
  hasChildren,
  onDragStart,
  onAddChild,
  onRename,
  onDelete,
  onToggleCollapse,
  onExpandWithAi,
  isExpanding,
}: {
  node: MindMapNode;
  hasChildren: boolean;
  onDragStart: (e: ReactMouseEvent) => void;
  onAddChild: () => void;
  onRename: (label: string) => void;
  onDelete: () => void;
  onToggleCollapse: () => void;
  onExpandWithAi: () => void;
  isExpanding: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(node.label);
  const isRoot = node.parent_id === null;

  function commitRename() {
    setIsEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== node.label) onRename(trimmed);
    else setDraft(node.label);
  }

  return (
    <div
      onMouseDown={onDragStart}
      style={{ borderColor: node.color ?? undefined }}
      className={cn(
        'group relative flex w-[220px] cursor-grab select-none items-center gap-1.5 rounded-xl border-2 bg-white px-3 py-2.5 shadow-soft active:cursor-grabbing',
        isRoot ? 'border-brand-500 bg-brand-50' : 'border-ink-200'
      )}
    >
      {hasChildren && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onToggleCollapse}
          className="shrink-0 rounded p-0.5 text-ink-400 hover:bg-ink-100"
          aria-label={node.is_collapsed ? 'Expand' : 'Collapse'}
        >
          {node.is_collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}

      {isEditing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => e.key === 'Enter' && commitRename()}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full min-w-0 flex-1 bg-transparent text-sm font-medium text-ink-900 focus:outline-none"
        />
      ) : (
        <p
          onDoubleClick={() => setIsEditing(true)}
          className={cn('min-w-0 flex-1 truncate text-sm font-medium', isRoot ? 'text-brand-800' : 'text-ink-800')}
        >
          {node.label}
        </p>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onExpandWithAi}
          disabled={isExpanding}
          className="rounded p-1 text-ink-400 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
          aria-label="Expand with AI"
          title="Expand with AI"
        >
          {isExpanding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onAddChild}
          className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-brand-600"
          aria-label="Add child node"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        {!isRoot && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onDelete}
            className="rounded p-1 text-ink-400 hover:bg-rose-50 hover:text-rose-600"
            aria-label="Delete node"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
