import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

// Sign-in moved into a modal driven by the `auth` search param. This route stays as a bridge so
// links and bookmarks pointing at /login keep working.
export const Route = createFileRoute('/(auth)/login')({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/', search: { auth: 'login', redirect: search.redirect } });
  },
});
