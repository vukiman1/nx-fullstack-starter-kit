import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { VerifyEmailPage } from '@/features/auth/verify-email-page';

export const Route = createFileRoute('/(auth)/verify-email')({
  validateSearch: z.object({ token: z.string().optional() }),
  component: VerifyEmailPage,
});
