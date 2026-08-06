import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { TwoFactorRecoveryPage } from '@/features/auth/two-factor-recovery-page';

export const Route = createFileRoute('/(auth)/two-factor-recovery')({
  validateSearch: z.object({ token: z.string().optional() }),
  component: TwoFactorRecoveryPage,
});
