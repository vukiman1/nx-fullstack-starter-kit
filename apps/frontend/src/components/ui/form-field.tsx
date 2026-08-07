import type { ComponentType } from 'react';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface FormFieldApi {
  name: string;
  state: { value: string; meta: { errors: ReadonlyArray<unknown> } };
  handleBlur: () => void;
  handleChange: (value: string) => void;
}

type WiredProps =
  'id' | 'name' | 'value' | 'onBlur' | 'onChange' | 'aria-invalid' | 'aria-describedby';

type ControlOwnProps = Omit<React.ComponentProps<'input'>, WiredProps>;

type ControlProps = ControlOwnProps & Pick<React.ComponentProps<'input'>, WiredProps>;

interface FormFieldProps extends ControlOwnProps {
  field: FormFieldApi;
  label: string;
  control?: ComponentType<ControlProps>;
}

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
