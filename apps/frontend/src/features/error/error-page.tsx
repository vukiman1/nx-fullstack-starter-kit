import { Link, type ErrorComponentProps } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export function ErrorPage({ error, reset }: ErrorComponentProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-6 py-10">
      <section
        className="mx-auto max-w-md text-center"
        aria-labelledby="error-title"
        role="alert"
      >
        <p className="text-sm font-extrabold uppercase tracking-wide text-destructive">
          Something went wrong
        </p>
        <h1
          id="error-title"
          className="mt-3 text-4xl font-extrabold leading-tight text-foreground"
        >
          Unexpected error
        </h1>
        <p className="mt-4 wrap-break-words text-base text-muted-foreground">
          {error.message ||
            'An unexpected error occurred while rendering this page.'}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="ghost">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
