import { useEffect, useState } from 'react';
import { Target, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, EmptyState, SkeletonList, Tabs, TabList, Tab, TabPanel } from '@/components/ui';
import {
  useCareerProfiles,
  useSelectCareerTrack,
  useSkills,
  useUserSkills,
  useUpsertUserSkill,
} from '@/features/career/hooks/useCareer';
import { ResumeUploadPanel } from '@/features/career/components/ResumeUploadPanel';
import { SkillGapInsights } from '@/features/career/components/SkillGapInsights';
import { SkillGapMatrix } from '@/features/career/components/SkillGapMatrix';
import { InterviewPrepPanel } from '@/features/career/components/InterviewPrepPanel';
import { SkillImprovementModal } from '@/features/career/components/SkillImprovementModal';
import { CAREER_TRACKS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Skill } from '@/types/database';

export function CareerPage() {
  const { data: careerProfiles, isLoading: profilesLoading } = useCareerProfiles();
  const selectTrack = useSelectCareerTrack();
  const [trackId, setTrackId] = useState<string | null>(null);
  const [customRoleDraft, setCustomRoleDraft] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [improveSkill, setImproveSkill] = useState<Skill | null>(null);

  useEffect(() => {
    if (!trackId && careerProfiles && careerProfiles.length > 0) {
      setTrackId(careerProfiles[0].career_track);
    }
  }, [careerProfiles, trackId]);

  const activeProfile = careerProfiles?.find((p) => p.career_track === trackId);
  const isCustomTrack = !!trackId && !CAREER_TRACKS.some((t) => t.id === trackId);
  const trackLabel = CAREER_TRACKS.find((t) => t.id === trackId)?.label ?? trackId ?? 'Career prep';

  const { data: skills } = useSkills();
  const { data: userSkills } = useUserSkills(activeProfile?.id);
  const upsertSkill = useUpsertUserSkill(activeProfile?.id);

  function handleSelectTrack(id: string) {
    setTrackId(id);
    if (!careerProfiles?.some((p) => p.career_track === id)) {
      selectTrack.mutate(id);
    }
  }

  function submitCustomRole() {
    const value = customRoleDraft.trim();
    if (!value) return;
    handleSelectTrack(value);
    setShowCustomInput(false);
    setCustomRoleDraft('');
  }

  const gaps = activeProfile?.resume_analysis?.gaps ?? [];
  const isLoadingProfile = profilesLoading || (!!trackId && !activeProfile && selectTrack.isPending);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Career Intelligence"
        description="Pick a target role, analyze your resume, close skill gaps, and prep for interviews."
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {CAREER_TRACKS.map((track) => (
          <button
            key={track.id}
            onClick={() => handleSelectTrack(track.id)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              track.id === trackId
                ? 'border-brand-400 bg-brand-50 text-brand-700'
                : 'border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-700'
            )}
          >
            {track.label}
          </button>
        ))}

        {isCustomTrack && (
          <span className="rounded-full border border-brand-400 bg-brand-50 px-3.5 py-1.5 text-sm font-medium capitalize text-brand-700">
            {trackId}
          </span>
        )}

        {showCustomInput ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={customRoleDraft}
              onChange={(e) => setCustomRoleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCustomRole();
                if (e.key === 'Escape') setShowCustomInput(false);
              }}
              placeholder="e.g. Forward Deployed Engineer"
              className="rounded-full border border-ink-200 px-3.5 py-1.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button
              onClick={submitCustomRole}
              className="rounded-full bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCustomInput(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-ink-300 px-3.5 py-1.5 text-sm font-medium text-ink-500 transition-colors hover:border-brand-300 hover:text-brand-600"
          >
            <Plus className="h-3.5 w-3.5" /> Custom role
          </button>
        )}
      </div>

      {isLoadingProfile ? (
        <SkeletonList rows={3} />
      ) : !activeProfile ? (
        <p className="text-sm text-ink-500">Choose a target role above to get started.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <ResumeUploadPanel careerProfile={activeProfile} trackLabel={trackLabel} />

          {gaps.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-50 px-4 py-3">
              <span className="flex items-center gap-1.5 text-sm font-medium text-brand-700">
                <Target className="h-4 w-4" /> Focus areas from your resume:
              </span>
              {gaps.map((g, i) => (
                <Badge key={i} variant="brand" className="normal-case">
                  {g}
                </Badge>
              ))}
            </div>
          )}

          <Tabs defaultValue="skills">
            <TabList>
              <Tab value="skills">Skill Gap</Tab>
              <Tab value="interview">Interview Preparation</Tab>
            </TabList>
            <div className="mt-5">
              <TabPanel value="skills">
                <div className="flex flex-col gap-6">
                  <SkillGapInsights analysis={activeProfile.resume_analysis} roleLabel={trackLabel} />
                  <div>
                    <p className="mb-3 text-sm font-semibold text-ink-800">Fine-tune your skill levels</p>
                    {activeProfile.resume_analysis ? (
                      <SkillGapMatrix
                        skills={skills ?? []}
                        userSkills={userSkills ?? []}
                        onChange={(skillId, current, target) =>
                          upsertSkill.mutate({ skillId, currentLevel: current, targetLevel: target })
                        }
                        onImprove={setImproveSkill}
                      />
                    ) : (
                      <EmptyState
                        icon={Target}
                        title="No fine-tuning skills yet"
                        description={`Upload your resume above to rate your skill levels for ${trackLabel}.`}
                      />
                    )}
                  </div>
                </div>
              </TabPanel>
              <TabPanel value="interview">
                <InterviewPrepPanel careerProfile={activeProfile} roleLabel={trackLabel} />
              </TabPanel>
            </div>
          </Tabs>
        </div>
      )}

      <SkillImprovementModal skill={improveSkill} isOpen={!!improveSkill} onClose={() => setImproveSkill(null)} />
    </div>
  );
}
