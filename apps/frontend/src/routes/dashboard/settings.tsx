import { createFileRoute } from '@tanstack/react-router';
import { DashboardSettingsPage } from '@/features/dashboard/pages/dashboard-settings-page';
import { requireAuth } from '@/features/auth/route-guards';

export const Route = createFileRoute('/dashboard/settings')({
  beforeLoad: requireAuth,
  component: DashboardSettingsPage,
});
