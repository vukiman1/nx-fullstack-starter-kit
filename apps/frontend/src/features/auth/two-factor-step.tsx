import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-error';
import { notify } from '@/lib/toast';
import { authService } from '@/services/auth-service';
import { startSession } from './session';
import { useAuthModal } from './use-auth-modal';

const CHALLENGE_GONE = 410;

interface TwoFactorStepProps {
  challengeToken: string;
  onExpired: () => void;
}

export function TwoFactorStep({ challengeToken, onExpired }: TwoFactorStepProps) {
  const { finish } = useAuthModal();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await authService.verifyTwoFactor(challengeToken, code.trim());
      if (!('user' in result)) {
        throw new Error('Unexpected response');
      }
      startSession(result.user);
      notify.success('Signed in.');
      await finish();
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : 'Could not verify that code.';
      setError(message);
      // 410 means the challenge is gone, not that the code was wrong: the only way on is the
      // password step.
      if (caught instanceof ApiError && caught.statusCode === CHALLENGE_GONE) {
        onExpired();
      }
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestRecovery = async () => {
    setIsRecovering(true);
    setError(null);

    try {
      const { message } = await authService.requestTwoFactorRecovery(challengeToken);
      setRecoverySent(true);
      notify.info(message);
    } catch (caught) {
      if (caught instanceof ApiError && caught.statusCode === CHALLENGE_GONE) {
        onExpired();
        return;
      }
      setError(caught instanceof ApiError ? caught.message : 'Could not send the email.');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <p className="text-sm text-muted-foreground">
        Enter the six-digit code from your authenticator app, or one of your recovery codes.
      </p>

      <FormError message={error} />

      <div className="grid gap-2">
        <Label htmlFor="two-factor-code">Verification code</Label>
        <Input
          autoComplete="one-time-code"
          autoFocus
          id="two-factor-code"
          inputMode="numeric"
          onChange={(event) => setCode(event.target.value)}
          placeholder="123456"
          value={code}
        />
      </div>

      <Button disabled={isSubmitting || code.trim().length < 6} type="submit">
        {isSubmitting ? 'Verifying...' : 'Verify'}
      </Button>

      <div className="grid gap-2 text-center text-sm text-muted-foreground">
        <button
          className="underline-offset-4 hover:underline disabled:no-underline disabled:opacity-60"
          disabled={isRecovering || recoverySent}
          onClick={requestRecovery}
          type="button"
        >
          {recoverySent
            ? 'Check your inbox for the recovery link'
            : 'Lost your device and recovery codes?'}
        </button>
        <button className="underline-offset-4 hover:underline" onClick={onExpired} type="button">
          Back to sign in
        </button>
      </div>
    </form>
  );
}
