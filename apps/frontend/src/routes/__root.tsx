import { Outlet, createRootRoute } from '@tanstack/react-router';
import { ErrorPage } from '@/features/error/error-page';
import { NotFoundPage } from '@/features/error/not-found-page';

export const Route = createRootRoute({
  component: RootRoute,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
});

function RootRoute() {
  return <Outlet />;
}
