import { describe, expect, it } from 'vitest';
import { computeTreeLayout, type LayoutInputNode } from '@/utils/mindMapLayout';

describe('computeTreeLayout', () => {
  it('places the root at depth 0 and children at depth 1', () => {
    const nodes: LayoutInputNode[] = [
      { id: 'root', parentId: null, isCollapsed: false },
      { id: 'a', parentId: 'root', isCollapsed: false },
      { id: 'b', parentId: 'root', isCollapsed: false },
    ];
    const positions = computeTreeLayout(nodes);
    expect(positions.get('root')!.x).toBe(0);
    expect(positions.get('a')!.x).toBe(300);
    expect(positions.get('b')!.x).toBe(300);
  });

  it('gives leaf nodes distinct, increasing y positions', () => {
    const nodes: LayoutInputNode[] = [
      { id: 'root', parentId: null, isCollapsed: false },
      { id: 'a', parentId: 'root', isCollapsed: false },
      { id: 'b', parentId: 'root', isCollapsed: false },
      { id: 'c', parentId: 'root', isCollapsed: false },
    ];
    const positions = computeTreeLayout(nodes);
    const ys = ['a', 'b', 'c'].map((id) => positions.get(id)!.y);
    expect(new Set(ys).size).toBe(3);
    expect(ys).toEqual([...ys].sort((x, y) => x - y));
  });

  it('positions a parent at the average y of its children', () => {
    const nodes: LayoutInputNode[] = [
      { id: 'root', parentId: null, isCollapsed: false },
      { id: 'a', parentId: 'root', isCollapsed: false },
      { id: 'a1', parentId: 'a', isCollapsed: false },
      { id: 'a2', parentId: 'a', isCollapsed: false },
    ];
    const positions = computeTreeLayout(nodes);
    const a1y = positions.get('a1')!.y;
    const a2y = positions.get('a2')!.y;
    const ay = positions.get('a')!.y;
    expect(ay).toBeCloseTo((a1y + a2y) / 2);
  });

  it('still assigns a position to a collapsed node, but skips its descendants', () => {
    const nodes: LayoutInputNode[] = [
      { id: 'root', parentId: null, isCollapsed: false },
      { id: 'a', parentId: 'root', isCollapsed: true },
      { id: 'a1', parentId: 'a', isCollapsed: false },
    ];
    const positions = computeTreeLayout(nodes);
    expect(positions.has('a')).toBe(true);
    expect(positions.has('a1')).toBe(false);
  });

  it('returns an empty map for an empty node list', () => {
    const positions = computeTreeLayout([]);
    expect(positions.size).toBe(0);
  });
});
