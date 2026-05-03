import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export function SimpleHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
      <a className="text-base font-extrabold text-foreground no-underline" href="/">
        My Workspace
      </a>

      <nav className="inline-flex items-center gap-2" aria-label="Primary">
        <Button asChild variant="ghost">
          <Link to="/login">Login</Link>
        </Button>
        <Button asChild>
          <Link to="/register">Register</Link>
        </Button>
      </nav>
    </header>
  );
}
