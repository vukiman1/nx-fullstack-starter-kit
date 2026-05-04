import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-6 py-10">
      <section
        className="mx-auto max-w-md text-center"
        aria-labelledby="not-found-title"
      >
        <p className="text-sm font-extrabold uppercase tracking-wide text-primary">
          404
        </p>
        <h1
          id="not-found-title"
          className="mt-3 text-4xl font-extrabold leading-tight text-foreground"
        >
          Page not found
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to="/">Back to home</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
