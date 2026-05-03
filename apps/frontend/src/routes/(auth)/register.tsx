import { createFileRoute } from '@tanstack/react-router';
import { RegisterPage } from '@/features/auth/pages/register-page';

export const Route = createFileRoute('/(auth)/register')({
  component: RegisterPage,
});
