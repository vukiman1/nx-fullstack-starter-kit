import { z } from 'zod';

/** Mirrors IsStrongPassword on the backend — keep the two in step or the server rejects what the form accepted. */
const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must contain at least one letter and one number.');

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
