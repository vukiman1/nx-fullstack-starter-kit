import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-error';
import { notify } from '@/lib/toast';
import { authService } from '@/services/auth-service';
import { registerFieldSchemas, registerSchema, type RegisterFormValues } from './schemas';
import { useAuthModal } from './use-auth-modal';

const EMPTY_FORM: RegisterFormValues = { email: '', password: '', confirmPassword: '' };

export function RegisterForm() {
  const { open } = useAuthModal();
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
    return <CheckInbox email={registeredEmail} onBackToSignIn={() => open('login')} />;
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
            <Input
              aria-invalid={field.state.meta.errors.length > 0}
              autoComplete="new-password"
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              type="password"
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
            <Input
              aria-invalid={field.state.meta.errors.length > 0}
              autoComplete="new-password"
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              type="password"
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

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button
          className="font-semibold text-primary underline-offset-4 hover:underline"
          onClick={() => open('login')}
          type="button"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}

function CheckInbox({ email, onBackToSignIn }: { email: string; onBackToSignIn: () => void }) {
  const [isResending, setIsResending] = useState(false);

  const resend = async () => {
    setIsResending(true);
    try {
      const { message } = await authService.resendVerification(email);
      notify.success(message);
    } catch {
      notify.error('Could not resend the email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="grid gap-4 text-center">
      <p className="text-sm text-muted-foreground">
        We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
        Follow it to finish setting up your account.
      </p>

      <Button disabled={isResending} onClick={resend} type="button" variant="outline">
        {isResending ? 'Sending...' : 'Resend the email'}
      </Button>

      <button
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        onClick={onBackToSignIn}
        type="button"
      >
        Back to sign in
      </button>
    </div>
  );
}
