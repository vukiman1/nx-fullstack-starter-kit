import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { notify } from '@/lib/toast';
import { authService } from '@/services/auth-service';
import { ChangePasswordDialog } from './change-password-dialog';

export function SecurityCard() {
  const [isChanging, setIsChanging] = useState(false);

  const meQuery = useQuery({ queryKey: ['auth', 'me'], queryFn: () => authService.getMe() });
  const user = meQuery.data?.user;

  const emailMutation = useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: () => notify.success('Check your inbox for the link.'),
    onError: () => notify.error('Could not send the email. Please try again.'),
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
        {user.hasPassword ? (
          <Button onClick={() => setIsChanging(true)} type="button">
            Change password
          </Button>
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

      <ChangePasswordDialog onOpenChange={setIsChanging} open={isChanging} />
    </Card>
  );
}
