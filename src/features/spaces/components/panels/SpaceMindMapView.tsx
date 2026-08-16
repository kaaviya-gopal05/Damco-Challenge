import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { EmptyState, SkeletonList } from '@/components/ui';
import {
  useMindMap,
  useAddNode,
  useUpdateNode,
  useDeleteNode,
  useExpandNodeWithAi,
} from '@/features/mindmaps/hooks/useMindMaps';
import { MindMapCanvas } from '@/features/mindmaps/components/MindMapCanvas';
import { computeTreeLayout } from '@/utils/mindMapLayout';
import type { MindMapNode } from '@/types/database';

export function SpaceMindMapView({ mindMapId }: { mindMapId: string }) {
  const { data, isLoading } = useMindMap(mindMapId);
  const addNode = useAddNode(mindMapId);
  const updateNode = useUpdateNode(mindMapId);
  const deleteNode = useDeleteNode(mindMapId);
  const expandWithAi = useExpandNodeWithAi(mindMapId);
  const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null);

  if (isLoading) return <SkeletonList rows={3} />;
  if (!data) return <EmptyState icon={Share2} title="Mind map not found" description="It may have been deleted." />;

  const { mindMap, nodes } = data;

  function handleAddChild(parentId: string) {
    const parent = nodes.find((n) => n.id === parentId);
    if (!parent) return;
    const siblingCount = nodes.filter((n) => n.parent_id === parentId).length;
    addNode.mutate({
      parentId,
      label: 'New idea',
      positionX: parent.position_x + 260,
      positionY: parent.position_y + siblingCount * 90,
    });
  }

  async function handleExpandWithAi(node: MindMapNode) {
    setExpandingNodeId(node.id);
    try {
      await expandWithAi.mutateAsync(node);
    } finally {
      setExpandingNodeId(null);
    }
  }

  function handleAutoArrange() {
    const layout = computeTreeLayout(nodes.map((n) => ({ id: n.id, parentId: n.parent_id, isCollapsed: n.is_collapsed })));
    for (const node of nodes) {
      const pos = layout.get(node.id);
      if (pos && (pos.x !== node.position_x || pos.y !== node.position_y)) {
        updateNode.mutate({ nodeId: node.id, updates: { position_x: pos.x, position_y: pos.y } });
      }
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-ink-900">{mindMap.title}</h2>
        <p className="mt-1 text-sm text-ink-500">
          Double-click a node to rename it. Drag to reposition, scroll to zoom, drag the background to pan.
        </p>
      </div>

      <MindMapCanvas
        nodes={nodes}
        onAddChild={handleAddChild}
        onRename={(nodeId, label) => updateNode.mutate({ nodeId, updates: { label } })}
        onDelete={(nodeId) => deleteNode.mutate(nodeId)}
        onToggleCollapse={(nodeId) => {
          const node = nodes.find((n) => n.id === nodeId);
          if (node) updateNode.mutate({ nodeId, updates: { is_collapsed: !node.is_collapsed } });
        }}
        onMove={(nodeId, x, y) => updateNode.mutate({ nodeId, updates: { position_x: x, position_y: y } })}
        onAutoArrange={handleAutoArrange}
        onExpandWithAi={handleExpandWithAi}
        expandingNodeId={expandingNodeId}
      />
    </div>
  );
}
