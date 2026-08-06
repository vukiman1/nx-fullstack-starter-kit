import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-error';
import { authService } from '@/services/auth-service';
import { ChooseNewPassword } from './choose-new-password';

const emailSchema = z.email('Enter a valid email address.');

interface ForgotPasswordFormProps {
  onDone: () => void;
}

export function ForgotPasswordForm({ onDone }: ForgotPasswordFormProps) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: '' },
    validators: { onSubmit: z.object({ email: emailSchema }) },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        await authService.forgotPassword(value.email);
        setSentTo(value.email);
      } catch (caught) {
        setSubmitError(caught instanceof ApiError ? caught.message : 'Could not send the email.');
      }
    },
  });

  if (sentTo) {
    return <ChooseNewPassword email={sentTo} onDone={onDone} />;
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <FormError message={submitError} />

      <form.Field
        name="email"
        validators={{ onBlur: emailSchema, onSubmit: emailSchema }}
        children={(field) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>Email address</Label>
            <Input
              aria-invalid={field.state.meta.errors.length > 0}
              autoComplete="email"
              autoFocus
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="you@example.com"
              type="email"
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
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </Button>
        )}
      />
    </form>
  );
}
