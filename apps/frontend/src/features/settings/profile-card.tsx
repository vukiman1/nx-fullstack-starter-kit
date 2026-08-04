import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/services/auth-service';

export function ProfileCard() {
  const meQuery = useQuery({ queryKey: ['auth', 'me'], queryFn: () => authService.getMe() });
  const user = meQuery.data?.user;

  if (meQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">Loading profile...</CardContent>
      </Card>
    );
  }

  if (meQuery.isError || !user) {
    return (
      <Card>
        <CardContent className="py-6 text-sm font-medium text-destructive">
          Could not load your profile.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>How this account signs in.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        {user.avatar ? (
          <img alt={user.email} className="size-14 rounded-full object-cover" src={user.avatar} />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-lg font-extrabold text-muted-foreground">
            {user.email.charAt(0).toUpperCase()}
          </span>
        )}

        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
              {user.hasPassword ? 'Password sign-in enabled' : 'No password set'}
            </span>
            <span
              className={
                user.isEmailVerified
                  ? 'rounded-md bg-primary/10 px-2 py-0.5 text-primary'
                  : 'rounded-md bg-destructive/10 px-2 py-0.5 text-destructive'
              }
            >
              {user.isEmailVerified ? 'Email verified' : 'Email not verified'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
