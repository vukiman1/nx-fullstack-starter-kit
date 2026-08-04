interface FieldErrorProps {
  errors: ReadonlyArray<unknown>;
  id: string;
}

/**
 * Renders the first validation message for a field. TanStack Form hands back whatever the
 * validator threw, so the shape is unknown until we look at it.
 */
export function FieldError({ errors, id }: FieldErrorProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <p className="text-sm font-medium text-destructive" id={id} role="alert">
      {toMessage(errors[0])}
    </p>
  );
}

function toMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return String(error);
}
