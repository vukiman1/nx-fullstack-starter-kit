import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useOneTimeToken } from './use-one-time-token';

interface TokenLandingPageProps {
  token: string | undefined;
  spend: (token: string) => Promise<{ message: string }>;
  /** Heading while the link is being checked, and after it succeeds. */
  headings: { pending: string; done: string };
  fallbackError: string;
}

/** The shape shared by every page a link in an email lands on. */
export function TokenLandingPage({ token, spend, headings, fallbackError }: TokenLandingPageProps) {
  const outcome = useOneTimeToken(token, spend, fallbackError);

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-6 py-10">
      <section className="mx-auto max-w-md text-center" role="status">
        <h1 className="text-3xl font-extrabold text-foreground">
          {outcome.status === 'done' ? headings.done : headings.pending}
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          {outcome.status === 'working' ? 'Checking your link...' : outcome.message}
        </p>
        {outcome.status !== 'working' && (
          <div className="mt-8">
            <Button asChild>
              <Link search={{ auth: 'login' }} to="/">
                Go to sign in
              </Link>
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
