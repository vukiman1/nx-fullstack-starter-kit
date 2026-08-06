import { Link } from '@tanstack/react-router';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Button } from '@/components/ui/button';
import { ProfileCard } from '@/features/settings/profile-card';
import { SecurityCard } from '@/features/settings/security-card';
import { TwoFactorCard } from '@/features/settings/two-factor-card';
import { SessionsCard } from '@/features/settings/sessions-card';

export function DashboardSettingsPage() {
  return (
    <main className="min-h-screen bg-muted/40">
      <SimpleHeader />

      <section className="mx-auto w-full max-w-4xl px-6 py-16">
        <p className="mb-3 text-sm font-extrabold uppercase text-primary">Dashboard</p>
        <h1 className="text-3xl font-extrabold text-foreground">Settings</h1>

        <div className="mt-8 grid gap-8">
          <ProfileCard />
          <SecurityCard />
          <TwoFactorCard />
          <SessionsCard />
        </div>

        <div className="mt-8 flex items-center gap-3">
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
