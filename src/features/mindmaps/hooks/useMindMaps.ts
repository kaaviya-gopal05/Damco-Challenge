import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as mindMapsService from '@/services/mindmaps.service';
import { notify } from '@/lib/toast';
import type { MindMapNode } from '@/types/database';

export function useMindMaps() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['mind-maps', user?.id],
    queryFn: () => mindMapsService.listMindMaps(user!.id),
    enabled: !!user,
  });
}

export function useMindMap(mindMapId: string | undefined) {
  return useQuery({
    queryKey: ['mind-map', mindMapId],
    queryFn: () => mindMapsService.getMindMap(mindMapId!),
    enabled: !!mindMapId,
  });
}

export function useCreateMindMap() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, description, spaceId }: { title: string; description?: string; spaceId?: string }) =>
      mindMapsService.createMindMap(user!.id, title, description, spaceId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mind-maps', user?.id] });
      if (variables.spaceId) queryClient.invalidateQueries({ queryKey: ['space-contents', variables.spaceId] });
      notify.success('Mind map created');
    },
    onError: () => notify.error('Could not create mind map'),
  });
}

export function useCreateMindMapFromAi() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topic, spaceId }: { topic: string; spaceId?: string }) =>
      mindMapsService.createMindMapFromAiTopic(user!.id, topic, spaceId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mind-maps', user?.id] });
      if (variables.spaceId) queryClient.invalidateQueries({ queryKey: ['space-contents', variables.spaceId] });
      notify.success('Mind map generated');
    },
    onError: () => notify.error('Could not generate mind map. Please try again.'),
  });
}

export function useDeleteMindMap() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mindMapId: string) => mindMapsService.deleteMindMap(mindMapId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mind-maps', user?.id] });
      notify.success('Mind map deleted');
    },
    onError: () => notify.error('Could not delete mind map'),
  });
}

export function useAddNode(mindMapId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { parentId: string | null; label: string; positionX: number; positionY: number }) =>
      mindMapsService.addNode(user!.id, { mindMapId, ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mind-map', mindMapId] }),
    onError: () => notify.error('Could not add node'),
  });
}

export function useUpdateNode(mindMapId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, updates }: { nodeId: string; updates: Partial<Pick<MindMapNode, 'label' | 'notes' | 'color' | 'position_x' | 'position_y' | 'is_collapsed'>> }) =>
      mindMapsService.updateNode(nodeId, mindMapId, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mind-map', mindMapId] }),
    onError: () => notify.error('Could not update node'),
  });
}

export function useExpandNodeWithAi(mindMapId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (node: MindMapNode) => mindMapsService.expandNodeWithAi(user!.id, mindMapId, node),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mind-map', mindMapId] });
      notify.success('Branches generated');
    },
    onError: () => notify.error('Could not generate branches for this node'),
  });
}

export function useDeleteNode(mindMapId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) => mindMapsService.deleteNode(nodeId, mindMapId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mind-map', mindMapId] }),
    onError: () => notify.error('Could not delete node'),
  });
}
