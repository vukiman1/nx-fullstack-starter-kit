import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { appConfig } from '@/config/app-config';
import { authService } from '@/services/auth-service';
import { userQueries } from '@/services/user-service';
import { selectIsInitializing, selectUser, useAuthStore } from '@/stores/auth-store';

function CreditBadge() {
  const { data: credit, isError } = useQuery(userQueries.credit());

  return (
    <span
      className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary"
      aria-label="Account balance"
    >
      {isError ? '— credit unavailable' : credit ? `Balance: ${credit.balance}` : 'Loading...'}
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
      <a className="text-base font-extrabold text-foreground no-underline" href="/">
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
            <span className="text-sm text-muted-foreground" aria-label="Signed-in email">
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
