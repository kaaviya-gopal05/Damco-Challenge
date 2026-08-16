import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRecentActivity } from '@/services/activity.service';
import type { ActivityType, LearningActivity } from '@/types/database';

const ROUTE_BY_TYPE: Partial<Record<ActivityType, string>> = {
  roadmap_created: '/app/spaces',
  mind_map_created: '/app/spaces',
  flashcard_deck_created: '/app/spaces',
  document_uploaded: '/app/spaces',
  resume_analyzed: '/app/spaces',
};

function describeActivity(activity: LearningActivity): string {
  const meta = activity.metadata as Record<string, unknown>;
  switch (activity.activity_type) {
    case 'roadmap_created':
      return `Roadmap ready: ${typeof meta.goal === 'string' ? meta.goal : 'your new roadmap'}`;
    case 'mind_map_created':
      return `Mind map created: ${typeof meta.title === 'string' ? meta.title : typeof meta.topic === 'string' ? meta.topic : 'your new mind map'}`;
    case 'flashcard_deck_created':
      return `Flashcard deck ready: ${typeof meta.title === 'string' ? meta.title : 'your new deck'}`;
    case 'document_uploaded':
      return 'A PDF finished processing';
    case 'resume_analyzed':
      return 'Your resume analysis is ready';
    default:
      return 'Something new is ready';
  }
}

function lastSeenKey(userId: string) {
  return `notifications_last_seen_${userId}`;
}

export interface AppNotification {
  id: string;
  message: string;
  route: string;
  occurredAt: string;
  isNew: boolean;
}

export function useNotifications() {
  const { user } = useAuth();
  const location = useLocation();
  const [lastSeen, setLastSeen] = useState<string | null>(() =>
    user ? localStorage.getItem(lastSeenKey(user.id)) : null
  );

  const { data: activity } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => getRecentActivity(user!.id, 20),
    enabled: !!user,
    refetchInterval: 20000,
  });

  const notifications: AppNotification[] = useMemo(() => {
    return (activity ?? [])
      .filter((a) => ROUTE_BY_TYPE[a.activity_type] && ROUTE_BY_TYPE[a.activity_type] !== location.pathname)
      .map((a) => ({
        id: a.id,
        message: describeActivity(a),
        route: ROUTE_BY_TYPE[a.activity_type]!,
        occurredAt: a.occurred_at,
        isNew: !lastSeen || new Date(a.occurred_at) > new Date(lastSeen),
      }));
  }, [activity, location.pathname, lastSeen]);

  const unseenCount = notifications.filter((n) => n.isNew).length;

  const markAllSeen = useCallback(() => {
    if (!user) return;
    const now = new Date().toISOString();
    localStorage.setItem(lastSeenKey(user.id), now);
    setLastSeen(now);
  }, [user]);

  return { notifications, unseenCount, markAllSeen };
}
