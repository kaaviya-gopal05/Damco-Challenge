import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSearch, Send, Sparkles, FileText } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, CardContent, Select, EmptyState, Badge } from '@/components/ui';
import { AiMarkdown } from '@/components/markdown/AiMarkdown';
import { useAskDocuments, useDocuments } from '@/features/documents/hooks/useDocuments';
import type { DocumentAskTurn } from '@/features/documents/types';

export function AskDocsPage() {
  const { data: documents, isLoading } = useDocuments();
  const ask = useAskDocuments();
  const [question, setQuestion] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [turns, setTurns] = useState<DocumentAskTurn[]>([]);

  const readyDocuments = (documents ?? []).filter((d) => d.status === 'ready');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || ask.isPending) return;
    setQuestion('');
    const result = await ask.mutateAsync({ question: trimmed, documentId: documentId || undefined });
    setTurns((prev) => [...prev, { question: trimmed, result }]);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col animate-fade-in">
      <PageHeader
        title="Ask Your Documents"
        description="Ask a question across every PDF you've uploaded — answers are grounded in your actual documents, with citations."
        actions={
          readyDocuments.length > 0 ? (
            <Select
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              options={readyDocuments.map((d) => ({ value: d.id, label: d.title }))}
              placeholder="All documents"
              className="w-56"
            />
          ) : undefined
        }
      />

      {isLoading ? null : readyDocuments.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No documents to search yet"
          description="Upload a PDF from any Space's PDF Intelligence widget, and once it's processed you can ask questions across it here."
          action={
            <Link to="/app/spaces">
              <Button size="sm">Go to Spaces</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {turns.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Ask anything about your documents"
                description={`Searching across ${readyDocuments.length} document${readyDocuments.length === 1 ? '' : 's'}. Try "What are the key formulas in my notes?" or "Summarize what I uploaded about X."`}
              />
            ) : (
              <div className="flex flex-col gap-6 pb-4">
                {turns.map((turn, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-2.5 text-sm text-white">
                      {turn.question}
                    </div>
                    <Card className="max-w-[85%]">
                      <CardContent>
                        <AiMarkdown content={turn.result.answer} />
                        {turn.result.sources.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                            {turn.result.sources.map((source) => (
                              <Badge key={source.index} variant="neutral" className="gap-1">
                                <FileText className="h-3 w-3" />[{source.index}] {source.documentTitle}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
                {ask.isPending && (
                  <Card className="max-w-[85%]">
                    <CardContent>
                      <p className="text-sm text-ink-400">Searching your documents…</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2 border-t border-ink-100 pt-4">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="h-11 flex-1 rounded-xl border border-ink-200 bg-white px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <Button type="submit" size="icon" isLoading={ask.isPending} disabled={!question.trim()} aria-label="Ask">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
