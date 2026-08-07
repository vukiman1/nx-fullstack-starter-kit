import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextLink } from '@/components/ui/text-link';
import { ApiError, errorMessage } from '@/lib/api-error';
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

  const submit = async () => {
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
      const message = errorMessage(caught, 'Could not verify that code.');
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
      setError(errorMessage(caught, 'Could not send the email.'));
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <Form className="grid gap-4" onSubmit={() => void submit()}>
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
        <TextLink disabled={isRecovering || recoverySent} onClick={requestRecovery} tone="muted">
          {recoverySent
            ? 'Check your inbox for the recovery link'
            : 'Lost your device and recovery codes?'}
        </TextLink>
        <TextLink onClick={onExpired} tone="muted">
          Back to sign in
        </TextLink>
      </div>
    </Form>
  );
}
