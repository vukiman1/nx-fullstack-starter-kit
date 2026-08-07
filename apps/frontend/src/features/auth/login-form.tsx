import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Form } from '@/components/ui/form';
import { FormError } from '@/components/ui/form-error';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';
import { PasswordInput } from '@/components/ui/password-input';
import { TextLink } from '@/components/ui/text-link';
import { useFormWithSubmitError } from '@/lib/use-form-with-submit-error';
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
  const [challengeToken, setChallengeToken] = useState<string | null>(null);

  const { form, submitError } = useFormWithSubmitError<LoginFormValues>({
    defaultValues: { email: 'user@example.com', password: 'Local1234', rememberMe: false },
    schema: loginSchema,
    fallbackError: 'Could not reach the server. Please try again.',
    onSubmit: async (values) => {
      const result = await authService.login(values);
      if ('twoFactorRequired' in result) {
        setChallengeToken(result.challengeToken);
        return;
      }
      startSession(result.user);
      notify.success('Signed in.');
      await finish();
    },
  });

  if (challengeToken) {
    return (
      <TwoFactorStep challengeToken={challengeToken} onExpired={() => setChallengeToken(null)} />
    );
  }

  return (
    <Form className="grid gap-5" onSubmit={form.handleSubmit}>
      <div className="grid gap-5">
        <FormError message={submitError} />

        <form.Field
          name="email"
          validators={{
            onBlur: loginSchema.shape.email,
            onSubmit: loginSchema.shape.email,
          }}
          children={(field) => (
            <FormField
              autoComplete="email"
              field={field}
              label="Email"
              placeholder="you@example.com"
              type="email"
            />
          )}
        />

        <form.Field
          name="password"
          validators={{
            onBlur: loginSchema.shape.password,
            onSubmit: loginSchema.shape.password,
          }}
          children={(field) => (
            <FormField
              autoComplete="current-password"
              control={PasswordInput}
              field={field}
              label="Password"
              placeholder="Enter your password"
            />
          )}
        />

        <div className="flex items-center justify-between gap-3">
          <form.Field
            name="rememberMe"
            children={(field) => (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={field.state.value}
                  name={field.name}
                  onChange={(event) => field.handleChange(event.target.checked)}
                />
                Remember me
              </label>
            )}
          />

          <TextLink className="text-sm" onClick={onForgotPassword}>
            Forgot password?
          </TextLink>
        </div>
      </div>

      <div className="grid gap-4">
        <SubmitButton form={form} label="Sign in" pendingLabel="Signing in..." />
      </div>
    </Form>
  );
}
