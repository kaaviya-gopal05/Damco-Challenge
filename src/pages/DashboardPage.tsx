import { Flame, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SkeletonList } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { useRoadmaps, useSetTaskCompletion } from '@/features/roadmaps/hooks/useRoadmaps';
import { useDueCards } from '@/features/flashcards/hooks/useFlashcards';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useSpaces } from '@/features/spaces/hooks/useSpaces';
import { useAnalyticsSummary } from '@/features/analytics/hooks/useAnalytics';
import { useCareerProfiles } from '@/features/career/hooks/useCareer';
import { StatCard } from '@/components/charts/StatCard';
import { WeeklyActivityChart } from '@/components/charts/WeeklyActivityChart';
import { ActiveRoadmapCard } from '@/features/dashboard/components/ActiveRoadmapCard';
import { TodayTasksCard } from '@/features/dashboard/components/TodayTasksCard';
import { DueFlashcardsCard } from '@/features/dashboard/components/DueFlashcardsCard';
import { RecentDocumentsCard } from '@/features/dashboard/components/RecentDocumentsCard';
import { RecommendedVideosCard } from '@/features/dashboard/components/RecommendedVideosCard';
import { CareerProgressCard } from '@/features/dashboard/components/CareerProgressCard';

export function DashboardPage() {
  const { user } = useAuth();
  const { data: profile } = useCurrentProfile();
  const { data: roadmaps, isLoading: roadmapsLoading } = useRoadmaps();
  const { data: dueCards, isLoading: dueCardsLoading } = useDueCards();
  const { data: documents, isLoading: documentsLoading } = useDocuments();
  const { data: spaces } = useSpaces();
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsSummary();
  const { data: careerProfiles } = useCareerProfiles();

  const activeRoadmap = roadmaps?.find((r) => r.status === 'active');
  const setTaskCompletion = useSetTaskCompletion(activeRoadmap?.id ?? '');
  const careerProfile = careerProfiles?.[0];

  const generatedQuestions = careerProfile?.interview_questions_generated ?? [];
  const masteredCount = generatedQuestions.filter((q) => q.status === 'mastered').length;

  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const spacesCount = spaces?.length ?? 0;

  const isLoading = roadmapsLoading || dueCardsLoading || documentsLoading || analyticsLoading;

  return (
    <div className="animate-fade-in">
      <PageHeader title={`Welcome back, ${firstName}`} description="Here's where your learning stands today." />

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Flame} label="Day streak" value={String(analytics?.currentStreak ?? 0)} accent="amber" />
            <StatCard
              icon={CheckCircle2}
              label="Roadmap complete"
              value={`${analytics?.roadmapCompletionAvg ?? 0}%`}
              accent="accent"
            />
            <StatCard
              icon={Clock}
              label="Hours this week"
              value={((analytics?.weeklyActivity ?? []).reduce((s, d) => s + d.minutesStudied, 0) / 60).toFixed(1)}
              accent="brand"
            />
            <StatCard icon={MessageSquare} label="Spaces" value={String(spacesCount)} accent="rose" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <WeeklyActivityChart data={analytics?.weeklyActivity ?? []} />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <ActiveRoadmapCard roadmap={activeRoadmap} />
                <TodayTasksCard
                  roadmaps={roadmaps ?? []}
                  onToggle={(taskId, isCompleted) => setTaskCompletion.mutate({ taskId, isCompleted })}
                />
              </div>
              <RecommendedVideosCard topic={activeRoadmap?.title ?? 'programming'} />
            </div>

            <div className="flex flex-col gap-6">
              <DueFlashcardsCard cards={dueCards ?? []} />
              <RecentDocumentsCard documents={documents ?? []} />
              <CareerProgressCard
                careerProfile={careerProfile}
                masteredCount={masteredCount}
                totalCount={generatedQuestions.length}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
