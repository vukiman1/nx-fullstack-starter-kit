import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { FormError } from '@/components/ui/form-error';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { ApiError } from '@/lib/api-error';
import { notify } from '@/lib/toast';
import { authService } from '@/services/auth-service';
import { strongPassword } from './schemas';

const CODE_LENGTH = 6;

const fields = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the six-digit code.'),
  password: strongPassword,
  confirmPassword: z.string().min(1, 'Confirm your new password.'),
});

const schema = fields.refine((values) => values.password === values.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

/**
 * Code and new password on one screen. Splitting them would mean holding a verified code between
 * steps, which is a second thing to expire and get wrong.
 */
export function ChooseNewPassword({ email, onDone }: { email: string; onDone: () => void }) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { code: '', password: '', confirmPassword: '' },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        await authService.resetPassword({ email, ...value });
        notify.success('Password updated. Every device was signed out.');
        onDone();
      } catch (caught) {
        setSubmitError(
          caught instanceof ApiError ? caught.message : 'Could not reset your password.',
        );
      }
    },
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <p className="text-center text-sm text-muted-foreground">
        Enter the code sent to <span className="font-medium text-foreground">{email}</span> and pick
        a new password.
      </p>

      <FormError message={submitError} />

      <form.Field
        name="code"
        validators={{ onSubmit: fields.shape.code }}
        children={(field) => (
          <div className="grid gap-2">
            <div className="flex justify-center">
              <InputOTP
                aria-label="Verification code"
                autoFocus
                maxLength={CODE_LENGTH}
                onChange={field.handleChange}
                value={field.state.value}
              >
                <InputOTPGroup>
                  {Array.from({ length: CODE_LENGTH }, (_, index) => (
                    <InputOTPSlot index={index} key={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <FieldError errors={field.state.meta.errors} id={`${field.name}-error`} />
          </div>
        )}
      />

      <form.Field
        name="password"
        validators={{ onBlur: fields.shape.password, onSubmit: fields.shape.password }}
        children={(field) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>New password</Label>
            <PasswordInput
              aria-invalid={field.state.meta.errors.length > 0}
              autoComplete="new-password"
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={field.state.value}
            />
            <FieldError errors={field.state.meta.errors} id={`${field.name}-error`} />
          </div>
        )}
      />

      <form.Field
        name="confirmPassword"
        validators={{ onBlur: fields.shape.confirmPassword }}
        children={(field) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>Confirm new password</Label>
            <PasswordInput
              aria-invalid={field.state.meta.errors.length > 0}
              autoComplete="new-password"
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={field.state.value}
            />
            <FieldError errors={field.state.meta.errors} id={`${field.name}-error`} />
          </div>
        )}
      />

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <Button disabled={!canSubmit} type="submit">
            {isSubmitting ? 'Saving...' : 'Reset password'}
          </Button>
        )}
      />
    </form>
  );
}
