import { ExternalLink, Clock } from 'lucide-react';
import { Modal, Badge, SkeletonList, EmptyState } from '@/components/ui';
import { AiMarkdown } from '@/components/markdown/AiMarkdown';
import { QuizPanel } from '@/features/documents/components/QuizPanel';
import { useSkillImprovementPlan } from '@/features/career/hooks/useCareer';
import { useVideoSearch, useIsYoutubeLive } from '@/features/youtube/hooks/useYoutube';
import { formatDuration } from '@/lib/utils';
import type { Skill } from '@/types/database';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-400">{children}</p>;
}

export function SkillImprovementModal({
  skill,
  isOpen,
  onClose,
}: {
  skill: Skill | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: plan, isLoading: planLoading } = useSkillImprovementPlan(skill?.name, skill?.category, isOpen && !!skill);
  const { data: videos, isLoading: videosLoading } = useVideoSearch({ topic: skill?.name ?? '' }, isOpen && !!skill);
  const isYoutubeLive = useIsYoutubeLive();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={skill ? `Improve: ${skill.name}` : 'Improve skill'}
      description="AI-generated videos, courses, notes, and a quick quiz to help you level up."
      size="lg"
    >
      {planLoading ? (
        <SkeletonList rows={5} />
      ) : plan ? (
        <div className="flex flex-col gap-7">
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <SectionLabel>Videos</SectionLabel>
              {!isYoutubeLive && <Badge variant="warning">Demo data — connect an API key</Badge>}
            </div>
            {videosLoading ? (
              <SkeletonList rows={2} />
            ) : videos && videos.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {videos.slice(0, 2).map((video) => (
                  <a
                    key={video.videoId}
                    href={`https://www.youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex flex-col overflow-hidden rounded-xl border border-ink-200/70 transition-colors hover:border-brand-300"
                  >
                    <div className="relative aspect-video w-full bg-ink-100">
                      {video.thumbnailUrl && (
                        <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                      {video.durationSeconds && (
                        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-ink-950/80 px-1.5 py-0.5 text-xs font-medium text-white">
                          <Clock className="h-3 w-3" /> {formatDuration(video.durationSeconds)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 p-3">
                      <p className="line-clamp-2 text-sm font-medium text-ink-900 group-hover:text-brand-700">{video.title}</p>
                      <p className="flex items-center gap-1 text-xs text-ink-400">
                        {video.channelTitle} <ExternalLink className="h-3 w-3" />
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <EmptyState icon={Clock} title="No videos found" description="Try again in a moment." />
            )}
          </div>

          <div>
            <SectionLabel>Courses</SectionLabel>
            <div className="flex flex-col gap-2.5">
              {plan.courses.map((course, i) => (
                <div key={i} className="rounded-xl border border-ink-200/70 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">{course.title}</p>
                    <Badge variant="neutral">{course.provider}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">{course.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Summary notes</SectionLabel>
            <AiMarkdown content={plan.summary} />
          </div>

          <div>
            <SectionLabel>Quick quiz</SectionLabel>
            <QuizPanel questions={plan.quiz} />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
