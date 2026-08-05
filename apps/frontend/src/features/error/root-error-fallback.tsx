import type { ErrorFallbackProps } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';

export function RootErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const message =
    error instanceof Error
      ? error.message
      : 'An unexpected error occurred while loading the application.';

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-6 py-10">
      <section
        className="mx-auto max-w-md text-center"
        aria-labelledby="root-error-title"
        role="alert"
      >
        <p className="text-sm font-extrabold uppercase tracking-wide text-destructive">
          Something went wrong
        </p>
        <h1
          id="root-error-title"
          className="mt-3 text-4xl font-extrabold leading-tight text-foreground"
        >
          Unexpected error
        </h1>
        <p className="mt-4 wrap-break-words text-base text-muted-foreground">{message}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={resetError}>Try again</Button>
          <Button asChild variant="ghost">
            <a href="/">Back to home</a>
          </Button>
        </div>
      </section>
    </main>
  );
}
