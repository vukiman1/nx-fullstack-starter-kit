import { Link } from '@tanstack/react-router';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Button } from '@/components/ui/button';

export function DashboardSettingsPage() {
  return (
    <main className="min-h-screen bg-muted/40">
      <SimpleHeader />

      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <p className="mb-3 text-sm font-extrabold uppercase text-primary">
          Dashboard
        </p>
        <h1 className="text-3xl font-extrabold text-foreground">Settings</h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground">
          Settings will live here when the dashboard area grows.
        </p>

        <div className="mt-8">
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
