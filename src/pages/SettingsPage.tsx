import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Skeleton } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentProfile, useUpdateProfile } from '@/hooks/useCurrentProfile';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Lagos',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useCurrentProfile();
  const updateProfile = useUpdateProfile();

  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setHeadline(profile.headline ?? '');
      setTimezone(profile.timezone ?? 'UTC');
    }
  }, [profile]);

  return (
    <div className="max-w-2xl animate-fade-in">
      <PageHeader title="Settings" description="Manage your profile and account." />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>This information is shown across your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProfile.mutate({ full_name: fullName.trim(), headline: headline.trim() || null, timezone });
              }}
              className="flex flex-col gap-4"
            >
              <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <Input label="Headline" placeholder="e.g. Aspiring Data Scientist" value={headline} onChange={(e) => setHeadline(e.target.value)} />
              <Input label="Email" value={user?.email ?? ''} disabled hint="Contact support to change your email." />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="timezone" className="text-sm font-medium text-ink-700">
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="self-start" isLoading={updateProfile.isPending}>
                Save changes
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" leftIcon={<LogOut className="h-4 w-4" />} onClick={() => signOut()}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
