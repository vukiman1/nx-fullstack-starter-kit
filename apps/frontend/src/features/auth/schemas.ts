import { z } from 'zod';

/** Mirrors IsStrongPassword on the backend — keep the two in step or the server rejects what the form accepted. */
export const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must contain at least one letter and one number.');

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Enter your password.')
    .min(8, 'Password must be at least 8 characters.'),
  rememberMe: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

const registerFields = z.object({
  displayName: z.string().min(1, 'Enter your name.').max(255, 'That name is too long.'),
  email: z.email('Enter a valid email address.'),
  password: strongPassword,
  confirmPassword: z.string().min(1, 'Confirm your password.'),
});

export const registerFieldSchemas = registerFields.shape;

export const registerSchema = registerFields.refine(
  (values) => values.password === values.confirmPassword,
  { message: 'Passwords do not match.', path: ['confirmPassword'] },
);

export type RegisterFormValues = z.infer<typeof registerFields>;
