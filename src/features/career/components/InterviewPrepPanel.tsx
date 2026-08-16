import { useState } from 'react';
import { ChevronDown, CheckCircle2, HelpCircle, Sparkles, RotateCcw } from 'lucide-react';
import { Badge, Button, Card, CardContent, Tabs, TabList, Tab, TabPanel } from '@/components/ui';
import { INTERVIEW_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useGenerateInterviewQuestions, useUpdateQuestionStatus } from '@/features/career/hooks/useCareer';
import type { CareerProfile, GeneratedInterviewQuestion, InterviewCategory } from '@/types/database';

function QuestionList({
  careerProfile,
  category,
  onUpdateStatus,
}: {
  careerProfile: CareerProfile;
  category: InterviewCategory;
  onUpdateStatus: (questionId: string, status: 'practiced' | 'mastered') => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const questions = (careerProfile.interview_questions_generated ?? []).filter((q) => q.category === category);

  if (questions.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-ink-400">No questions generated for this category.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {questions.map((q: GeneratedInterviewQuestion) => {
        const isExpanded = expandedId === q.id;
        return (
          <Card key={q.id}>
            <button onClick={() => setExpandedId(isExpanded ? null : q.id)} className="flex w-full items-start gap-3 p-4 text-left">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink-900">{q.question}</span>
                <span className="mt-1 flex items-center gap-2">
                  <Badge variant="neutral">{q.difficulty}</Badge>
                  {q.status !== 'new' && (
                    <Badge variant={q.status === 'mastered' ? 'success' : 'brand'}>
                      {q.status === 'mastered' ? 'Mastered' : 'Practiced'}
                    </Badge>
                  )}
                </span>
              </span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-400 transition-transform', isExpanded && 'rotate-180')} />
            </button>
            {isExpanded && (
              <div className="border-t border-ink-100 px-4 py-3">
                <p className="text-sm text-ink-600">{q.sampleAnswer}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onUpdateStatus(q.id, 'practiced')}>
                    Mark practiced
                  </Button>
                  <Button size="sm" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => onUpdateStatus(q.id, 'mastered')}>
                    Mark mastered
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export function InterviewPrepPanel({ careerProfile, roleLabel }: { careerProfile: CareerProfile; roleLabel: string }) {
  const generate = useGenerateInterviewQuestions();
  const updateStatus = useUpdateQuestionStatus();
  const questions = careerProfile.interview_questions_generated ?? [];

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-ink-900">Generate interview questions for {roleLabel}</p>
            <p className="mt-1 text-sm text-ink-500">
              We'll create technical, behavioral, system design, coding, resume, and HR questions tailored to this role
              {careerProfile.resume_analysis ? ' and your resume gaps' : ''}.
            </p>
          </div>
          <Button
            leftIcon={<Sparkles className="h-4 w-4" />}
            isLoading={generate.isPending}
            onClick={() => generate.mutate({ careerProfile, roleLabel })}
          >
            Generate questions
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          size="sm"
          variant="outline"
          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          isLoading={generate.isPending}
          onClick={() => generate.mutate({ careerProfile, roleLabel })}
        >
          Regenerate questions
        </Button>
      </div>
      <Tabs defaultValue={INTERVIEW_CATEGORIES[0].id}>
        <TabList className="mb-4 flex-wrap">
          {INTERVIEW_CATEGORIES.map((c) => (
            <Tab key={c.id} value={c.id}>
              {c.label}
            </Tab>
          ))}
        </TabList>
        {INTERVIEW_CATEGORIES.map((c) => (
          <TabPanel key={c.id} value={c.id}>
            <QuestionList
              careerProfile={careerProfile}
              category={c.id}
              onUpdateStatus={(questionId, status) => updateStatus.mutate({ careerProfile, questionId, status })}
            />
          </TabPanel>
        ))}
      </Tabs>
    </div>
  );
}
