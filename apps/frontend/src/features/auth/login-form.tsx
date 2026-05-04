import { useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-error';
import { authService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { isInternalPath } from './route-guards';
import { loginSchema, type LoginFormValues } from './schemas';

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return String(error);
}

export function LoginForm() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/(auth)/login' });
  const redirectTo = isInternalPath(search.redirect) ? search.redirect : '/';
  const setUser = useAuthStore((state) => state.setUser);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: 'user@example.com',
      password: 'yourpassword',
    } as LoginFormValues,
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        const result = await authService.login(value);
        setUser(result.user);
        await navigate({ to: redirectTo as never });
      } catch (error) {
        if (error instanceof ApiError) {
          setSubmitError(error.message);
        } else {
          setSubmitError('Could not reach the server. Please try again.');
        }
      }
    },
  });

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-6 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="text-sm font-extrabold uppercase text-primary">
            Account access
          </p>
          <CardTitle className="text-3xl">
            <h1 id="login-title">Sign in</h1>
          </CardTitle>
          <CardDescription>Enter your credentials to continue.</CardDescription>
        </CardHeader>

        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <CardContent className="grid gap-5">
            {submitError && (
              <p
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                role="alert"
              >
                {submitError}
              </p>
            )}

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
                  <FieldError
                    errors={field.state.meta.errors}
                    id={`${field.name}-error`}
                  />
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
                  <Input
                    autoComplete="current-password"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Enter your password"
                    aria-describedby={`${field.name}-error`}
                    aria-invalid={field.state.meta.errors.length > 0}
                    type="password"
                    value={field.state.value}
                  />
                  <FieldError
                    errors={field.state.meta.errors}
                    id={`${field.name}-error`}
                  />
                </div>
              )}
            />
          </CardContent>

          <CardFooter className="grid gap-4">
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button disabled={!canSubmit} type="submit">
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </Button>
              )}
            />

            <p className="text-center text-sm text-muted-foreground">
              New here?{' '}
              <Link className="font-semibold text-primary" to="/register">
                Create an account
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}

type FieldErrorProps = {
  errors: Array<unknown>;
  id: string;
};

function FieldError({ errors, id }: FieldErrorProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <p className="text-sm font-medium text-destructive" id={id} role="alert">
      {getErrorMessage(errors[0])}
    </p>
  );
}
