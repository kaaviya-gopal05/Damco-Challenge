import { Sparkles } from 'lucide-react';
import { Badge, Button, Card, CardContent, Select } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Skill, UserSkill } from '@/types/database';

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }));

// Fixed pixel widths (rather than `auto`) so the header row and every body row — each a
// separate CSS Grid container — line up exactly regardless of what each row happens to render.
const GRID_COLS = 'grid-cols-[minmax(0,1fr)_150px_92px_108px_150px]';

function statusFor(current: number, target: number): { label: string; variant: 'success' | 'warning' | 'danger' } {
  if (current === 0) return { label: 'Missing', variant: 'danger' };
  if (current >= target) return { label: 'Strong', variant: 'success' };
  return { label: 'Improve', variant: 'warning' };
}

export function SkillGapMatrix({
  skills,
  userSkills,
  onChange,
  onImprove,
}: {
  skills: Skill[];
  userSkills: UserSkill[];
  onChange: (skillId: string, currentLevel: number, targetLevel: number) => void;
  onImprove: (skill: Skill) => void;
}) {
  const byId = new Map(userSkills.map((s) => [s.skill_id, s]));

  return (
    <Card>
      <CardContent className="p-0">
        <div className={cn('grid items-center gap-4 border-b border-ink-100 px-5 py-4', GRID_COLS)}>
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Skill</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Current</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Target</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Status</span>
          <span />
        </div>
        <div className="divide-y divide-ink-100">
          {skills.map((skill) => {
            const existing = byId.get(skill.id);
            const current = existing?.current_level ?? 0;
            const target = existing?.target_level ?? 3;
            const status = statusFor(current, target);
            return (
              <div key={skill.id} className={cn('grid items-center gap-4 px-5 py-4', GRID_COLS)}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-800">{skill.name}</p>
                  {skill.category && <p className="text-xs text-ink-400">{skill.category}</p>}
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => onChange(skill.id, level === current ? level - 1 : level, target)}
                      aria-label={`Set current level to ${level}`}
                      className={cn(
                        'h-2.5 w-4 rounded-full transition-colors',
                        level <= current ? 'bg-brand-500' : 'bg-ink-100 hover:bg-ink-200'
                      )}
                    />
                  ))}
                </div>
                <div className="w-16">
                  <Select
                    value={String(target)}
                    onChange={(e) => onChange(skill.id, current, Number(e.target.value))}
                    options={LEVEL_OPTIONS}
                  />
                </div>
                <div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                  onClick={() => onImprove(skill)}
                >
                  Improve skill
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
