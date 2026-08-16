import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Layers } from 'lucide-react';
import { Card, CardContent, Tabs, TabList, Tab, TabPanel, Button, EmptyState } from '@/components/ui';
import { QuizPanel } from '@/features/documents/components/QuizPanel';
import { useGenerateFlashcardsFromDocument } from '@/features/documents/hooks/useDocuments';
import type { Document, DocumentInsight, QaPair, QuizQuestion } from '@/types/database';

function findInsight<T>(insights: DocumentInsight[], kind: DocumentInsight['kind']): T | undefined {
  return insights.find((i) => i.kind === kind)?.content as T | undefined;
}

export function DocumentInsights({ document, insights }: { document: Document; insights: DocumentInsight[] }) {
  const generateFlashcards = useGenerateFlashcardsFromDocument();

  if (document.status === 'processing') {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Sparkles}
            title="Generating insights..."
            description="Summary, key points, Q&A, and a quiz are being generated from this document."
          />
        </CardContent>
      </Card>
    );
  }

  if (document.status === 'failed') {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Sparkles}
            title="Something went wrong"
            description="We couldn't process this document. Try uploading it again."
          />
        </CardContent>
      </Card>
    );
  }

  const summary = findInsight<{ text: string }>(insights, 'summary');
  const keyPoints = findInsight<string[]>(insights, 'key_points') ?? [];
  const qa = findInsight<QaPair[]>(insights, 'qa') ?? [];
  const quiz = findInsight<QuizQuestion[]>(insights, 'quiz') ?? [];

  return (
    <Card>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabList>
            <Tab value="summary">Summary</Tab>
            <Tab value="key_points">Key Points</Tab>
            <Tab value="qa">Q&A</Tab>
            <Tab value="quiz">Quiz</Tab>
            <Tab value="flashcards">Flashcards</Tab>
          </TabList>

          <div className="mt-5">
            <TabPanel value="summary">
              <div className="prose prose-sm max-w-none text-ink-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary?.text ?? 'No summary available.'}</ReactMarkdown>
              </div>
            </TabPanel>

            <TabPanel value="key_points">
              {keyPoints.length === 0 ? (
                <p className="text-sm text-ink-400">No key points extracted.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {keyPoints.map((point, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink-700">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                      {point}
                    </li>
                  ))}
                </ul>
              )}
            </TabPanel>

            <TabPanel value="qa">
              {qa.length === 0 ? (
                <p className="text-sm text-ink-400">No questions generated.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {qa.map((pair, i) => (
                    <div key={i} className="rounded-xl border border-ink-100 p-4">
                      <p className="text-sm font-semibold text-ink-900">Q: {pair.question}</p>
                      <p className="mt-1.5 text-sm text-ink-600">A: {pair.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabPanel>

            <TabPanel value="quiz">
              {quiz.length === 0 ? <p className="text-sm text-ink-400">No quiz available.</p> : <QuizPanel questions={quiz} />}
            </TabPanel>

            <TabPanel value="flashcards">
              <EmptyState
                icon={Layers}
                title="Turn this document into flashcards"
                description="Generate a flashcard deck from the document's content for active recall practice."
                action={
                  <Button onClick={() => generateFlashcards.mutate(document)} isLoading={generateFlashcards.isPending}>
                    Generate flashcards
                  </Button>
                }
              />
            </TabPanel>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
