import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/api-error';
import { authService } from '@/services/auth-service';

interface TwoFactorSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnabled: (recoveryCodes: string[]) => void | Promise<void>;
}

export function TwoFactorSetupDialog({ open, onOpenChange, onEnabled }: TwoFactorSetupDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set up two-factor authentication</DialogTitle>
          <DialogDescription>
            Scan this with an authenticator app, then enter the code it shows.
          </DialogDescription>
        </DialogHeader>
        {/* Inside the content so Radix unmounts it on close: a half-finished setup should not
            survive to the next time the dialog opens. */}
        {open && <SetupSteps onEnabled={onEnabled} />}
      </DialogContent>
    </Dialog>
  );
}

function SetupSteps({ onEnabled }: Pick<TwoFactorSetupDialogProps, 'onEnabled'>) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // A query, not a mutation: the endpoint is idempotent, so React Query dedupes StrictMode's
  // duplicate call instead of spending two of the five requests the throttle allows.
  const setupQuery = useQuery({
    queryKey: ['auth', '2fa', 'setup'],
    queryFn: () => authService.startTwoFactorSetup(),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

  const confirmMutation = useMutation({
    mutationFn: () => authService.confirmTwoFactorSetup(code.trim()),
    onSuccess: ({ recoveryCodes }) => onEnabled(recoveryCodes),
    onError: (caught: unknown) => setError(errorMessage(caught, 'That code is not valid.')),
  });

  const { data } = setupQuery;

  useEffect(() => {
    if (data?.otpauthUri) {
      void QRCode.toDataURL(data.otpauthUri, { width: 220 }).then(setQrDataUrl);
    }
  }, [data?.otpauthUri]);

  return (
    <Form
      className="grid gap-4"
      onSubmit={() => {
        setError(null);
        confirmMutation.mutate();
      }}
    >
      <FormError
        message={error ?? (setupQuery.isError ? 'Could not start setup. Please try again.' : null)}
      />

      <div className="flex justify-center">
        {qrDataUrl ? (
          <img alt="Two-factor setup QR code" className="rounded-md border" src={qrDataUrl} />
        ) : (
          <p className="py-10 text-sm text-muted-foreground">Preparing your code...</p>
        )}
      </div>

      {data?.otpauthUri && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">Cannot scan it?</summary>
          <p className="mt-2 wrap-break-words font-mono text-xs">{data.otpauthUri}</p>
        </details>
      )}

      <div className="grid gap-2">
        <Label htmlFor="setup-code">Code from your app</Label>
        <Input
          autoComplete="one-time-code"
          id="setup-code"
          inputMode="numeric"
          onChange={(event) => setCode(event.target.value)}
          placeholder="123456"
          value={code}
        />
      </div>

      <Button disabled={confirmMutation.isPending || code.trim().length !== 6} type="submit">
        {confirmMutation.isPending ? 'Verifying...' : 'Turn on'}
      </Button>
    </Form>
  );
}
