import { z } from 'zod';
import { FieldError } from '@/components/ui/field-error';
import { Form } from '@/components/ui/form';
import { FormError } from '@/components/ui/form-error';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { PasswordInput } from '@/components/ui/password-input';
import { useFormWithSubmitError } from '@/lib/use-form-with-submit-error';
import { notify } from '@/lib/toast';
import { authService } from '@/services/auth-service';
import { strongPassword } from './schemas';

const CODE_LENGTH = 6;

const fields = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the six-digit code.'),
  password: strongPassword,
  confirmPassword: z.string().min(1, 'Confirm your new password.'),
});

type ResetFormValues = z.infer<typeof fields>;

const schema = fields.refine((values) => values.password === values.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

/**
 * Code and new password on one screen. Splitting them would mean holding a verified code between
 * steps, which is a second thing to expire and get wrong.
 */
export function ChooseNewPassword({ email, onDone }: { email: string; onDone: () => void }) {
  const { form, submitError } = useFormWithSubmitError<ResetFormValues>({
    defaultValues: { code: '', password: '', confirmPassword: '' },
    schema,
    fallbackError: 'Could not reset your password.',
    onSubmit: async (values) => {
      await authService.resetPassword({ email, ...values });
      notify.success('Password updated. Every device was signed out.');
      onDone();
    },
  });

  return (
    <Form className="grid gap-4" onSubmit={form.handleSubmit}>
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
          <FormField
            autoComplete="new-password"
            control={PasswordInput}
            field={field}
            label="New password"
          />
        )}
      />

      <form.Field
        name="confirmPassword"
        validators={{ onBlur: fields.shape.confirmPassword }}
        children={(field) => (
          <FormField
            autoComplete="new-password"
            control={PasswordInput}
            field={field}
            label="Confirm new password"
          />
        )}
      />

      <SubmitButton form={form} label="Reset password" pendingLabel="Saving..." />
    </Form>
  );
}
