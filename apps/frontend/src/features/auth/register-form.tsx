import { Button } from '@/components/ui/button';
import { useAuthModal } from './use-auth-modal';

export function RegisterForm() {
  const { open } = useAuthModal();

  return (
    <div className="grid gap-4">
      <Button onClick={() => open('login')} type="button" variant="outline">
        Back to sign in
      </Button>
    </div>
  );
}
