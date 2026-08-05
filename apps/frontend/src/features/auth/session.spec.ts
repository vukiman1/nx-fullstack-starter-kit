import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { endSession, startSession } from './session';

const USER_A = { email: 'a@example.com' } as never;
const USER_B = { email: 'b@example.com' } as never;

function cachedEmail(): unknown {
  return queryClient.getQueryData(['auth', 'me']);
}

describe('session', () => {
  beforeEach(() => {
    queryClient.clear();
    useAuthStore.getState().clearUser();
  });

  it('drops the previous account data when someone else signs in', () => {
    startSession(USER_A);
    queryClient.setQueryData(['auth', 'me'], { user: USER_A });

    startSession(USER_B);

    expect(cachedEmail()).toBeUndefined();
    expect(useAuthStore.getState().user).toBe(USER_B);
  });

  it('drops the account data on sign out', () => {
    startSession(USER_A);
    queryClient.setQueryData(['auth', 'me'], { user: USER_A });

    endSession();

    expect(cachedEmail()).toBeUndefined();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('leaves nothing behind for an unrelated query either', () => {
    startSession(USER_A);
    queryClient.setQueryData(['auth', 'sessions'], { sessions: [] });

    endSession();

    expect(queryClient.getQueryData(['auth', 'sessions'])).toBeUndefined();
  });
});
