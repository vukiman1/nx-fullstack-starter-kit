import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { notify } from '@/lib/toast';

interface RecoveryCodesDialogProps {
  codes: string[] | null;
  onClose: () => void;
}

/** Shown exactly once: only hashes are stored, so there is no way to bring these back. */
export function RecoveryCodesDialog({ codes, onClose }: RecoveryCodesDialogProps) {
  const copy = async () => {
    if (!codes) {
      return;
    }
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      notify.success('Recovery codes copied.');
    } catch {
      notify.error('Could not copy. Please write them down instead.');
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(codes)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save your recovery codes</DialogTitle>
          <DialogDescription>
            Each code works once, and this is the only time they are shown. Keep them somewhere you
            can reach without your phone.
          </DialogDescription>
        </DialogHeader>

        <ul className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-4 font-mono text-sm">
          {(codes ?? []).map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3">
          <Button onClick={copy} type="button" variant="outline">
            Copy codes
          </Button>
          <Button onClick={onClose} type="button">
            I have saved them
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
