import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, EmptyState } from '@/components/ui';
import type { Document } from '@/types/database';

const STATUS_VARIANT = {
  processing: 'warning',
  ready: 'success',
  failed: 'danger',
} as const;

export function RecentDocumentsCard({ documents }: { documents: Document[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently uploaded PDFs</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Upload a PDF in a space to get an AI summary, key points, and flashcards."
            action={
              <Link to="/app/spaces">
                <Button size="sm">Go to Spaces</Button>
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {documents.slice(0, 5).map((doc) => (
              <li key={doc.id}>
                <Link
                  to={doc.space_id ? `/app/spaces/${doc.space_id}` : '/app/spaces'}
                  className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-ink-50"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-ink-400" />
                    <span className="truncate text-sm font-medium text-ink-800">{doc.title}</span>
                  </span>
                  <Badge variant={STATUS_VARIANT[doc.status]}>{doc.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
