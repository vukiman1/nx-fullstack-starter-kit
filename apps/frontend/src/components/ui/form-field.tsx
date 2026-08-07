import type { ComponentType } from 'react';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * The slice of a TanStack Form field this needs. Declared structurally so the component does not
 * drag in the library's generics, which would have to be threaded through every caller.
 */
export interface FormFieldApi {
  name: string;
  state: { value: string; meta: { errors: ReadonlyArray<unknown> } };
  handleBlur: () => void;
  handleChange: (value: string) => void;
}

/** Everything the field owns is off limits to callers; the rest passes straight to the control. */
type WiredProps =
  'id' | 'name' | 'value' | 'onBlur' | 'onChange' | 'aria-invalid' | 'aria-describedby';

type ControlOwnProps = Omit<React.ComponentProps<'input'>, WiredProps>;

type ControlProps = ControlOwnProps & Pick<React.ComponentProps<'input'>, WiredProps>;

interface FormFieldProps extends ControlOwnProps {
  field: FormFieldApi;
  label: string;
  /** Swap in PasswordInput, or anything else taking the same props. */
  control?: ComponentType<ControlProps>;
}

/**
 * Label, control and error as one unit. Wiring them by hand each time is what lets an `id` drift
 * from its `htmlFor`, or `aria-describedby` point at an error element that was renamed.
 */
export function FormField({
  field,
  label,
  control: Control = Input,
  ...controlProps
}: FormFieldProps) {
  const errorId = `${field.name}-error`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Control
        aria-describedby={errorId}
        aria-invalid={field.state.meta.errors.length > 0}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        value={field.state.value}
        {...controlProps}
      />
      <FieldError errors={field.state.meta.errors} id={errorId} />
    </div>
  );
}
