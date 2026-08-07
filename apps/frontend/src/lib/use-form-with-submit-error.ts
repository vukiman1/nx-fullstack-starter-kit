import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import type { StandardSchemaV1 } from '@tanstack/react-form';
import { errorMessage } from '@/lib/api-error';

interface FormWithSubmitErrorOptions<TValues> {
  defaultValues: TValues;
  schema: StandardSchemaV1<TValues>;
  fallbackError: string;
  onSubmit: (values: TValues) => Promise<void>;
}

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
