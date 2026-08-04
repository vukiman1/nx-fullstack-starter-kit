import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileCard } from './profile-card';
import { authService } from '@/services/auth-service';

jest.mock('@/services/auth-service', () => ({
  authService: { getMe: jest.fn() },
}));

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileCard />
    </QueryClientProvider>,
  );
}

describe('ProfileCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the email and the avatar image when the account has one', async () => {
    jest.mocked(authService.getMe).mockResolvedValue({
      user: {
        email: 'jane@example.com',
        avatar: 'https://pic/a.png',
        isEmailVerified: true,
        hasPassword: true,
      },
    } as never);

    renderCard();

    expect(await screen.findByText('jane@example.com')).toBeTruthy();
    expect(screen.getByAltText('jane@example.com')).toBeTruthy();
  });

  it('falls back to the first letter of the email when there is no avatar', async () => {
    jest.mocked(authService.getMe).mockResolvedValue({
      user: { email: 'jane@example.com', avatar: null, isEmailVerified: true, hasPassword: true },
    } as never);

    renderCard();

    expect(await screen.findByText('J')).toBeTruthy();
    expect(screen.queryByAltText('jane@example.com')).toBeNull();
  });

  it('says no password is set for a Google account', async () => {
    jest.mocked(authService.getMe).mockResolvedValue({
      user: { email: 'g@example.com', avatar: null, isEmailVerified: true, hasPassword: false },
    } as never);

    renderCard();

    expect(await screen.findByText('No password set')).toBeTruthy();
  });

  it('flags an unverified email', async () => {
    jest.mocked(authService.getMe).mockResolvedValue({
      user: { email: 'a@b.c', avatar: null, isEmailVerified: false, hasPassword: true },
    } as never);

    renderCard();

    expect(await screen.findByText('Email not verified')).toBeTruthy();
  });
});
