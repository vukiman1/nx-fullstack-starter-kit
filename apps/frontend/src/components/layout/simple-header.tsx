import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { appConfig } from '@/config/app-config';
import { authService } from '@/services/auth-service';
import { userService } from '@/services/user-service';
import type { UserCredit } from '@org/shared-contracts';
import {
  selectIsInitializing,
  selectUser,
  useAuthStore,
} from '@/stores/auth-store';

function CreditBadge() {
  const [credit, setCredit] = useState<UserCredit | null>(null);
  const [creditError, setCreditError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    userService
      .getCredit()
      .then((result) => {
        if (!cancelled) setCredit(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : 'Failed to load credit';
        setCreditError(message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span
      className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary"
      aria-label="Account balance"
    >
      {creditError
        ? '— credit unavailable'
        : credit
          ? `Balance: ${credit.balance}`
          : 'Loading...'}
    </span>
  );
}

export function SimpleHeader() {
  const navigate = useNavigate();
  const user = useAuthStore(selectUser);
  const isInitializing = useAuthStore(selectIsInitializing);
  const clearUser = useAuthStore((state) => state.clearUser);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      clearUser();
      await navigate({ to: '/' });
    }
  };

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
      <a
        className="text-base font-extrabold text-foreground no-underline"
        href="/"
      >
        {appConfig.app.name}
      </a>

      <nav
        className="inline-flex min-h-9 items-center gap-3"
        aria-label="Primary"
        aria-busy={isInitializing}
      >
        {isInitializing ? (
          <span className="text-sm text-muted-foreground" role="status">
            Loading session...
          </span>
        ) : user ? (
          <>
            <span
              className="text-sm text-muted-foreground"
              aria-label="Signed-in email"
            >
              {user.email}
            </span>
            <CreditBadge key={user.email} />
            <Button onClick={handleLogout} variant="ghost">
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button asChild variant="ghost">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Register</Link>
            </Button>
          </>
        )}
      </nav>
    </header>
  );
}
