import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import type { StandardSchemaV1 } from '@tanstack/react-form';
import { errorMessage } from '@/lib/api-error';

interface FormWithSubmitErrorOptions<TValues> {
  defaultValues: TValues;
  /** Validated on submit; per-field schemas still go on the individual fields. */
  schema: StandardSchemaV1<TValues>;
  /** Shown when the failure carries no message meant for a person — a crash or a dead network. */
  fallbackError: string;
  onSubmit: (values: TValues) => Promise<void>;
}

/**
 * A form whose submit failures become a message to display. Every screen was repeating the same
 * clear-then-try-then-catch around its own submit, which buried the one part that differed.
 */
export function useFormWithSubmitError<TValues>({
  defaultValues,
  schema,
  fallbackError,
  onSubmit,
}: FormWithSubmitErrorOptions<TValues>) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues,
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        await onSubmit(value);
      } catch (caught) {
        setSubmitError(errorMessage(caught, fallbackError));
      }
    },
  });

  return { form, submitError };
}
