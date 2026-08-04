import { Suspense, lazy } from 'react';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ErrorPage } from '@/features/error/error-page';
import { NotFoundPage } from '@/features/error/not-found-page';
import { AuthModal } from '@/features/auth/auth-modal';
import { GoogleOneTap } from '@/features/auth/google-one-tap';

export interface RouterContext {
  queryClient: QueryClient;
}

const QueryDevtools =
  process.env.NODE_ENV === 'development'
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((module) => ({
          default: module.ReactQueryDevtools,
        })),
      )
    : () => null;

// Declared on the root so the auth modal can open over any page, whatever route the user is on.
const rootSearchSchema = z.object({
  auth: z.enum(['login', 'register']).optional(),
  redirect: z.string().optional(),
});

export type RootSearch = z.infer<typeof rootSearchSchema>;

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootRoute,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
  validateSearch: rootSearchSchema,
});

function RootRoute() {
  return (
    <>
      <GoogleOneTap />
      <AuthModal />
      <Outlet />
      <Suspense>
        <QueryDevtools />
      </Suspense>
    </>
  );
}
