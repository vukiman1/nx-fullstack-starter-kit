import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { DashboardPage } from './dashboard-page';
import { httpRequest } from '@/lib/http-request';

jest.mock('@/lib/http-request', () => ({
  httpRequest: { get: jest.fn() },
}));

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const rootRoute = createRootRoute();
  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: DashboardPage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([dashboardRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.mocked(httpRequest.get).mockReset();
  });

  it('renders the credit balance fetched via useQuery', async () => {
    jest.mocked(httpRequest.get).mockResolvedValue({ balance: 250 });

    const { findByText } = renderDashboard();

    expect(await findByText('250')).toBeTruthy();
  });
});
