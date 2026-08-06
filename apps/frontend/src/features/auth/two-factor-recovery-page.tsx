import { useCallback } from 'react';
import { useSearch } from '@tanstack/react-router';
import { authService } from '@/services/auth-service';
import { TokenLandingPage } from './token-landing-page';

export function TwoFactorRecoveryPage() {
  const { token } = useSearch({ from: '/(auth)/two-factor-recovery' });
  const spend = useCallback((value: string) => authService.confirmTwoFactorRecovery(value), []);

  return (
    <TokenLandingPage
      fallbackError="Could not complete recovery."
      headings={{ pending: 'Account recovery', done: 'Two-factor is off' }}
      spend={spend}
      token={token}
    />
  );
}
