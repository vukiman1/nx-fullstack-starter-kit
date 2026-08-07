import { useState } from 'react';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { FormError } from '@/components/ui/form-error';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';
import { useFormWithSubmitError } from '@/lib/use-form-with-submit-error';
import { authService } from '@/services/auth-service';
import { ChooseNewPassword } from './choose-new-password';

const emailSchema = z.email('Enter a valid email address.');

interface ForgotPasswordFormProps {
  onDone: () => void;
}

export function ForgotPasswordForm({ onDone }: ForgotPasswordFormProps) {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const { form, submitError } = useFormWithSubmitError({
    defaultValues: { email: '' },
    schema: z.object({ email: emailSchema }),
    fallbackError: 'Could not send the email.',
    onSubmit: async ({ email }) => {
      await authService.forgotPassword(email);
      setSentTo(email);
    },
  });

  if (sentTo) {
    return <ChooseNewPassword email={sentTo} onDone={onDone} />;
  }

  return (
    <Form className="grid gap-4" onSubmit={form.handleSubmit}>
      <FormError message={submitError} />

      <form.Field
        name="email"
        validators={{ onBlur: emailSchema, onSubmit: emailSchema }}
        children={(field) => (
          <FormField
            autoComplete="email"
            autoFocus
            field={field}
            label="Email address"
            placeholder="you@example.com"
            type="email"
          />
        )}
      />

      <SubmitButton form={form} label="Send reset link" pendingLabel="Sending..." />
    </Form>
  );
}
