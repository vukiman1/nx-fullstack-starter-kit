import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page';
import { requireAuth } from '@/features/auth/route-guards';
import { userQueries } from '@/services/user-service';

export const Route = createFileRoute('/dashboard/')({
  beforeLoad: requireAuth,
  loader: ({ context }) => context.queryClient.ensureQueryData(userQueries.credit()),
  component: DashboardPage,
});
