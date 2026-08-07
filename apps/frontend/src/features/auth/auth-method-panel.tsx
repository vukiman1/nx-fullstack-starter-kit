import { type ReactNode, useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TextLink } from '@/components/ui/text-link';
import { GoogleSignInButton } from './google-sign-in-button';

interface PanelCopy {
  /** Shown on the provider choice. */
  chooser: { title: string; description: string };
  /** Shown once email is picked. */
  email: { title: string; description: string; action: string };
  footer: { question: string; action: string; onAction: () => void };
}

interface AuthMethodPanelProps {
  copy: PanelCopy;
  renderEmailForm: () => ReactNode;
  /** Overrides where the back arrow goes — a nested step returns to its parent, not the chooser. */
  onBack?: () => void;
}

/**
 * Opens on the choice of provider rather than on a form. Most people arrive with a Google account,
 * and showing fields first asks them to remember which one they used here.
 *
 * The heading lives in here rather than in the modal because it changes with the step, and so does
 * the back arrow that returns to the choice.
 */
export function AuthMethodPanel({ copy, renderEmailForm, onBack }: AuthMethodPanelProps) {
  const [isUsingEmail, setIsUsingEmail] = useState(false);
  const step = isUsingEmail ? copy.email : copy.chooser;

  return (
    <>
      <DialogHeader className="relative text-center">
        {isUsingEmail && (
          <button
            aria-label="Back to the other options"
            className="absolute -left-1 top-0 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onClick={onBack ?? (() => setIsUsingEmail(false))}
            type="button"
          >
            <ArrowLeft className="size-4" />
          </button>
        )}
        <DialogTitle className="text-xl">{step.title}</DialogTitle>
        <DialogDescription id="auth-modal-description">{step.description}</DialogDescription>
      </DialogHeader>

      {isUsingEmail ? (
        renderEmailForm()
      ) : (
        <div className="grid gap-3">
          <GoogleSignInButton />

          <Button
            className="w-full"
            onClick={() => setIsUsingEmail(true)}
            type="button"
            variant="outline"
          >
            <Mail className="size-4" />
            {copy.email.action}
          </Button>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {copy.footer.question}{' '}
        <TextLink onClick={copy.footer.onAction}>{copy.footer.action}</TextLink>
      </p>
    </>
  );
}
