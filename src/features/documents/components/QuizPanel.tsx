import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuizQuestion } from '@/types/database';

export function QuizPanel({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});

  return (
    <div className="flex flex-col gap-6">
      {questions.map((q, qIndex) => {
        const selected = answers[qIndex];
        const isAnswered = selected !== undefined;
        return (
          <div key={qIndex} className="rounded-xl border border-ink-100 p-4">
            <p className="text-sm font-semibold text-ink-900">
              {qIndex + 1}. {q.question}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {q.options.map((option, optionIndex) => {
                const isCorrect = optionIndex === q.correctIndex;
                const isSelected = selected === optionIndex;
                return (
                  <button
                    key={optionIndex}
                    disabled={isAnswered}
                    onClick={() => setAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }))}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                      !isAnswered && 'border-ink-200 hover:border-brand-300 hover:bg-brand-50',
                      isAnswered && isCorrect && 'border-accent-400 bg-accent-50 text-accent-800',
                      isAnswered && isSelected && !isCorrect && 'border-rose-400 bg-rose-50 text-rose-700',
                      isAnswered && !isSelected && !isCorrect && 'border-ink-100 text-ink-400'
                    )}
                  >
                    {option}
                    {isAnswered && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    {isAnswered && isSelected && !isCorrect && <XCircle className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
            {isAnswered && q.explanation && <p className="mt-2 text-xs text-ink-400">{q.explanation}</p>}
          </div>
        );
      })}
    </div>
  );
}
