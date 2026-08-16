import { useEffect } from 'react';
import { FileText } from 'lucide-react';
import { Badge, Card, EmptyState, SkeletonList } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useDocument, useDocumentSignedUrl } from '@/features/documents/hooks/useDocuments';
import { DocumentInsights } from '@/features/documents/components/DocumentInsights';
import { markDocumentStudied } from '@/services/documents.service';

const STATUS_VARIANT = { processing: 'warning', ready: 'success', failed: 'danger' } as const;

export function SpaceDocumentView({ documentId }: { documentId: string }) {
  const { user } = useAuth();
  const { data, isLoading } = useDocument(documentId);
  const { data: signedUrl } = useDocumentSignedUrl(data?.document.file_path);

  useEffect(() => {
    if (user && documentId && data?.document.status === 'ready') {
      markDocumentStudied(user.id, documentId);
    }
    // Only fire once per document becoming ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, data?.document.status]);

  if (isLoading) return <SkeletonList rows={4} />;
  if (!data) return <EmptyState icon={FileText} title="Document not found" description="It may have been deleted." />;

  const { document, insights } = data;

  return (
    <div>
      <h2 className="mb-3 text-lg font-bold text-ink-900">{document.title}</h2>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge variant={STATUS_VARIANT[document.status]}>{document.status}</Badge>
        {document.page_count && <span className="text-xs text-ink-400">{document.page_count} pages</span>}
        {document.file_size_bytes && (
          <span className="text-xs text-ink-400">{(document.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>
        )}
        <span className="text-xs text-ink-400">Uploaded {new Date(document.created_at).toLocaleDateString()}</span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="overflow-hidden">
          {signedUrl ? (
            <iframe title={document.title} src={signedUrl} className="h-[50vh] w-full" />
          ) : (
            <div className="flex h-[50vh] items-center justify-center text-sm text-ink-400">Loading document...</div>
          )}
        </Card>

        <DocumentInsights document={document} insights={insights} />
      </div>
    </div>
  );
}
