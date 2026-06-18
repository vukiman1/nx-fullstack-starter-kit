import { Suspense, lazy } from 'react';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { ErrorPage } from '@/features/error/error-page';
import { NotFoundPage } from '@/features/error/not-found-page';

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

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootRoute,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
});

function RootRoute() {
  return (
    <>
      <Outlet />
      <Suspense>
        <QueryDevtools />
      </Suspense>
    </>
  );
}
