# Google One Tap Auth — Frontend Implementation Plan (Plan 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show Google One Tap app-wide for anonymous users and render a Google button in the login form; on credential, call the backend endpoint, store the user, and navigate.

**Architecture:** A module singleton loads the Google Identity Services (GIS) script once and calls `initialize` a single time with a shared callback. A `GoogleOneTap` provider mounted in the router root triggers `prompt()` while the user is anonymous; a `GoogleSignInButton` in the login form renders the official button. Both funnel through `authService.googleOneTap`.

**Tech Stack:** React 19, TanStack Router + Query, Zustand, Axios, Google Identity Services, Jest + Testing Library, Vite, Nx.

Depends on: Plan 1 backend endpoint `POST /auth/google/one-tap` and the `GoogleOneTapPayload` contract.
Spec: [docs/superpowers/specs/2026-07-01-google-one-tap-auth-design.md](../specs/2026-07-01-google-one-tap-auth-design.md)

## Global Constraints

- Node `>=26`; run through Nx: `pnpm nx <target> @org/frontend`.
- No `any`. Functional components + hooks only. Booleans use `is/has/can`.
- Frontend public config is node-config (yml + `custom-environment-variables.yml`) injected as `__FRONTEND_CONFIG__` by Vite; read it via `appConfig`.
- `httpRequest.*` already unwraps the API envelope and returns the `data` payload.
- Tests are Jest + `@testing-library/react`, colocated `*.spec.ts(x)`; run with `pnpm nx test @org/frontend`.
- The GIS `initialize` callback is global (one per page) — initialize exactly once.

---

## File Structure

**Create:**

- `apps/frontend/src/types/google-identity.d.ts` — minimal GIS type surface.
- `apps/frontend/src/lib/google-identity.ts` — script loader + single `initialize` singleton.
- `apps/frontend/src/lib/google-identity.spec.ts`
- `apps/frontend/src/features/auth/use-google-one-tap.ts` — provider hook (prompt when anonymous).
- `apps/frontend/src/features/auth/use-google-one-tap.spec.tsx`
- `apps/frontend/src/features/auth/google-one-tap.tsx` — `GoogleOneTap` provider component (renders nothing).
- `apps/frontend/src/features/auth/google-sign-in-button.tsx` — `GoogleSignInButton`.
- `apps/frontend/src/features/auth/google-sign-in-button.spec.tsx`
- `apps/frontend/src/services/auth-service.spec.ts` — cover `googleOneTap`.

**Modify:**

- `apps/frontend/src/config/types.ts` — add `google: { clientId: string }`.
- `apps/frontend/config/index.ts` — add `google` to the schema.
- `apps/frontend/config/default.yml`, `apps/frontend/config/custom-environment-variables.yml`, `apps/frontend/.env.example` — `VITE_GOOGLE_CLIENT_ID`.
- `apps/frontend/src/test-setup.ts` — add `google.clientId` to the test `__FRONTEND_CONFIG__`.
- `apps/frontend/src/services/auth-service.ts` — add `googleOneTap`.
- `apps/frontend/src/routes/__root.tsx` — mount `<GoogleOneTap />`.
- `apps/frontend/src/features/auth/login-form.tsx` — render `<GoogleSignInButton />`.

---

## Task 1: Expose `google.clientId` to the frontend config

**Files:**

- Modify: `apps/frontend/src/config/types.ts`
- Modify: `apps/frontend/config/index.ts`
- Modify: `apps/frontend/config/default.yml`, `apps/frontend/config/custom-environment-variables.yml`, `apps/frontend/.env.example`
- Modify: `apps/frontend/src/test-setup.ts`
- Test: `apps/frontend/src/config/app-config.spec.ts`

**Interfaces:**

- Produces: `appConfig.google.clientId: string`.

- [ ] **Step 1: Write the failing test**

Add to `apps/frontend/src/config/app-config.spec.ts`:

```ts
it('exposes the google client id', () => {
  expect(typeof appConfig.google.clientId).toBe('string');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @org/frontend --testFile=app-config.spec.ts`
Expected: FAIL — `google` missing on config type/object.

- [ ] **Step 3: Add `google` to the config type**

`apps/frontend/src/config/types.ts`:

```ts
export interface FrontendPublicConfig {
  app: { name: string; environment: string };
  api: { baseUrl: string };
  sentry: { dsn: string };
  google: { clientId: string };
}
```

- [ ] **Step 4: Add `google` to the config schema and sources**

`apps/frontend/config/index.ts` — add to `frontendPublicConfigSchema`:

```ts
  google: z.object({
    clientId: z.string().default(''),
  }),
```

`apps/frontend/config/default.yml` — add:

```yaml
google:
  clientId: ''
```

`apps/frontend/config/custom-environment-variables.yml` — add:

```yaml
google:
  clientId: VITE_GOOGLE_CLIENT_ID
```

`apps/frontend/.env.example` — add:

```
# Google One Tap client id (public). Leave empty to disable Google login.
VITE_GOOGLE_CLIENT_ID=
```

- [ ] **Step 5: Add `google` to the test config**

In `apps/frontend/src/test-setup.ts`, add `google: { clientId: 'test-client-id' }` to the `__FRONTEND_CONFIG__` object it defines (match the shape of the existing `app`/`api`/`sentry` keys).

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm nx test @org/frontend --testFile=app-config.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/config apps/frontend/config apps/frontend/.env.example apps/frontend/src/test-setup.ts
git commit -m "feat(frontend): expose google client id in public config"
```

---

## Task 2: GIS loader + `authService.googleOneTap`

**Files:**

- Create: `apps/frontend/src/types/google-identity.d.ts`
- Create: `apps/frontend/src/lib/google-identity.ts`
- Test: `apps/frontend/src/lib/google-identity.spec.ts`
- Modify: `apps/frontend/src/services/auth-service.ts`
- Test: `apps/frontend/src/services/auth-service.spec.ts`

**Interfaces:**

- Produces: `ensureGoogleIdentity(opts: { clientId: string; callback: (credential: string) => void }): Promise<GoogleIdentityApi>`; `promptGoogleOneTap(): void`; `authService.googleOneTap(credential: string): Promise<LoginResponse>`.

- [ ] **Step 1: Write the failing test for the service**

`apps/frontend/src/services/auth-service.spec.ts`:

```ts
import { authService } from './auth-service';
import { httpRequest } from '@/lib/http-request';

jest.mock('@/lib/http-request', () => ({
  httpRequest: { post: jest.fn(), get: jest.fn(), delete: jest.fn() },
}));

describe('authService.googleOneTap', () => {
  beforeEach(() => jest.mocked(httpRequest.post).mockReset());

  it('posts the credential to the one-tap endpoint', async () => {
    const response = { user: { email: 'jane@example.com' } };
    jest.mocked(httpRequest.post).mockResolvedValue(response);

    const result = await authService.googleOneTap('cred-1');

    expect(httpRequest.post).toHaveBeenCalledWith('/auth/google/one-tap', { credential: 'cred-1' });
    expect(result).toEqual(response);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @org/frontend --testFile=auth-service.spec.ts`
Expected: FAIL — `googleOneTap` is not a function.

- [ ] **Step 3: Add the GIS type surface**

`apps/frontend/src/types/google-identity.d.ts`:

```ts
export interface GoogleCredentialResponse {
  credential: string;
}

export interface GoogleIdInitializeOptions {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  use_fedcm_for_prompt?: boolean;
  auto_select?: boolean;
}

export interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  width?: number;
}

export interface GoogleIdentityApi {
  initialize(options: GoogleIdInitializeOptions): void;
  prompt(): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
  cancel(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityApi } };
  }
}
```

- [ ] **Step 4: Write the failing test for the loader**

`apps/frontend/src/lib/google-identity.spec.ts`:

```ts
import {
  ensureGoogleIdentity,
  promptGoogleOneTap,
  resetGoogleIdentityForTests,
} from './google-identity';

const initialize = jest.fn();
const prompt = jest.fn();

describe('google-identity', () => {
  beforeEach(() => {
    initialize.mockReset();
    prompt.mockReset();
    resetGoogleIdentityForTests();
    window.google = {
      accounts: { id: { initialize, prompt, renderButton: jest.fn(), cancel: jest.fn() } },
    };
  });

  it('initializes GIS exactly once even across repeated calls', async () => {
    const callback = jest.fn();
    await ensureGoogleIdentity({ clientId: 'client-1', callback });
    await ensureGoogleIdentity({ clientId: 'client-1', callback });
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'client-1', use_fedcm_for_prompt: true }),
    );
  });

  it('forwards the credential string to the caller callback', async () => {
    const callback = jest.fn();
    await ensureGoogleIdentity({ clientId: 'client-1', callback });
    const gisCallback = initialize.mock.calls[0][0].callback;
    gisCallback({ credential: 'abc' });
    expect(callback).toHaveBeenCalledWith('abc');
  });

  it('prompts through the initialized api', async () => {
    await ensureGoogleIdentity({ clientId: 'client-1', callback: jest.fn() });
    promptGoogleOneTap();
    expect(prompt).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `pnpm nx test @org/frontend --testFile=google-identity.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 6: Implement the loader**

`apps/frontend/src/lib/google-identity.ts`:

```ts
import type { GoogleIdentityApi } from '@/types/google-identity';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<GoogleIdentityApi> | null = null;
let initialized = false;
let api: GoogleIdentityApi | null = null;

interface EnsureOptions {
  clientId: string;
  callback: (credential: string) => void;
}

function loadScript(): Promise<GoogleIdentityApi> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<GoogleIdentityApi>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google.accounts.id);
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) resolve(window.google.accounts.id);
      else reject(new Error('Google Identity Services failed to initialize'));
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function ensureGoogleIdentity({
  clientId,
  callback,
}: EnsureOptions): Promise<GoogleIdentityApi> {
  const identity = await loadScript();
  if (!initialized) {
    identity.initialize({
      client_id: clientId,
      callback: (response) => callback(response.credential),
      use_fedcm_for_prompt: true,
    });
    initialized = true;
    api = identity;
  }
  return identity;
}

export function promptGoogleOneTap(): void {
  api?.prompt();
}

// Test-only hook to clear the module singleton between cases.
export function resetGoogleIdentityForTests(): void {
  scriptPromise = null;
  initialized = false;
  api = null;
}
```

- [ ] **Step 7: Add `googleOneTap` to the service**

In `apps/frontend/src/services/auth-service.ts`, add the import and method:

```ts
import type { LoginResponse /* …existing… */ } from '@org/shared-contracts';

  googleOneTap(credential: string) {
    return httpRequest.post<LoginResponse>('/auth/google/one-tap', { credential });
  },
```

- [ ] **Step 8: Run the loader + service tests to verify they pass**

Run: `pnpm nx test @org/frontend --testFile=google-identity.spec.ts`
Run: `pnpm nx test @org/frontend --testFile=auth-service.spec.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/types apps/frontend/src/lib/google-identity.ts apps/frontend/src/lib/google-identity.spec.ts apps/frontend/src/services/auth-service.ts apps/frontend/src/services/auth-service.spec.ts
git commit -m "feat(frontend): add GIS loader and googleOneTap service call"
```

---

## Task 3: App-wide One Tap provider

**Files:**

- Create: `apps/frontend/src/features/auth/use-google-one-tap.ts`
- Create: `apps/frontend/src/features/auth/google-one-tap.tsx`
- Test: `apps/frontend/src/features/auth/use-google-one-tap.spec.tsx`
- Modify: `apps/frontend/src/routes/__root.tsx`

**Interfaces:**

- Consumes: `ensureGoogleIdentity`, `promptGoogleOneTap` (Task 2); `authService.googleOneTap` (Task 2); `useAuthStore` selectors; `appConfig.google.clientId`.
- Produces: `useGoogleOneTap(): void`; `<GoogleOneTap />` component.

- [ ] **Step 1: Write the failing test** — prompts only when anonymous, and a credential logs the user in.

`apps/frontend/src/features/auth/use-google-one-tap.spec.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useGoogleOneTap } from './use-google-one-tap';
import { ensureGoogleIdentity, promptGoogleOneTap } from '@/lib/google-identity';
import { authService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';

jest.mock('@/lib/google-identity', () => ({
  ensureGoogleIdentity: jest.fn().mockResolvedValue(undefined),
  promptGoogleOneTap: jest.fn(),
}));
jest.mock('@/services/auth-service', () => ({
  authService: { googleOneTap: jest.fn() },
}));
const navigate = jest.fn();
jest.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

describe('useGoogleOneTap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null, isInitializing: false });
  });

  it('prompts when the user is anonymous and initialization has finished', async () => {
    renderHook(() => useGoogleOneTap());
    await waitFor(() => expect(ensureGoogleIdentity).toHaveBeenCalled());
    await waitFor(() => expect(promptGoogleOneTap).toHaveBeenCalled());
  });

  it('does not prompt when the user is already authenticated', async () => {
    useAuthStore.setState({ user: { email: 'a@b.c' }, isInitializing: false });
    renderHook(() => useGoogleOneTap());
    await waitFor(() => expect(ensureGoogleIdentity).toHaveBeenCalled());
    expect(promptGoogleOneTap).not.toHaveBeenCalled();
  });

  it('logs in and navigates when a credential arrives', async () => {
    jest
      .mocked(authService.googleOneTap)
      .mockResolvedValue({ user: { email: 'jane@example.com' } } as never);
    renderHook(() => useGoogleOneTap());
    await waitFor(() => expect(ensureGoogleIdentity).toHaveBeenCalled());
    const onCredential = jest.mocked(ensureGoogleIdentity).mock.calls[0][0].callback;

    await onCredential('cred-1');

    expect(authService.googleOneTap).toHaveBeenCalledWith('cred-1');
    expect(useAuthStore.getState().user).toEqual({ email: 'jane@example.com' });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @org/frontend --testFile=use-google-one-tap.spec.tsx`
Expected: FAIL — hook module not found.

- [ ] **Step 3: Implement the hook**

`apps/frontend/src/features/auth/use-google-one-tap.ts`:

```ts
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { appConfig } from '@/config/app-config';
import { ensureGoogleIdentity, promptGoogleOneTap } from '@/lib/google-identity';
import { authService } from '@/services/auth-service';
import { selectIsAuthenticated, selectIsInitializing, useAuthStore } from '@/stores/auth-store';

export function useGoogleOneTap(): void {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isInitializing = useAuthStore(selectIsInitializing);
  const clientId = appConfig.google.clientId;

  useEffect(() => {
    if (!clientId || isInitializing || isAuthenticated) {
      return;
    }
    let cancelled = false;

    const onCredential = async (credential: string) => {
      const result = await authService.googleOneTap(credential);
      useAuthStore.getState().setUser(result.user);
      await navigate({ to: '/' });
    };

    void ensureGoogleIdentity({ clientId, callback: onCredential }).then(() => {
      if (!cancelled) promptGoogleOneTap();
    });

    return () => {
      cancelled = true;
    };
  }, [clientId, isAuthenticated, isInitializing, navigate]);
}
```

- [ ] **Step 4: Implement the provider component**

`apps/frontend/src/features/auth/google-one-tap.tsx`:

```tsx
import { useGoogleOneTap } from './use-google-one-tap';

export function GoogleOneTap() {
  useGoogleOneTap();
  return null;
}
```

- [ ] **Step 5: Mount it in the router root**

In `apps/frontend/src/routes/__root.tsx`, import and render it inside `RootRoute` so it is active on every route and inside the router context:

```tsx
import { GoogleOneTap } from '@/features/auth/google-one-tap';

function RootRoute() {
  return (
    <>
      <GoogleOneTap />
      <Outlet />
      <Suspense>
        <QueryDevtools />
      </Suspense>
    </>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm nx test @org/frontend --testFile=use-google-one-tap.spec.tsx`
Expected: PASS (3 cases).

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/features/auth/use-google-one-tap.ts apps/frontend/src/features/auth/use-google-one-tap.spec.tsx apps/frontend/src/features/auth/google-one-tap.tsx apps/frontend/src/routes/__root.tsx
git commit -m "feat(frontend): app-wide Google One Tap prompt for anonymous users"
```

---

## Task 4: Google button in the login form

**Files:**

- Create: `apps/frontend/src/features/auth/google-sign-in-button.tsx`
- Test: `apps/frontend/src/features/auth/google-sign-in-button.spec.tsx`
- Modify: `apps/frontend/src/features/auth/login-form.tsx`

**Interfaces:**

- Consumes: `ensureGoogleIdentity` (Task 2), `appConfig.google.clientId`. The button relies on the credential callback registered once by the provider (Task 3); it only renders the official button.
- Produces: `<GoogleSignInButton />`.

- [ ] **Step 1: Write the failing test**

`apps/frontend/src/features/auth/google-sign-in-button.spec.tsx`:

```tsx
import { render, waitFor } from '@testing-library/react';
import { GoogleSignInButton } from './google-sign-in-button';
import { ensureGoogleIdentity } from '@/lib/google-identity';

const renderButton = jest.fn();
jest.mock('@/lib/google-identity', () => ({
  ensureGoogleIdentity: jest.fn().mockResolvedValue({ renderButton }),
}));

describe('GoogleSignInButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the official Google button into its container', async () => {
    render(<GoogleSignInButton />);
    await waitFor(() => expect(ensureGoogleIdentity).toHaveBeenCalled());
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));
    expect(renderButton.mock.calls[0][0]).toBeInstanceOf(HTMLElement);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @org/frontend --testFile=google-sign-in-button.spec.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement the button**

`apps/frontend/src/features/auth/google-sign-in-button.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { appConfig } from '@/config/app-config';
import { ensureGoogleIdentity } from '@/lib/google-identity';

export function GoogleSignInButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientId = appConfig.google.clientId;

  useEffect(() => {
    const container = containerRef.current;
    if (!clientId || !container) {
      return;
    }
    let cancelled = false;

    // The credential callback is registered once by <GoogleOneTap />; this only draws the button.
    void ensureGoogleIdentity({ clientId, callback: () => undefined }).then((identity) => {
      if (cancelled) return;
      identity.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: 320,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) {
    return null;
  }

  return <div ref={containerRef} className="grid place-items-center" />;
}
```

- [ ] **Step 4: Render it in the login form**

In `apps/frontend/src/features/auth/login-form.tsx`, import the button and add it in `CardFooter`, after the "Create an account" paragraph, with a divider:

```tsx
import { GoogleSignInButton } from './google-sign-in-button';
```

```tsx
            <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <GoogleSignInButton />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm nx test @org/frontend --testFile=google-sign-in-button.spec.tsx`
Expected: PASS.

- [ ] **Step 6: Full frontend check**

Run: `pnpm nx test @org/frontend`
Run: `pnpm nx build @org/frontend`
Run: `pnpm nx lint @org/frontend`
Expected: all green.

- [ ] **Step 7: Manual smoke test**

With `VITE_GOOGLE_CLIENT_ID` set and Plan 1 running: load any page while logged out → One Tap prompt appears; complete it → user is set and app navigates home. On `/login`, the Google button renders and completes the same flow. While logged in, no prompt appears.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/features/auth/google-sign-in-button.tsx apps/frontend/src/features/auth/google-sign-in-button.spec.tsx apps/frontend/src/features/auth/login-form.tsx
git commit -m "feat(frontend): add Google sign-in button to the login form"
```

---

## Self-Review

**Spec coverage:**

- §6.2 frontend config (`VITE_GOOGLE_CLIENT_ID`) → Task 1. ✓
- §8.1 app-wide One Tap provider, `use_fedcm_for_prompt`, prompt-when-anonymous → Task 2 (loader) + Task 3 (hook/provider). ✓
- §8.2 login-form button → Task 4. ✓
- §8.3 `authService.googleOneTap` → Task 2. ✓
- §10 FE error handling (prompt dismissed / script fails is silent; password login unaffected) → loader rejects are not surfaced; provider effect guards on `clientId` → Task 2/3. ✓

**Placeholder scan:** No TBD/TODO; every code step is complete. `test-setup.ts` edit (Task 1 Step 5) points at the existing file's config shape.

**Type consistency:** `ensureGoogleIdentity({ clientId, callback })`, `promptGoogleOneTap()`, `GoogleIdentityApi.renderButton`, `authService.googleOneTap(credential)`, `appConfig.google.clientId` are consistent across Tasks 2–4. The provider registers the credential callback once (Task 3); the button passes a no-op callback (Task 4) and only renders — consistent with the single-`initialize` design in Task 2.

## Note

One Tap has a dismissal cooldown (documented in the spec): after repeated dismissals Google suppresses the prompt for a period. This is expected browser behavior, not a bug; the login-form button (Task 4) is the always-available fallback.
