import * as React from 'react';
import { OTPInput, OTPInputContext } from 'input-otp';
import { Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const InputOTP = React.forwardRef<
  React.ComponentRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    className={cn('disabled:cursor-not-allowed', className)}
    containerClassName={cn('flex items-center gap-2 has-disabled:opacity-50', containerClassName)}
    ref={ref}
    {...props}
  />
));
InputOTP.displayName = 'InputOTP';

const InputOTPGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div className={cn('flex items-center gap-2', className)} ref={ref} {...props} />
  ),
);
InputOTPGroup.displayName = 'InputOTPGroup';

const InputOTPSlot = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & { index: number }
>(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext);
  const slot = inputOTPContext.slots[index];

  return (
    <div
      className={cn(
        'relative flex size-11 items-center justify-center rounded-md border text-lg font-medium shadow-xs transition-all',
        slot?.isActive && 'z-10 border-ring ring-[3px] ring-ring/50',
        className,
      )}
      ref={ref}
      {...props}
    >
      {slot?.char}
      {slot?.hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
});
InputOTPSlot.displayName = 'InputOTPSlot';

const InputOTPSeparator = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  (props, ref) => (
    <div ref={ref} role="separator" {...props}>
      <Minus className="size-4 text-muted-foreground" />
    </div>
  ),
);
InputOTPSeparator.displayName = 'InputOTPSeparator';

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
