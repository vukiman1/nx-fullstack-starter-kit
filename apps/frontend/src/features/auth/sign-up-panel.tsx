import { AuthMethodPanel } from './auth-method-panel';
import { RegisterForm } from './register-form';
import { useAuthModal } from './use-auth-modal';

export function SignUpPanel() {
  const { open } = useAuthModal();

  return (
    <AuthMethodPanel
      copy={{
        chooser: { title: 'Create your account', description: 'Choose how you want to sign up.' },
        email: {
          title: 'Sign up with email',
          description: 'Free, and takes a moment.',
          action: 'Continue with email',
        },
        footer: {
          question: 'Already have an account?',
          action: 'Sign in',
          onAction: () => open('login'),
        },
      }}
      renderEmailForm={() => <RegisterForm onVerified={() => open('login')} />}
    />
  );
}
