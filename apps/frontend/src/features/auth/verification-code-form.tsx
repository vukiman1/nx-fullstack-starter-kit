import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FormError } from '@/components/ui/form-error';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { TextLink } from '@/components/ui/text-link';
import { errorMessage } from '@/lib/api-error';
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
      setError(errorMessage(caught, 'Could not check that code.'));
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
    <Form className="grid gap-4" onSubmit={() => void submit(code)}>
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
        <TextLink className="text-center" disabled={isResending} onClick={resend} tone="muted">
          {isResending ? 'Sending...' : 'Send another code'}
        </TextLink>
      )}
    </Form>
  );
}
