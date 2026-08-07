import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface SubmitState {
  canSubmit: boolean;
  isSubmitting: boolean;
}

/**
 * Structural, for the same reason FormField's field prop is: naming the real FormApi would drag its
 * generics through every caller.
 */
interface SubscribableForm {
  Subscribe: (props: {
    selector: (state: SubmitState) => SubmitState;
    children: (state: SubmitState) => ReactNode;
  }) => ReactNode | Promise<ReactNode>;
}

interface SubmitButtonProps extends Omit<
  React.ComponentProps<typeof Button>,
  'children' | 'type' | 'form'
> {
  form: SubscribableForm;
  label: string;
  /** Shown while the submission is in flight. */
  pendingLabel: string;
}

/** Stays disabled until the form says it can submit, so no screen has to remember to check. */
export function SubmitButton({ form, label, pendingLabel, ...props }: SubmitButtonProps) {
  return (
    <form.Subscribe
      selector={({ canSubmit, isSubmitting }) => ({ canSubmit, isSubmitting })}
      children={({ canSubmit, isSubmitting }) => (
        <Button disabled={!canSubmit} type="submit" {...props}>
          {isSubmitting ? pendingLabel : label}
        </Button>
      )}
    />
  );
}
