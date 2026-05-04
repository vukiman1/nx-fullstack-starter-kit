import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { LoginPage } from '@/features/auth/pages/login-page';
import { requireAnonymous } from '@/features/auth/route-guards';

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/(auth)/login')({
  beforeLoad: requireAnonymous,
  validateSearch: loginSearchSchema,
  component: LoginPage,
});
