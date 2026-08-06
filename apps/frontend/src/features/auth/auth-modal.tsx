import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth-store';
import { SignInPanel } from './sign-in-panel';
import { SignUpPanel } from './sign-up-panel';
import { useAuthModal, type AuthModalView } from './use-auth-modal';

export function AuthModal() {
  const { view, close } = useAuthModal();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  // Guards used to keep signed-in users off the login page; with a modal that job lands here.
  const isOpen = Boolean(view) && !isAuthenticated;

  const [lastView, setLastView] = useState<AuthModalView>(view ?? 'login');
  if (view && view !== lastView) {
    setLastView(view);
  }

  const isLogin = (view ?? lastView) === 'login';

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          void close();
        }
      }}
    >
      <DialogContent aria-describedby="auth-modal-description">
        {isLogin ? <SignInPanel /> : <SignUpPanel />}
      </DialogContent>
    </Dialog>
  );
}
