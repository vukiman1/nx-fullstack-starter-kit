interface FormErrorProps {
  message: string | null;
}

/** The banner for a failure that belongs to the whole form rather than one field. */
export function FormError({ message }: FormErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
      role="alert"
    >
      {message}
    </p>
  );
}
