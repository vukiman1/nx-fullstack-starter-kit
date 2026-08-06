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
import { startSession } from './session';
import { TwoFactorStep } from './two-factor-step';
import { loginSchema, type LoginFormValues } from './schemas';
import { useAuthModal } from './use-auth-modal';

interface LoginFormProps {
  onForgotPassword: () => void;
}

export function LoginForm({ onForgotPassword }: LoginFormProps) {
  const { finish } = useAuthModal();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: 'user@example.com',
      password: 'Local1234',
      rememberMe: false,
    } as LoginFormValues,
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        const result = await authService.login(value);
        if ('twoFactorRequired' in result) {
          setChallengeToken(result.challengeToken);
          return;
        }
        startSession(result.user);
        notify.success('Signed in.');
        await finish();
      } catch (error) {
        if (error instanceof ApiError) {
          setSubmitError(error.message);
        } else {
          setSubmitError('Could not reach the server. Please try again.');
        }
      }
    },
  });

  if (challengeToken) {
    return (
      <TwoFactorStep challengeToken={challengeToken} onExpired={() => setChallengeToken(null)} />
    );
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="grid gap-5">
        <FormError message={submitError} />

        <form.Field
          name="email"
          validators={{
            onBlur: loginSchema.shape.email,
            onSubmit: loginSchema.shape.email,
          }}
          children={(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Email</Label>
              <Input
                autoComplete="email"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="you@example.com"
                aria-describedby={`${field.name}-error`}
                aria-invalid={field.state.meta.errors.length > 0}
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
            onBlur: loginSchema.shape.password,
            onSubmit: loginSchema.shape.password,
          }}
          children={(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Password</Label>
              <PasswordInput
                aria-describedby={`${field.name}-error`}
                aria-invalid={field.state.meta.errors.length > 0}
                autoComplete="current-password"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Enter your password"
                value={field.state.value}
              />
              <FieldError errors={field.state.meta.errors} id={`${field.name}-error`} />
            </div>
          )}
        />

        <div className="flex items-center justify-between gap-3">
          <form.Field
            name="rememberMe"
            children={(field) => (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  checked={field.state.value}
                  className="h-4 w-4 rounded border-input"
                  name={field.name}
                  onChange={(event) => field.handleChange(event.target.checked)}
                  type="checkbox"
                />
                Remember me
              </label>
            )}
          />

          <button
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={onForgotPassword}
            type="button"
          >
            Forgot password?
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button disabled={!canSubmit} type="submit">
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          )}
        />
      </div>
    </form>
  );
}
