import { createFileRoute } from '@tanstack/react-router';
import { RegisterPage } from '@/features/auth/pages/register-page';
import { requireAnonymous } from '@/features/auth/route-guards';

export const Route = createFileRoute('/(auth)/register')({
  beforeLoad: requireAnonymous,
  component: RegisterPage,
});
