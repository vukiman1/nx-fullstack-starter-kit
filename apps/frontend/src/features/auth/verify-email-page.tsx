import { useCallback } from 'react';
import { useSearch } from '@tanstack/react-router';
import { authService } from '@/services/auth-service';
import { TokenLandingPage } from './token-landing-page';

export function VerifyEmailPage() {
  const { token } = useSearch({ from: '/(auth)/verify-email' });
  const spend = useCallback((value: string) => authService.verifyEmail(value), []);

  return (
    <TokenLandingPage
      fallbackError="Could not verify this email address."
      headings={{ pending: 'Verifying your email', done: 'Email verified' }}
      spend={spend}
      token={token}
    />
  );
}
