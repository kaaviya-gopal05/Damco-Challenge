import type { InterviewCategory, VideoCategory } from '@/types/database';

export const INTERVIEW_CATEGORIES: { id: InterviewCategory; label: string }[] = [
  { id: 'technical', label: 'Technical Questions' },
  { id: 'behavioral', label: 'Behavioral Questions' },
  { id: 'system_design', label: 'System Design' },
  { id: 'coding', label: 'Coding' },
  { id: 'resume', label: 'Resume Preparation' },
  { id: 'hr', label: 'HR Preparation' },
];

export const VIDEO_CATEGORIES: { id: VideoCategory; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'interview_prep', label: 'Interview Preparation' },
  { id: 'project_tutorial', label: 'Project Tutorials' },
];

export const NAV_ITEMS = [
  { to: '/app', label: 'Dashboard', icon: 'LayoutDashboard', end: true },
  { to: '/app/calendar', label: 'Calendar', icon: 'Calendar' },
  { to: '/app/spaces', label: 'Spaces', icon: 'MessageSquare' },
  { to: '/app/career', label: 'Career Intelligence', icon: 'Briefcase' },
  { to: '/app/memory', label: 'Memory', icon: 'Archive' },
] as const;
