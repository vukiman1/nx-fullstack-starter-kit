import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { FormError } from '@/components/ui/form-error';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';
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
    <Form className="grid gap-4" onSubmit={form.handleSubmit}>
      <FormError message={submitError} />

      <form.Field
        name="currentPassword"
        validators={{ onBlur: changePasswordFieldSchemas.currentPassword }}
        children={(field) => (
          <FormField
            autoComplete="current-password"
            field={field}
            label="Current password"
            type="password"
          />
        )}
      />

      <form.Field
        name="newPassword"
        validators={{ onBlur: changePasswordFieldSchemas.newPassword }}
        children={(field) => (
          <FormField
            autoComplete="new-password"
            field={field}
            label="New password"
            type="password"
          />
        )}
      />

      <form.Field
        name="confirmPassword"
        validators={{ onBlur: changePasswordFieldSchemas.confirmPassword }}
        children={(field) => (
          <FormField
            autoComplete="new-password"
            field={field}
            label="Confirm new password"
            type="password"
          />
        )}
      />

      <SubmitButton form={form} label="Change password" pendingLabel="Saving..." />
    </Form>
  );
}
