import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Monitor, RefreshCw, Smartphone, Trash2 } from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/services/auth-service';
import type { UserLoginSession } from '@org/shared-contracts';

export function DashboardSettingsPage() {
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => authService.getSessions(),
  });
  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => authService.revokeSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] }),
  });
  const sessions = sessionsQuery.data?.sessions ?? [];

  return (
    <main className="min-h-screen bg-muted/40">
      <SimpleHeader />

      <section className="mx-auto w-full max-w-4xl px-6 py-16">
        <p className="mb-3 text-sm font-extrabold uppercase text-primary">Dashboard</p>
        <h1 className="text-3xl font-extrabold text-foreground">Settings</h1>

        <Card className="mt-8">
          <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Login sessions</CardTitle>
              <CardDescription>Devices that can currently access your account.</CardDescription>
            </div>
            <Button
              aria-label="Refresh sessions"
              disabled={sessionsQuery.isFetching}
              onClick={() => sessionsQuery.refetch()}
              size="icon-sm"
              title="Refresh sessions"
              type="button"
              variant="outline"
            >
              <RefreshCw className={sessionsQuery.isFetching ? 'animate-spin' : undefined} />
            </Button>
          </CardHeader>
          <CardContent>
            {sessionsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading sessions...</p>
            ) : sessionsQuery.isError ? (
              <p className="text-sm font-medium text-destructive">Could not load login sessions.</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active sessions found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="border-b pb-3 font-medium">Device</th>
                      <th className="border-b pb-3 font-medium">IP address</th>
                      <th className="border-b pb-3 font-medium">Last seen</th>
                      <th className="border-b pb-3 font-medium">Expires</th>
                      <th className="border-b pb-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <SessionRow
                        key={session.id}
                        isRevoking={
                          revokeMutation.isPending && revokeMutation.variables === session.id
                        }
                        onRevoke={() => revokeMutation.mutate(session.id)}
                        session={session}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 flex items-center gap-3">
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

type SessionRowProps = {
  session: UserLoginSession;
  isRevoking: boolean;
  onRevoke: () => void;
};

function SessionRow({ session, isRevoking, onRevoke }: SessionRowProps) {
  const Icon = session.deviceType === 'Mobile' ? Smartphone : Monitor;

  return (
    <tr className="border-b last:border-b-0">
      <td className="border-b py-4 pr-4 last:border-b-0">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{sessionName(session)}</p>
              {session.isCurrent && (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  Current
                </span>
              )}
            </div>
            <p className="mt-1 max-w-sm truncate text-xs text-muted-foreground">
              {session.userAgent ?? 'Unknown user agent'}
            </p>
          </div>
        </div>
      </td>
      <td className="border-b py-4 pr-4 text-muted-foreground">{session.ipAddress ?? 'Unknown'}</td>
      <td className="border-b py-4 pr-4 text-muted-foreground">{formatDate(session.lastSeenAt)}</td>
      <td className="border-b py-4 pr-4 text-muted-foreground">{formatDate(session.expiresAt)}</td>
      <td className="border-b py-4 text-right">
        <Button
          aria-label="Revoke session"
          disabled={session.isCurrent || isRevoking}
          onClick={onRevoke}
          size="icon-sm"
          title={session.isCurrent ? 'Use logout for the current session' : 'Revoke session'}
          type="button"
          variant="outline"
        >
          <Trash2 />
        </Button>
      </td>
    </tr>
  );
}

function sessionName(session: UserLoginSession): string {
  const parts = [session.browserName, session.osName].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' on ');
  }
  return session.deviceType ?? 'Unknown device';
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Never';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
