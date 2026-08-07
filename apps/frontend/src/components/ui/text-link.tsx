import { cn } from '@/lib/utils';

type TextLinkProps = Omit<React.ComponentProps<'button'>, 'type'> & {
  /** Muted reads as secondary; the default carries the brand colour. */
  tone?: 'brand' | 'muted';
};

/** An inline action that reads as a link but is a button, because it does not navigate. */
export function TextLink({ className, tone = 'brand', ...props }: TextLinkProps) {
  return (
    <button
      className={cn(
        'underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:no-underline disabled:opacity-60',
        tone === 'brand' ? 'font-semibold text-primary' : 'text-sm text-muted-foreground',
        className,
      )}
      type="button"
      {...props}
    />
  );
}
