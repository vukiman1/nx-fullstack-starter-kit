import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'>;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = isVisible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input className={cn('pr-10', className)} type={isVisible ? 'text' : 'password'} {...props} />
      <button
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        className="absolute right-0 top-0 flex h-full w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        onClick={() => setIsVisible((visible) => !visible)}
        // Toggling visibility is not part of filling the form, so it stays out of the tab order.
        tabIndex={-1}
        type="button"
      >
        <Icon className="size-4" />
      </button>
    </div>
  );
}
