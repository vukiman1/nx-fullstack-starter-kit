import { SimpleHeader } from '@/components/layout/simple-header';

export function HomePage() {
  return (
    <main className="min-h-screen bg-muted/40">
      <SimpleHeader />

      <section
        className="mx-auto w-full max-w-3xl px-6 py-24"
        aria-labelledby="home-title"
      >
        <p className="mb-3 text-sm font-extrabold uppercase text-primary">
          Frontend base
        </p>
        <h1
          id="home-title"
          className="max-w-2xl text-4xl font-extrabold leading-tight text-foreground"
        >
          Build from a clean app foundation.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground">
          Routing and form primitives are ready. Start with authentication, then
          expand the workspace feature by feature.
        </p>
      </section>
    </main>
  );
}
