import { useState } from 'react';
import { AuthMethodPanel } from './auth-method-panel';
import { ForgotPasswordForm } from './forgot-password-form';
import { LoginForm } from './login-form';
import { useAuthModal } from './use-auth-modal';

export function SignInPanel() {
  const { open } = useAuthModal();
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  const emailStep = isRecoveringPassword
    ? {
        title: 'Reset your password',
        description: 'We will email you a link to set a new one.',
        action: 'Continue with email',
      }
    : {
        title: 'Sign in with email',
        description: 'Welcome back.',
        action: 'Continue with email',
      };

  return (
    <AuthMethodPanel
      copy={{
        chooser: { title: 'Welcome back', description: 'Choose how you want to sign in.' },
        email: emailStep,
        footer: {
          question: 'New here?',
          action: 'Create an account',
          onAction: () => open('register'),
        },
      }}
      onBack={isRecoveringPassword ? () => setIsRecoveringPassword(false) : undefined}
      renderEmailForm={() =>
        isRecoveringPassword ? (
          <ForgotPasswordForm onDone={() => setIsRecoveringPassword(false)} />
        ) : (
          <LoginForm onForgotPassword={() => setIsRecoveringPassword(true)} />
        )
      }
    />
  );
}
