import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ApiError } from '@/lib/api-error';
import { notify } from '@/lib/toast';

const CODE_LENGTH = 6;

interface VerificationCodeFormProps {
  /** Shown above the boxes so the person knows which inbox to look in. */
  sentTo: string;
  submitLabel: string;
  onSubmit: (code: string) => Promise<void>;
  onResend?: () => Promise<string>;
}

export function VerificationCodeForm({
  sentTo,
  submitLabel,
  onSubmit,
  onResend,
}: VerificationCodeFormProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const submit = async (value: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(value);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not check that code.');
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resend = async () => {
    if (!onResend) {
      return;
    }
    setIsResending(true);
    setError(null);

    try {
      notify.info(await onResend());
      setCode('');
    } catch {
      setError('Could not send another code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(code);
      }}
    >
      <p className="text-center text-sm text-muted-foreground">
        Enter the {CODE_LENGTH}-digit code sent to{' '}
        <span className="font-medium text-foreground">{sentTo}</span>.
      </p>

      <FormError message={error} />

      <div className="flex justify-center">
        <InputOTP
          autoFocus
          aria-label="Verification code"
          disabled={isSubmitting}
          maxLength={CODE_LENGTH}
          onChange={(value) => {
            setCode(value);
            // Submitting on the last digit saves a click; people rarely stop to check the boxes.
            if (value.length === CODE_LENGTH) {
              void submit(value);
            }
          }}
          value={code}
        >
          <InputOTPGroup>
            {Array.from({ length: CODE_LENGTH }, (_, index) => (
              <InputOTPSlot index={index} key={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      <Button disabled={isSubmitting || code.length < CODE_LENGTH} type="submit">
        {isSubmitting ? 'Checking...' : submitLabel}
      </Button>

      {onResend && (
        <button
          className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline disabled:no-underline disabled:opacity-60"
          disabled={isResending}
          onClick={resend}
          type="button"
        >
          {isResending ? 'Sending...' : 'Send another code'}
        </button>
      )}
    </form>
  );
}
