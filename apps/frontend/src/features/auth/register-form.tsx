import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-error';
import { notify } from '@/lib/toast';
import { authService } from '@/services/auth-service';
import { registerFieldSchemas, registerSchema, type RegisterFormValues } from './schemas';
import { VerificationCodeForm } from './verification-code-form';

const EMPTY_FORM: RegisterFormValues = {
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

interface RegisterFormProps {
  onVerified: () => void;
}

export function RegisterForm({ onVerified }: RegisterFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const form = useForm({
    defaultValues: EMPTY_FORM,
    validators: { onSubmit: registerSchema },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        const { email } = await authService.register(value);
        setRegisteredEmail(email);
      } catch (caught) {
        setSubmitError(
          caught instanceof ApiError ? caught.message : 'Could not create your account.',
        );
      }
    },
  });

  if (registeredEmail) {
    return (
      <VerificationCodeForm
        onResend={async () => (await authService.resendVerification(registeredEmail)).message}
        onSubmit={async (code) => {
          await authService.verifyEmail(registeredEmail, code);
          notify.success('Email confirmed. You can sign in now.');
          onVerified();
        }}
        sentTo={registeredEmail}
        submitLabel="Confirm email"
      />
    );
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
        name="displayName"
        validators={{
          onBlur: registerFieldSchemas.displayName,
          onSubmit: registerFieldSchemas.displayName,
        }}
        children={(field) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>Your name</Label>
            <Input
              aria-invalid={field.state.meta.errors.length > 0}
              autoComplete="name"
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Jane Doe"
              value={field.state.value}
            />
            <FieldError errors={field.state.meta.errors} id={`${field.name}-error`} />
          </div>
        )}
      />

      <form.Field
        name="email"
        validators={{
          onBlur: registerFieldSchemas.email,
          onSubmit: registerFieldSchemas.email,
        }}
        children={(field) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>Email</Label>
            <Input
              aria-invalid={field.state.meta.errors.length > 0}
              autoComplete="email"
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

      <form.Field
        name="password"
        validators={{
          onBlur: registerFieldSchemas.password,
          onSubmit: registerFieldSchemas.password,
        }}
        children={(field) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>Password</Label>
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
        validators={{
          onBlur: registerFieldSchemas.confirmPassword,
          onSubmit: registerFieldSchemas.confirmPassword,
        }}
        children={(field) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>Confirm password</Label>
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
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        )}
      />
    </form>
  );
}
