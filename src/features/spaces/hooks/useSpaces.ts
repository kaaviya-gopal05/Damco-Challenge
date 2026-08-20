import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as spacesService from '@/services/spaces.service';
import { notify } from '@/lib/toast';
import type { CreateSpaceInput } from '@/services/spaces.service';
import type { Space, SpaceMessageRole, SpaceMessageMetadata } from '@/types/database';

export function useSpaces() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const migrated = useRef(false);

  const query = useQuery({
    queryKey: ['spaces', user?.id],
    queryFn: () => spacesService.listSpaces(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || migrated.current || !query.isSuccess) return;
    if (query.data.length > 0) {
      migrated.current = true;
      return;
    }
    migrated.current = true;
    spacesService.migrateOrphanedContentIntoDefaultSpace(user.id).then((didMigrate) => {
      if (didMigrate) queryClient.invalidateQueries({ queryKey: ['spaces', user.id] });
    });
  }, [user, query.isSuccess, query.data, queryClient]);

  return query;
}

export function useSpace(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['space', spaceId],
    queryFn: () => spacesService.getSpace(spaceId!),
    enabled: !!spaceId,
  });
}

export function useSpaceContents(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['space-contents', spaceId],
    queryFn: () => spacesService.getSpaceContents(spaceId!),
    enabled: !!spaceId,
  });
}

export function useCreateSpace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSpaceInput) => spacesService.createSpace(user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces', user?.id] });
    },
    onError: () => notify.error('Could not create space'),
  });
}

export function useUpdateSpaceTitle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId, title }: { spaceId: string; title: string }) => spacesService.updateSpaceTitle(spaceId, title),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['space', spaceId] });
    },
  });
}

export function useDeleteSpace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (spaceId: string) => spacesService.deleteSpace(spaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces', user?.id] });
      // Deleting a space also deletes its career profile, if it had one (see
      // spaces.service.ts's deleteSpace) — refresh so a deleted role stops showing on the
      // Career Intelligence page immediately.
      queryClient.invalidateQueries({ queryKey: ['career-profiles', user?.id] });
      notify.success('Space deleted');
    },
    onError: () => notify.error('Could not delete space'),
  });
}

export function useSpaceMessages(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['space-messages', spaceId],
    queryFn: () => spacesService.listMessages(spaceId!),
    enabled: !!spaceId,
  });
}

export function useSendChatMessage(space: Space) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => spacesService.sendChatMessage(user!.id, space, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-messages', space.id] });
      queryClient.invalidateQueries({ queryKey: ['space-contents', space.id] });
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      // A plain message can auto-generate a to-do list too (see spaces.service.ts's chat
      // intent classifier) — refresh so a newly organized list shows up immediately.
      queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
    },
    onError: () => notify.error('Could not send that. Please try again.'),
  });
}

export function useAddMessage(space: Space) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      role,
      content,
      metadata,
    }: {
      role: SpaceMessageRole;
      content: string;
      metadata?: SpaceMessageMetadata;
    }) => spacesService.addMessage(space.id, role, content, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-messages', space.id] });
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
    },
    onError: () => notify.error('Could not send that. Please try again.'),
  });
}

