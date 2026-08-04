import { createFileRoute, redirect } from '@tanstack/react-router';

// Registration moved into a modal driven by the `auth` search param; kept as a bridge for old links.
export const Route = createFileRoute('/(auth)/register')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { auth: 'register' } });
  },
});
