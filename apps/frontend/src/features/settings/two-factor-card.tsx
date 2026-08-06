import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { notify } from '@/lib/toast';
import { authService } from '@/services/auth-service';
import { DisableTwoFactorDialog } from './disable-two-factor-dialog';
import { RecoveryCodesDialog } from './recovery-codes-dialog';
import { TwoFactorSetupDialog } from './two-factor-setup-dialog';

const TWO_FACTOR_QUERY_KEY = ['auth', '2fa'];

export function TwoFactorCard() {
  const queryClient = useQueryClient();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: TWO_FACTOR_QUERY_KEY,
    queryFn: () => authService.getTwoFactorStatus(),
  });

  const meQuery = useQuery({ queryKey: ['auth', 'me'], queryFn: () => authService.getMe() });
  const hasPassword = meQuery.data?.user.hasPassword ?? true;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: TWO_FACTOR_QUERY_KEY });

  const disableMutation = useMutation({
    mutationFn: (password: string) => authService.disableTwoFactor(password),
    onSuccess: async () => {
      setIsDisabling(false);
      setDisableError(null);
      notify.success('Two-factor authentication turned off.');
      await invalidate();
    },
    onError: () => setDisableError('That password is not correct.'),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => authService.regenerateRecoveryCodes(),
    onSuccess: async ({ recoveryCodes }) => {
      setFreshCodes(recoveryCodes);
      await invalidate();
    },
    onError: () => notify.error('Could not generate new recovery codes.'),
  });

  const status = statusQuery.data;

  if (statusQuery.isError) {
    return (
      <Card>
        <CardContent className="py-6 text-sm font-medium text-destructive" role="alert">
          Could not load two-factor settings.
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>
          {status.enabled
            ? 'A code from your authenticator app is required to sign in.'
            : 'Add a second step at sign-in using an authenticator app.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {status.enabled ? (
          <>
            <p className="text-sm text-muted-foreground">
              {status.unusedRecoveryCodes} recovery{' '}
              {status.unusedRecoveryCodes === 1 ? 'code' : 'codes'} left.
              {status.unusedRecoveryCodes <= 2 && ' Generate a new set before you run out.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={regenerateMutation.isPending}
                onClick={() => regenerateMutation.mutate()}
                type="button"
                variant="outline"
              >
                Generate new recovery codes
              </Button>
              <Button
                disabled={disableMutation.isPending}
                onClick={() => setIsDisabling(true)}
                type="button"
                variant="ghost"
              >
                Turn off
              </Button>
            </div>
          </>
        ) : (
          <div className="grid gap-3">
            {!hasPassword && (
              <p className="text-sm text-muted-foreground">
                Set a password first — it is what you would use to turn this off again.
              </p>
            )}
            <div>
              <Button disabled={!hasPassword} onClick={() => setIsSettingUp(true)} type="button">
                Set up two-factor authentication
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <TwoFactorSetupDialog
        onEnabled={async (codes) => {
          setIsSettingUp(false);
          setFreshCodes(codes);
          await invalidate();
        }}
        onOpenChange={setIsSettingUp}
        open={isSettingUp}
      />

      <DisableTwoFactorDialog
        error={disableError}
        isPending={disableMutation.isPending}
        onConfirm={(password) => disableMutation.mutate(password)}
        onOpenChange={(open) => {
          setIsDisabling(open);
          if (!open) {
            setDisableError(null);
          }
        }}
        open={isDisabling}
      />

      <RecoveryCodesDialog codes={freshCodes} onClose={() => setFreshCodes(null)} />
    </Card>
  );
}
