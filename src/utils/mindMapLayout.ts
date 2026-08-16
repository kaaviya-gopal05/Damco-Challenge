export interface LayoutInputNode {
  id: string;
  parentId: string | null;
  isCollapsed: boolean;
}

export interface LayoutPosition {
  x: number;
  y: number;
}

const HORIZONTAL_GAP = 300;
const VERTICAL_GAP = 90;

/**
 * Simple horizontal tree layout: depth determines x, an in-order leaf traversal determines y.
 * Collapsed nodes still get a position (so re-expanding doesn't jump), but their descendants
 * are skipped from the vertical spacing pass.
 */
export function computeTreeLayout(nodes: LayoutInputNode[]): Map<string, LayoutPosition> {
  const byParent = new Map<string | null, LayoutInputNode[]>();
  for (const node of nodes) {
    const siblings = byParent.get(node.parentId) ?? [];
    siblings.push(node);
    byParent.set(node.parentId, siblings);
  }

  const positions = new Map<string, LayoutPosition>();
  let leafCounter = 0;

  function visit(node: LayoutInputNode, depth: number): number {
    const children = node.isCollapsed ? [] : byParent.get(node.id) ?? [];
    let y: number;
    if (children.length === 0) {
      y = leafCounter * VERTICAL_GAP;
      leafCounter += 1;
    } else {
      const childYs = children.map((child) => visit(child, depth + 1));
      y = childYs.reduce((sum, v) => sum + v, 0) / childYs.length;
    }
    positions.set(node.id, { x: depth * HORIZONTAL_GAP, y });
    return y;
  }

  const roots = byParent.get(null) ?? [];
  for (const root of roots) visit(root, 0);

  return positions;
}
