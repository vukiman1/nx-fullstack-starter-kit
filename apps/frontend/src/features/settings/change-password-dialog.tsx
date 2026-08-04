import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field-error';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-error';
import { notify } from '@/lib/toast';
import { authService } from '@/services/auth-service';
import {
  changePasswordFieldSchemas,
  changePasswordSchema,
  type ChangePasswordFormValues,
} from './schemas';

const EMPTY_FORM: ChangePasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Changing it signs out every other device.</DialogDescription>
        </DialogHeader>
        {/* Lives inside the content so Radix unmounts it on close, which clears the typed
            passwords without any reset logic of its own. */}
        <ChangePasswordForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const changeMutation = useMutation({
    mutationFn: (values: ChangePasswordFormValues) => authService.changePassword(values),
    onSuccess: async () => {
      notify.success('Password updated. Other devices were signed out.');
      onDone();
      await queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
    onError: (error: unknown) =>
      setSubmitError(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Could not update the password.',
      ),
  });

  const form = useForm({
    defaultValues: EMPTY_FORM,
    validators: { onSubmit: changePasswordSchema },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      await changeMutation.mutateAsync(value).catch(() => undefined);
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
      <FormError message={submitError} />

      <form.Field
        name="currentPassword"
        validators={{ onBlur: changePasswordFieldSchemas.currentPassword }}
        children={(field) => (
          <PasswordField autoComplete="current-password" field={field} label="Current password" />
        )}
      />

      <form.Field
        name="newPassword"
        validators={{ onBlur: changePasswordFieldSchemas.newPassword }}
        children={(field) => (
          <PasswordField autoComplete="new-password" field={field} label="New password" />
        )}
      />

      <form.Field
        name="confirmPassword"
        validators={{ onBlur: changePasswordFieldSchemas.confirmPassword }}
        children={(field) => (
          <PasswordField autoComplete="new-password" field={field} label="Confirm new password" />
        )}
      />

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <Button disabled={!canSubmit} type="submit">
            {isSubmitting ? 'Saving...' : 'Change password'}
          </Button>
        )}
      />
    </form>
  );
}

interface PasswordFieldProps {
  field: {
    name: string;
    state: { value: string; meta: { errors: ReadonlyArray<unknown> } };
    handleBlur: () => void;
    handleChange: (value: string) => void;
  };
  label: string;
  autoComplete: string;
}

function PasswordField({ field, label, autoComplete }: PasswordFieldProps) {
  const errorId = `${field.name}-error`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        aria-describedby={errorId}
        aria-invalid={field.state.meta.errors.length > 0}
        autoComplete={autoComplete}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        type="password"
        value={field.state.value}
      />
      <FieldError errors={field.state.meta.errors} id={errorId} />
    </div>
  );
}
