import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth-store';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';
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
        <DialogHeader>
          <p className="text-sm font-extrabold uppercase text-primary">Account access</p>
          <DialogTitle>{isLogin ? 'Sign in' : 'Create your account'}</DialogTitle>
          <DialogDescription id="auth-modal-description">
            {isLogin ? 'Enter your credentials to continue.' : 'Create an account to get started.'}
          </DialogDescription>
        </DialogHeader>

        {isLogin ? <LoginForm /> : <RegisterForm />}
      </DialogContent>
    </Dialog>
  );
}
