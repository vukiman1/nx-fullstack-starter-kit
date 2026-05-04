import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page';
import { requireAuth } from '@/features/auth/route-guards';

export const Route = createFileRoute('/dashboard/')({
  beforeLoad: requireAuth,
  component: DashboardPage,
});
