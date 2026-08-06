import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Hosts the app's one confirmation dialog so callers get `await confirm(...)` and render nothing. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  // reason: the context value must keep a stable identity or every consumer re-renders on each open
  const confirm = useCallback<ConfirmFn>(
    (next) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setOptions(next);
        setIsOpen(true);
      }),
    [],
  );

  // `options` survives settling: Radix animates the close, and clearing it would blank the dialog.
  const settle = (confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && settle(false)}>
          <AlertDialogContent>
            <AlertDialogTitle>{options.title}</AlertDialogTitle>
            <AlertDialogDescription>{options.description}</AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button onClick={() => settle(false)} type="button" variant="ghost">
                  {options.cancelLabel ?? 'Cancel'}
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  onClick={() => settle(true)}
                  type="button"
                  variant={options.destructive ? 'destructive' : 'default'}
                >
                  {options.confirmLabel ?? 'Confirm'}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return confirm;
}
