import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import * as documentsService from '@/services/documents.service';
import * as flashcardsService from '@/services/flashcards.service';
import { notify } from '@/lib/toast';
import type { Document } from '@/types/database';

export function useDocuments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['documents', user?.id],
    queryFn: () => documentsService.listDocuments(user!.id),
    enabled: !!user,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((d) => d.status === 'processing') ? 3000 : false,
  });
}

export function useDocument(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentsService.getDocument(documentId!),
    enabled: !!documentId,
    refetchInterval: (query) => (query.state.data?.document.status === 'processing' ? 3000 : false),
  });
}

export function useUploadDocument() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, spaceId }: { file: File; spaceId?: string }) =>
      documentsService.uploadDocument(user!.id, file, spaceId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      if (variables.spaceId) queryClient.invalidateQueries({ queryKey: ['space-contents', variables.spaceId] });
      notify.success('Document uploaded. Generating insights...');
    },
    onError: (error: Error) => notify.error(error.message || 'Could not upload document'),
  });
}

export function useDocumentSignedUrl(filePath: string | undefined) {
  return useQuery({
    queryKey: ['document-signed-url', filePath],
    queryFn: () => documentsService.getDocumentSignedUrl(filePath!),
    enabled: !!filePath,
    staleTime: 50 * 60 * 1000,
  });
}

export function useGenerateFlashcardsFromDocument() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (document: Document) => {
      const deck = await flashcardsService.createDeck(user!.id, {
        title: `${document.title} (from PDF)`,
        documentId: document.id,
      });
      const text = await documentsService.getDocumentFullText(document.id);
      await flashcardsService.generateCardsFromText(deck.id, text);
      return deck;
    },
    onSuccess: (deck) => {
      queryClient.invalidateQueries({ queryKey: ['flashcard-decks', user?.id] });
      notify.success('Flashcard deck created from document');
      navigate(`/app/flashcards/${deck.id}`);
    },
    onError: () => notify.error('Could not generate flashcards from this document'),
  });
}

export function useDeleteDocument() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (document: Document) => documentsService.deleteDocument(document),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      notify.success('Document deleted');
    },
    onError: () => notify.error('Could not delete document'),
  });
}
