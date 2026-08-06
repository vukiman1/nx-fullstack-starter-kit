import { z } from 'zod';
import { strongPassword } from '@/features/auth/schemas';

const changePasswordFields = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: strongPassword,
  confirmPassword: z.string().min(1, 'Confirm your new password.'),
});

/** Field-level rules, for validating one input at a time on blur. */
export const changePasswordFieldSchemas = changePasswordFields.shape;

/** Whole-form rules — the match check needs two fields, so it can only run here. */
export const changePasswordSchema = changePasswordFields.refine(
  (values) => values.newPassword === values.confirmPassword,
  { message: 'Passwords do not match.', path: ['confirmPassword'] },
);

export type ChangePasswordFormValues = z.infer<typeof changePasswordFields>;
