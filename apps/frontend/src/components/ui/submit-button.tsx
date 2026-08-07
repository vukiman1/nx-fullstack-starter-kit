import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface SubmitState {
  canSubmit: boolean;
  isSubmitting: boolean;
}

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
  pendingLabel: string;
}

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
