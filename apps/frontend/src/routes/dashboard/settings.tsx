import { createFileRoute } from '@tanstack/react-router';
import { DashboardSettingsPage } from '@/features/dashboard/pages/dashboard-settings-page';

export const Route = createFileRoute('/dashboard/settings')({
  component: DashboardSettingsPage,
});
