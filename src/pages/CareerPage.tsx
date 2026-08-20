import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Briefcase, Target } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, EmptyState, SkeletonList, Tabs, TabList, Tab, TabPanel } from '@/components/ui';
import { useCareerProfiles, useSkills, useUserSkills, useUpsertUserSkill } from '@/features/career/hooks/useCareer';
import { SkillGapInsights } from '@/features/career/components/SkillGapInsights';
import { SkillGapMatrix } from '@/features/career/components/SkillGapMatrix';
import { InterviewPrepPanel } from '@/features/career/components/InterviewPrepPanel';
import { SkillImprovementModal } from '@/features/career/components/SkillImprovementModal';
import { cn } from '@/lib/utils';
import type { Skill } from '@/types/database';

/**
 * Career Intelligence is view-only from this page — creation only happens through the Spaces
 * chat flow (the "Career" widget), which asks for a role, a resume, and an optional job
 * description, then generates everything here. This page's only job is showing what's already
 * been generated: a role switcher (when more than one exists) and three tabs per role.
 */
export function CareerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: allCareerProfiles, isLoading } = useCareerProfiles();
  const [improveSkill, setImproveSkill] = useState<Skill | null>(null);

  // A career_profiles row only gets a target_role once generation actually completes (see
  // career.service.ts's generateCareerProfileFromChat) — a row stuck without one (an interrupted
  // generation, or a stray row from before this page existed) has nothing coherent to show and
  // would otherwise render as an unlabeled, empty pill in the role switcher below.
  const careerProfiles = allCareerProfiles?.filter((p) => !!p.target_role);

  const requestedId = searchParams.get('role');
  const activeProfile = careerProfiles?.find((p) => p.id === requestedId) ?? careerProfiles?.[0];
  const roleLabel = activeProfile?.target_role ?? '';

  const { data: skills } = useSkills();
  const { data: userSkills } = useUserSkills(activeProfile?.id);
  const upsertSkill = useUpsertUserSkill(activeProfile?.id);

  function selectProfile(id: string) {
    setSearchParams({ role: id }, { replace: true });
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={activeProfile ? roleLabel : 'Career Intelligence'}
        description="Skill gap analysis, interview prep, and a plan to close the gap — grounded in your resume."
      />

      {isLoading ? (
        <SkeletonList rows={3} />
      ) : !careerProfiles || careerProfiles.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No career analysis yet"
          description="Start one from a Space — click the Career widget, tell it the role you're targeting, and upload your resume."
          action={
            <Link to="/app/spaces">
              <Button size="sm">Go to Spaces</Button>
            </Link>
          }
        />
      ) : (
        <>
          {careerProfiles.length > 1 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {careerProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => selectProfile(profile.id)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                    profile.id === activeProfile?.id
                      ? 'border-brand-400 bg-brand-50 text-brand-700'
                      : 'border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-700'
                  )}
                >
                  {profile.target_role}
                </button>
              ))}
            </div>
          )}

          {activeProfile && (
            <Tabs defaultValue="skills">
              <TabList>
                <Tab value="skills">Skill Gap</Tab>
                <Tab value="interview">Interview Preparation</Tab>
                <Tab value="finetune">Fine-tuning Your Skills</Tab>
              </TabList>
              <div className="mt-5">
                <TabPanel value="skills">
                  <SkillGapInsights analysis={activeProfile.resume_analysis} roleLabel={roleLabel} />
                </TabPanel>
                <TabPanel value="interview">
                  <InterviewPrepPanel careerProfile={activeProfile} roleLabel={roleLabel} />
                </TabPanel>
                <TabPanel value="finetune">
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
                    <EmptyState icon={Target} title="Still analyzing" description="Check back in a moment." />
                  )}
                </TabPanel>
              </div>
            </Tabs>
          )}
        </>
      )}

      <SkillImprovementModal skill={improveSkill} isOpen={!!improveSkill} onClose={() => setImproveSkill(null)} />
    </div>
  );
}
