import { useState } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-error';
import { authService } from '@/services/auth-service';
import { strongPassword } from '@/features/settings/schemas';

const fields = z.object({
  password: strongPassword,
  confirmPassword: z.string().min(1, 'Confirm your new password.'),
});

const resetPasswordSchema = fields.refine((v) => v.password === v.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export function ResetPasswordPage() {
  const { token } = useSearch({ from: '/(auth)/reset-password' });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const form = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    validators: { onSubmit: resetPasswordSchema },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        await authService.resetPassword({ token: token as string, ...value });
        setDone(true);
      } catch (caught) {
        setSubmitError(
          caught instanceof ApiError ? caught.message : 'Could not reset your password.',
        );
      }
    },
  });

  const signInLink = (
    <Button asChild>
      <Link search={{ auth: 'login' }} to="/">
        Go to sign in
      </Link>
    </Button>
  );

  if (!token) {
    return (
      <Shell title="Reset your password">
        <p className="text-base text-muted-foreground">This link is missing its token.</p>
        <div className="mt-8">{signInLink}</div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell title="Password updated">
        <p className="text-base text-muted-foreground">
          Every device has been signed out. Sign in with your new password.
        </p>
        <div className="mt-8">{signInLink}</div>
      </Shell>
    );
  }

  return (
    <Shell title="Reset your password">
      <form
        className="mt-6 grid gap-4 text-left"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          form.handleSubmit();
        }}
      >
        <FormError message={submitError} />

        <form.Field
          name="password"
          validators={{ onBlur: fields.shape.password }}
          children={(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>New password</Label>
              <Input
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
          validators={{ onBlur: fields.shape.confirmPassword }}
          children={(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Confirm new password</Label>
              <Input
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
              {isSubmitting ? 'Saving...' : 'Reset password'}
            </Button>
          )}
        />
      </form>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-6 py-10">
      <section className="mx-auto w-full max-w-sm text-center">
        <h1 className="text-3xl font-extrabold text-foreground">{title}</h1>
        {children}
      </section>
    </main>
  );
}
