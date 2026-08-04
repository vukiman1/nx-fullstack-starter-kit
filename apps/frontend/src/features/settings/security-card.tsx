import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/auth-service';

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not update the password.';
}

export function SecurityCard() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const meQuery = useQuery({ queryKey: ['auth', 'me'], queryFn: () => authService.getMe() });
  const user = meQuery.data?.user;

  const changeMutation = useMutation({
    mutationFn: () => authService.changePassword(form),
    onSuccess: async () => {
      setForm(EMPTY_FORM);
      setError(null);
      setNotice('Password updated. Other devices were signed out.');
      await queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
    onError: (mutationError: unknown) => {
      setNotice(null);
      setError(errorMessage(mutationError));
    },
  });

  const emailMutation = useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: () => {
      setError(null);
      setNotice('Check your inbox for the link.');
    },
    onError: (mutationError: unknown) => setError(errorMessage(mutationError)),
  });

  if (!user) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          {user.hasPassword
            ? 'Changing it signs out every other device.'
            : 'This account signs in with Google. Set a password to sign in without it.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <p
            className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
        {notice && <p className="mb-4 text-sm font-medium text-primary">{notice}</p>}

        {user.hasPassword ? (
          <form
            className="grid max-w-sm gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              changeMutation.mutate();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                autoComplete="current-password"
                id="currentPassword"
                onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
                type="password"
                value={form.currentPassword}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                autoComplete="new-password"
                id="newPassword"
                onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
                type="password"
                value={form.newPassword}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                autoComplete="new-password"
                id="confirmPassword"
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                type="password"
                value={form.confirmPassword}
              />
            </div>
            <Button disabled={changeMutation.isPending} type="submit">
              Change password
            </Button>
          </form>
        ) : (
          <Button
            disabled={emailMutation.isPending}
            onClick={() => emailMutation.mutate(user.email)}
            type="button"
          >
            Email me a link to set a password
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
