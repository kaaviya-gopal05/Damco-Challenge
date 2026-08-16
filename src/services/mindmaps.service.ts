import { supabase } from '@/lib/supabase';
import { logActivity } from '@/services/activity.service';
import { getAiService, type MindMapTreeNode } from '@/services/ai.service';
import { computeTreeLayout } from '@/utils/mindMapLayout';
import type { MindMap, MindMapNode } from '@/types/database';

export async function listMindMaps(userId: string): Promise<MindMap[]> {
  const { data, error } = await supabase
    .from('mind_maps')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MindMap[];
}

export interface MindMapWithNodes {
  mindMap: MindMap;
  nodes: MindMapNode[];
}

export async function getMindMap(mindMapId: string): Promise<MindMapWithNodes> {
  const [{ data: mindMap, error: mapError }, { data: nodes, error: nodesError }] = await Promise.all([
    supabase.from('mind_maps').select('*').eq('id', mindMapId).single(),
    supabase.from('mind_map_nodes').select('*').eq('mind_map_id', mindMapId).order('order_index'),
  ]);
  if (mapError) throw mapError;
  if (nodesError) throw nodesError;
  return { mindMap: mindMap as MindMap, nodes: (nodes ?? []) as MindMapNode[] };
}

export async function createMindMap(
  userId: string,
  title: string,
  description?: string,
  spaceId?: string
): Promise<MindMapWithNodes> {
  const { data: mindMap, error } = await supabase
    .from('mind_maps')
    .insert({ user_id: userId, title, description: description ?? null, space_id: spaceId ?? null })
    .select()
    .single();
  if (error) throw error;

  const { data: rootNode, error: nodeError } = await supabase
    .from('mind_map_nodes')
    .insert({ mind_map_id: mindMap.id, label: title, parent_id: null, position_x: 0, position_y: 0 })
    .select()
    .single();
  if (nodeError) throw nodeError;

  await logActivity({ userId, activityType: 'mind_map_created', metadata: { mindMapId: mindMap.id, title } });

  return { mindMap: mindMap as MindMap, nodes: [rootNode as MindMapNode] };
}

interface FlatTreeNode {
  tempId: string;
  parentTempId: string | null;
  label: string;
  depth: number;
}

function flattenTree(tree: MindMapTreeNode): FlatTreeNode[] {
  const result: FlatTreeNode[] = [];
  let counter = 0;

  function walk(node: MindMapTreeNode, parentTempId: string | null, depth: number) {
    const tempId = `n${counter++}`;
    result.push({ tempId, parentTempId, label: node.label, depth });
    for (const child of node.children ?? []) {
      walk(child, tempId, depth + 1);
    }
  }

  walk(tree, null, 0);
  return result;
}

/**
 * Inserts a flattened tree level-by-level so each level's parent_id values (real DB ids from
 * the previous level) are known before insert. `seed` pre-populates the temp-id -> real-id map
 * and offsets every computed position, used by expandNodeWithAi to graft onto an existing node.
 */
async function insertFlatTree(
  mindMapId: string,
  flat: FlatTreeNode[],
  seed: { tempIdToRealId?: Map<string, string>; offsetX?: number; offsetY?: number; skipDepths?: number[] } = {}
): Promise<Map<string, string>> {
  const positions = computeTreeLayout(flat.map((n) => ({ id: n.tempId, parentId: n.parentTempId, isCollapsed: false })));
  const offsetX = seed.offsetX ?? 0;
  const offsetY = seed.offsetY ?? 0;
  const skipDepths = new Set(seed.skipDepths ?? []);

  const byDepth = new Map<number, FlatTreeNode[]>();
  for (const node of flat) {
    const nodesAtDepth = byDepth.get(node.depth) ?? [];
    nodesAtDepth.push(node);
    byDepth.set(node.depth, nodesAtDepth);
  }

  const tempIdToRealId = seed.tempIdToRealId ?? new Map<string, string>();
  const maxDepth = Math.max(...flat.map((n) => n.depth));

  for (let depth = 0; depth <= maxDepth; depth++) {
    if (skipDepths.has(depth)) continue;
    const nodesAtDepth = byDepth.get(depth) ?? [];
    if (nodesAtDepth.length === 0) continue;

    const rows = nodesAtDepth.map((node) => {
      const pos = positions.get(node.tempId)!;
      return {
        mind_map_id: mindMapId,
        parent_id: node.parentTempId ? (tempIdToRealId.get(node.parentTempId) ?? null) : null,
        label: node.label,
        position_x: pos.x + offsetX,
        position_y: pos.y + offsetY,
      };
    });

    const { data: inserted, error } = await supabase.from('mind_map_nodes').insert(rows).select();
    if (error) throw error;
    inserted.forEach((row, i) => tempIdToRealId.set(nodesAtDepth[i].tempId, row.id));
  }

  return tempIdToRealId;
}

export async function createMindMapFromAiTopic(userId: string, topic: string, spaceId?: string): Promise<MindMapWithNodes> {
  const ai = getAiService();
  const tree = await ai.generateMindMapTree(topic);
  const flat = flattenTree(tree);

  const { data: mindMap, error: mapError } = await supabase
    .from('mind_maps')
    .insert({ user_id: userId, title: tree.label || topic, space_id: spaceId ?? null })
    .select()
    .single();
  if (mapError) throw mapError;

  await insertFlatTree(mindMap.id, flat);
  await logActivity({ userId, activityType: 'mind_map_created', metadata: { mindMapId: mindMap.id, topic } });

  return getMindMap(mindMap.id);
}

export async function expandNodeWithAi(userId: string, mindMapId: string, node: MindMapNode): Promise<void> {
  const ai = getAiService();
  const tree = await ai.generateMindMapTree(node.label);
  // Skip re-creating a node for the label itself — graft its children onto the existing node.
  const flat = flattenTree(tree);
  const rootTempId = flat[0].tempId;

  await insertFlatTree(mindMapId, flat, {
    tempIdToRealId: new Map([[rootTempId, node.id]]),
    offsetX: node.position_x,
    offsetY: node.position_y,
    skipDepths: [0],
  });

  await touchMindMap(mindMapId);
  await logActivity({ userId, activityType: 'mind_map_edited', metadata: { mindMapId, expandedNodeId: node.id } });
}

export async function deleteMindMap(mindMapId: string): Promise<void> {
  const { error } = await supabase.from('mind_maps').delete().eq('id', mindMapId);
  if (error) throw error;
}

export interface AddNodeInput {
  mindMapId: string;
  parentId: string | null;
  label: string;
  positionX: number;
  positionY: number;
  color?: string;
}

export async function addNode(userId: string, input: AddNodeInput): Promise<MindMapNode> {
  const { data, error } = await supabase
    .from('mind_map_nodes')
    .insert({
      mind_map_id: input.mindMapId,
      parent_id: input.parentId,
      label: input.label,
      position_x: input.positionX,
      position_y: input.positionY,
      color: input.color ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await touchMindMap(input.mindMapId);
  await logActivity({ userId, activityType: 'mind_map_edited', metadata: { mindMapId: input.mindMapId } });
  return data as MindMapNode;
}

export async function updateNode(
  nodeId: string,
  mindMapId: string,
  updates: Partial<Pick<MindMapNode, 'label' | 'notes' | 'color' | 'position_x' | 'position_y' | 'is_collapsed'>>
): Promise<void> {
  const { error } = await supabase.from('mind_map_nodes').update(updates).eq('id', nodeId);
  if (error) throw error;
  await touchMindMap(mindMapId);
}

export async function deleteNode(nodeId: string, mindMapId: string): Promise<void> {
  const { error } = await supabase.from('mind_map_nodes').delete().eq('id', nodeId);
  if (error) throw error;
  await touchMindMap(mindMapId);
}

async function touchMindMap(mindMapId: string): Promise<void> {
  await supabase.from('mind_maps').update({ updated_at: new Date().toISOString() }).eq('id', mindMapId);
}
