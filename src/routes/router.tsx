import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const CalendarPage = lazy(() => import('@/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const NewSpaceChatPage = lazy(() => import('@/pages/NewSpaceChatPage').then((m) => ({ default: m.NewSpaceChatPage })));
const SpaceDetailPage = lazy(() => import('@/pages/SpaceDetailPage').then((m) => ({ default: m.SpaceDetailPage })));
const MemoryPage = lazy(() => import('@/pages/MemoryPage').then((m) => ({ default: m.MemoryPage })));
const CareerPage = lazy(() => import('@/pages/CareerPage').then((m) => ({ default: m.CareerPage })));
const TaskListPage = lazy(() => import('@/pages/TaskListPage').then((m) => ({ default: m.TaskListPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

function PageFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
    </div>
  );
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Lazy><DashboardPage /></Lazy> },
      { path: 'calendar', element: <Lazy><CalendarPage /></Lazy> },
      { path: 'spaces', element: <Lazy><NewSpaceChatPage /></Lazy> },
      { path: 'spaces/:spaceId', element: <Lazy><SpaceDetailPage /></Lazy> },
      { path: 'memory', element: <Lazy><MemoryPage /></Lazy> },
      { path: 'career', element: <Lazy><CareerPage /></Lazy> },
      { path: 'tasks', element: <Lazy><TaskListPage /></Lazy> },
      { path: 'settings', element: <Lazy><SettingsPage /></Lazy> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
