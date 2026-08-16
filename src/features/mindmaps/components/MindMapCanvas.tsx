import { useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Plus, Minus, LocateFixed, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MindMapNodeCard } from '@/features/mindmaps/components/MindMapNodeCard';
import type { MindMapNode } from '@/types/database';

const CANVAS_PADDING = 80;

export interface MindMapCanvasProps {
  nodes: MindMapNode[];
  onAddChild: (parentId: string) => void;
  onRename: (nodeId: string, label: string) => void;
  onDelete: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
  onMove: (nodeId: string, x: number, y: number) => void;
  onAutoArrange: () => void;
  onExpandWithAi: (node: MindMapNode) => void;
  expandingNodeId: string | null;
}

export function MindMapCanvas({
  nodes,
  onAddChild,
  onRename,
  onDelete,
  onToggleCollapse,
  onMove,
  onAutoArrange,
  onExpandWithAi,
  expandingNodeId,
}: MindMapCanvasProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 60, y: 60 });
  const panState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const dragState = useRef<{ nodeId: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const [draggingPos, setDraggingPos] = useState<{ id: string; x: number; y: number } | null>(null);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const visibleNodes = useMemo(() => {
    const hiddenParents = new Set(nodes.filter((n) => n.is_collapsed).map((n) => n.id));
    return nodes.filter((n) => {
      let current = n.parent_id;
      while (current) {
        if (hiddenParents.has(current)) return false;
        current = nodeById.get(current)?.parent_id ?? null;
      }
      return true;
    });
  }, [nodes, nodeById]);

  function handleCanvasMouseDown(e: ReactMouseEvent) {
    if (e.target !== e.currentTarget) return;
    panState.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
  }

  function handlePanMove(e: MouseEvent) {
    if (!panState.current) return;
    const dx = e.clientX - panState.current.startX;
    const dy = e.clientY - panState.current.startY;
    setOffset({ x: panState.current.originX + dx, y: panState.current.originY + dy });
  }

  function handlePanEnd() {
    panState.current = null;
    window.removeEventListener('mousemove', handlePanMove);
    window.removeEventListener('mouseup', handlePanEnd);
  }

  function handleNodeDragStart(node: MindMapNode, e: ReactMouseEvent) {
    e.stopPropagation();
    dragState.current = { nodeId: node.id, startX: e.clientX, startY: e.clientY, nodeX: node.position_x, nodeY: node.position_y };
    window.addEventListener('mousemove', handleNodeDragMove);
    window.addEventListener('mouseup', handleNodeDragEnd);
  }

  function handleNodeDragMove(e: MouseEvent) {
    if (!dragState.current) return;
    const dx = (e.clientX - dragState.current.startX) / scale;
    const dy = (e.clientY - dragState.current.startY) / scale;
    setDraggingPos({ id: dragState.current.nodeId, x: dragState.current.nodeX + dx, y: dragState.current.nodeY + dy });
  }

  function handleNodeDragEnd() {
    if (dragState.current && draggingPos) {
      onMove(dragState.current.nodeId, draggingPos.x, draggingPos.y);
    }
    dragState.current = null;
    setDraggingPos(null);
    window.removeEventListener('mousemove', handleNodeDragMove);
    window.removeEventListener('mouseup', handleNodeDragEnd);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setScale((s) => Math.min(1.75, Math.max(0.4, s - e.deltaY * 0.001)));
  }

  function resetView() {
    setScale(1);
    setOffset({ x: 60, y: 60 });
  }

  const edges = useMemo(() => {
    return visibleNodes
      .filter((n) => n.parent_id)
      .map((n) => {
        const parent = nodeById.get(n.parent_id!);
        if (!parent) return null;
        const from = draggingPos?.id === parent.id ? draggingPos : { x: parent.position_x, y: parent.position_y };
        const to = draggingPos?.id === n.id ? draggingPos : { x: n.position_x, y: n.position_y };
        return { id: n.id, x1: from.x + 110, y1: from.y + 24, x2: to.x, y2: to.y + 24 };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }, [visibleNodes, nodeById, draggingPos]);

  return (
    <div className="relative h-[70vh] w-full overflow-hidden rounded-2xl border border-ink-200 bg-[radial-gradient(circle,#e6e6ec_1px,transparent_1px)] bg-[length:20px_20px]">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-xl border border-ink-200 bg-white p-1 shadow-soft">
        <button onClick={() => setScale((s) => Math.max(0.4, s - 0.15))} className="rounded-lg p-2 hover:bg-ink-100" aria-label="Zoom out">
          <Minus className="h-4 w-4 text-ink-600" />
        </button>
        <span className="w-10 text-center text-xs font-medium text-ink-500">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(1.75, s + 0.15))} className="rounded-lg p-2 hover:bg-ink-100" aria-label="Zoom in">
          <Plus className="h-4 w-4 text-ink-600" />
        </button>
        <button onClick={resetView} className="rounded-lg p-2 hover:bg-ink-100" aria-label="Reset view">
          <LocateFixed className="h-4 w-4 text-ink-600" />
        </button>
        <button onClick={onAutoArrange} className="rounded-lg p-2 hover:bg-ink-100" aria-label="Auto arrange">
          <Sparkles className="h-4 w-4 text-ink-600" />
        </button>
      </div>

      <div
        className={cn('h-full w-full', panState.current ? 'cursor-grabbing' : 'cursor-grab')}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
          className="relative"
        >
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width={1}
            height={1}
            style={{ transform: `translate(${CANVAS_PADDING}px, ${CANVAS_PADDING}px)` }}
          >
            {edges.map((edge) => (
              <path
                key={edge.id}
                d={`M ${edge.x1} ${edge.y1} C ${edge.x1 + 60} ${edge.y1}, ${edge.x2 - 60} ${edge.y2}, ${edge.x2} ${edge.y2}`}
                fill="none"
                stroke="#bcbcc9"
                strokeWidth={2}
              />
            ))}
          </svg>

          {visibleNodes.map((node) => {
            const pos = draggingPos?.id === node.id ? draggingPos : { x: node.position_x, y: node.position_y };
            const hasChildren = nodes.some((n) => n.parent_id === node.id);
            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: pos.x + CANVAS_PADDING,
                  top: pos.y + CANVAS_PADDING,
                }}
              >
                <MindMapNodeCard
                  node={node}
                  hasChildren={hasChildren}
                  onDragStart={(e) => handleNodeDragStart(node, e)}
                  onAddChild={() => onAddChild(node.id)}
                  onRename={(label) => onRename(node.id, label)}
                  onDelete={() => onDelete(node.id)}
                  onToggleCollapse={() => onToggleCollapse(node.id)}
                  onExpandWithAi={() => onExpandWithAi(node)}
                  isExpanding={expandingNodeId === node.id}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
