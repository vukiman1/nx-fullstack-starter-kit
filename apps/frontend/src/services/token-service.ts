const ACCESS_TOKEN_KEY = 'access_token';

export const tokenService = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  setAccessToken(token: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  clearAccessToken(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  },
};

export default tokenService;
