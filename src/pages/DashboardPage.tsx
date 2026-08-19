import { Flame, CheckCircle2, Clock, ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SkeletonList } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { useRoadmaps, useSetTaskCompletion } from '@/features/roadmaps/hooks/useRoadmaps';
import { useDueCards } from '@/features/flashcards/hooks/useFlashcards';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useUserTasks } from '@/features/tasks/hooks/useTasks';
import { useAnalyticsSummary } from '@/features/analytics/hooks/useAnalytics';
import { useCareerProfiles } from '@/features/career/hooks/useCareer';
import { StatCard } from '@/components/charts/StatCard';
import { WeeklyActivityChart } from '@/components/charts/WeeklyActivityChart';
import { ActiveRoadmapCard } from '@/features/dashboard/components/ActiveRoadmapCard';
import { TodayTasksCard } from '@/features/dashboard/components/TodayTasksCard';
import { TodoTasksCard } from '@/features/dashboard/components/TodoTasksCard';
import { DueFlashcardsCard } from '@/features/dashboard/components/DueFlashcardsCard';
import { RecentDocumentsCard } from '@/features/dashboard/components/RecentDocumentsCard';
import { RecommendedVideosCard } from '@/features/dashboard/components/RecommendedVideosCard';
import { CareerProgressCard } from '@/features/dashboard/components/CareerProgressCard';
import { WeeklyPlanCard } from '@/features/dashboard/components/WeeklyPlanCard';
import { EmailMonitoringWidget } from '@/features/agents/EmailMonitoringWidget';

export function DashboardPage() {
  const { user } = useAuth();
  const { data: profile } = useCurrentProfile();
  const { data: roadmaps, isLoading: roadmapsLoading } = useRoadmaps();
  const { data: dueCards, isLoading: dueCardsLoading } = useDueCards();
  const { data: documents, isLoading: documentsLoading } = useDocuments();
  const { data: todoTasks, isLoading: todoTasksLoading } = useUserTasks();
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsSummary();
  const { data: careerProfiles } = useCareerProfiles();

  const activeRoadmap = roadmaps?.find((r) => r.status === 'active');
  const setTaskCompletion = useSetTaskCompletion(activeRoadmap?.id ?? '');
  const careerProfile = careerProfiles?.[0];

  const generatedQuestions = careerProfile?.interview_questions_generated ?? [];
  const masteredCount = generatedQuestions.filter((q) => q.status === 'mastered').length;

  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const openTaskCount = (todoTasks ?? []).filter((t) => !t.is_completed).length;
  const highPriorityOpenCount = (todoTasks ?? []).filter((t) => !t.is_completed && t.priority === 'high').length;

  const isLoading = roadmapsLoading || dueCardsLoading || documentsLoading || analyticsLoading || todoTasksLoading;

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
            <StatCard
              icon={ListChecks}
              label="Open tasks"
              value={String(openTaskCount)}
              hint={highPriorityOpenCount > 0 ? `${highPriorityOpenCount} high priority` : undefined}
              accent="rose"
            />
          </div>

          <div className="mt-6">
            <WeeklyPlanCard />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] lg:items-stretch">
            <WeeklyActivityChart data={analytics?.weeklyActivity ?? []} />
            <EmailMonitoringWidget />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <ActiveRoadmapCard roadmap={activeRoadmap} />
              <TodayTasksCard
                roadmaps={roadmaps ?? []}
                onToggle={(taskId, isCompleted) => setTaskCompletion.mutate({ taskId, isCompleted })}
              />
            </div>
            <TodoTasksCard tasks={todoTasks ?? []} />

            <RecommendedVideosCard topic={activeRoadmap?.title ?? 'programming'} />
            <DueFlashcardsCard cards={dueCards ?? []} />

            <CareerProgressCard
              careerProfile={careerProfile}
              masteredCount={masteredCount}
              totalCount={generatedQuestions.length}
            />
            <RecentDocumentsCard documents={documents ?? []} />
          </div>
        </>
      )}
    </div>
  );
}
