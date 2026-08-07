import { cn } from '@/lib/utils';

type CheckboxProps = Omit<React.ComponentProps<'input'>, 'type'>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      className={cn(
        'size-4 rounded border-input accent-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className,
      )}
      type="checkbox"
      {...props}
    />
  );
}
