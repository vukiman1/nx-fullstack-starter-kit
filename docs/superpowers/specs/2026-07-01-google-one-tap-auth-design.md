# Google One Tap Authentication — Design

Date: 2026-07-01
Status: Approved for planning

## 1. Goal

Add "Sign in with Google One Tap" to the app: a frictionless, one-tap login that
auto-provisions or links a user by their verified Google email, then issues the
same session (JWT access cookie + refresh session cookie) as password login.

The data model is designed so that GitHub, Facebook, and phone/SMS auth can be
added later **without a schema migration** — only a new per-provider verifier plus,
where relevant, an OAuth redirect route.

## 2. Non-goals

- Full OAuth authorization-code flow (redirect + client secret). One Tap only needs
  ID-token verification. GitHub/Facebook will add the code flow when they are built.
- SMS/phone auth implementation. The data model reserves room for it; the flow is out
  of scope here.
- An account-management "linked accounts" settings UI. Auto-linking happens silently on
  first Google login (see §5). A management UI is future work.
- Nonce-based replay protection (see §11, deferred hardening).

## 3. Locked decisions

| Decision                | Choice                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Scope                   | Frontend One Tap prompt + backend ID-token verification                                                                        |
| Account policy          | Auto-provision new email; auto-link existing email by verified Google email                                                    |
| Frontend UX             | App-wide auto-prompt for anonymous users + rendered Google button in the login form                                            |
| Backend flow            | Verify Google ID token via `google-auth-library`; public endpoint `POST /auth/google/one-tap`; reuse existing session issuance |
| Identity model          | Polymorphic `auth_identities` table (NOT a `googleId` column); `user.password` becomes nullable                                |
| Session tracking        | Add `authProvider` to `user_sessions`                                                                                          |
| Refresh TTL             | 30 days, dedicated config `session.refreshTtlOauth`                                                                            |
| rememberMe              | Defaults to `false` for One Tap (no checkbox); TTL is driven by the OAuth policy, not rememberMe                               |
| Nonce replay protection | Deferred (documented as future hardening)                                                                                      |

## 4. Architecture overview

```
Frontend (React / GIS)                    Backend (NestJS)
─────────────────────                     ────────────────
GoogleOneTapProvider (app root)
  loads GIS, prompt() when anonymous
        │  credential = Google ID token (JWT)
        ▼
authService.googleOneTap(credential) ──►  POST /auth/google/one-tap  (public, no captcha)
                                              │
                                              ▼
                                          GoogleOneTapVerifier.verify(credential)
                                              │  → normalized identity
                                              ▼
                                          SocialAuthService.findOrLinkIdentity(identity)
                                              │  → UserEntity (created / linked / found)
                                              ▼
                                          AuthService session tail (REUSED):
                                            SessionService.createSession(userId, OAUTH policy)
                                            UserSessionService.createSession({provider: GOOGLE})
                                            setCookie(access_token), setCookie(sub)
                                            audit LOGIN_SUCCEEDED (provider=google)
                                              │  → { user }, Set-Cookie ×2
        ◄─────────────────────────────────────┘
setUser(user) in Zustand store
```

The credential-acquisition "head" is provider-specific. The identity-resolution and
session-issuance "tail" is shared across all current and future providers.

## 5. Data model

### 5.1 New table: `auth_identities`

One row per external identity linked to a user. A user may have many identities plus
an optional password.

| Column                    | Type                 | Notes                                                |
| ------------------------- | -------------------- | ---------------------------------------------------- |
| `id`                      | uuid PK              | from BaseEntity                                      |
| `userId`                  | uuid FK → `users.id` | cascade on user delete                               |
| `provider`                | enum `AuthProvider`  | `GOOGLE` now; `GITHUB`, `FACEBOOK`, `PHONE`, … later |
| `providerAccountId`       | varchar              | Google `sub` / GitHub id / phone number              |
| `email`                   | varchar, nullable    | email reported by provider at link time              |
| `emailVerified`           | boolean              | provider's verification flag                         |
| `displayName`             | varchar, nullable    | profile snapshot                                     |
| `avatar`                  | varchar, nullable    | profile snapshot                                     |
| `metadata`                | jsonb, nullable      | provider-specific extras                             |
| `createdAt` / `updatedAt` | timestamptz          | from BaseEntity                                      |

Constraints/indexes:

- `UNIQUE(provider, providerAccountId)` — the identity lookup key.
- Index on `userId`.

`AuthProvider` is a string enum (debuggable) with a `LOCAL` member reserved for the
password method so it can share the same enum with `user_sessions.authProvider`.

### 5.2 `UserEntity` changes

- `password` → **nullable** (Google-only users have no password).
- No `googleId` column (superseded by `auth_identities`).
- `isEmailVerified` is set to `true` when the linking provider reports the email verified.
- `avatar` is backfilled from the provider snapshot only when the user has none.

### 5.3 `UserSessionEntity` change

- Add `authProvider: AuthProvider` (default `LOCAL`) so the sessions list can show how
  each session was established.

## 6. Config

### 6.1 Backend (`packages/backend/config/src/index.ts`)

Add to the Zod schema:

```ts
google: z.object({
  clientId: z.string().min(1), // from GOOGLE_CLIENT_ID
}),
session: z.object({
  maxSessionsPerUser: z.coerce.number().int().positive(),
  refreshTtl: durationSchema,
  refreshTtlRemember: durationSchema,
  refreshTtlOauth: durationSchema, // NEW, e.g. "30d"
}),
```

Add `GOOGLE_CLIENT_ID` and the `session.refreshTtlOauth` default (`30d`) to
`apps/backend/config/*.yml` and `apps/backend/.env.example`. The Google **client ID is
public** — no client secret is required for ID-token verification.

### 6.2 Frontend

Expose `VITE_GOOGLE_CLIENT_ID` through the existing public-config injection
(`apps/frontend/src/config/app-config.ts` + `types.ts` + `.env.example`).

## 7. Backend implementation

Files live under the existing auth module `apps/backend/src/api/auth/`.

### 7.1 `GoogleOneTapVerifier` (services/social/)

```ts
verify(credential: string): Promise<NormalizedIdentity>
```

- Uses `google-auth-library`'s `OAuth2Client.verifyIdToken({ idToken, audience: clientId })`.
- Validates `iss ∈ {accounts.google.com, https://accounts.google.com}`, `aud === clientId`,
  and `exp` (library-enforced).
- Rejects when `email_verified !== true` → `403`.
- Returns `NormalizedIdentity`:
  ```ts
  interface NormalizedIdentity {
    provider: AuthProvider; // GOOGLE
    providerAccountId: string; // payload.sub
    email: string;
    emailVerified: boolean;
    displayName?: string; // payload.name
    avatar?: string; // payload.picture
  }
  ```

### 7.2 `SocialAuthService.findOrLinkIdentity(identity)` (shared tail)

Provider-agnostic. Returns the `UserEntity` to log in.

1. Look up `auth_identities` by `(provider, providerAccountId)`.
   - Found → load and return its user (refresh profile snapshot if changed).
2. Not found → look up `users` by `identity.email`.
   - User exists → create an `auth_identities` row linked to that user (**auto-link**).
     Set `isEmailVerified = true` if provider-verified.
   - No user → create `users` (no password, `isEmailVerified` from provider, avatar from
     snapshot) **and** the `auth_identities` row, inside one transaction.
3. Race safety: creation is guarded by `UNIQUE(provider, providerAccountId)` and the
   users email unique index; on conflict, re-run the lookup and return the existing user.

### 7.3 Session issuance (reused)

After `findOrLinkIdentity`, reuse the existing tail. `AuthService` exposes the shared
session-issuance path so Google login and password login converge:

- `SessionService.createSession(userId, persistence)` — see §7.5 for the TTL change.
- `UserSessionService.createSession({ userId, jti, request, authProvider: GOOGLE })`.
- `setCookie(response, ACCESS_TOKEN, …)` and `setCookie(response, SUB, …)`.
- `authAudit.record(LOGIN_SUCCEEDED, { provider: GOOGLE, … })`.
- Returns the existing `{ user }` shape (`LoginResponse`).

### 7.4 Endpoint

- `POST /auth/google/one-tap` on `AuthUserController`.
- **Public**: no `CaptchaGuard`, no `AuthGuard(LOCAL)` — Google already proved the human
  and the identity.
- Body validated (`class-validator`/Zod, matching the module's convention):
  `{ credential: string (non-empty) }`.
- Handler: `verifier.verify(credential)` → `findOrLinkIdentity` → session tail →
  `{ user }` with the two `Set-Cookie` headers.

### 7.5 Session TTL wiring (30d for OAuth)

`SessionService.resolveRefreshTtlMs` currently switches on a `rememberMe` boolean between
`session.refreshTtl` and `session.refreshTtlRemember`. A boolean cannot express a third
policy, so replace it with a small discriminator:

```ts
enum SessionPersistence {
  STANDARD,
  REMEMBER,
  OAUTH,
}
```

- `createSession(userId, persistence)` and `rotateSession(…)` take `SessionPersistence`.
- Password login maps `rememberMe` → `REMEMBER | STANDARD` (behavior unchanged).
- Google login passes `OAUTH` → `session.refreshTtlOauth` (30d).
- The `sub` refresh cookie `maxAge` follows the same resolved TTL, so refresh-on-401 and
  session limits keep working unchanged.

## 8. Frontend implementation

### 8.1 App-wide One Tap — `GoogleOneTapProvider`

Mounted at the app root. Responsibilities:

- Load the GIS script once (`https://accounts.google.com/gsi/client`).
- `google.accounts.id.initialize({ client_id, callback, use_fedcm_for_prompt: true })`.
- When the user is anonymous (`selectIsAuthenticated === false`) and not initializing,
  call `google.accounts.id.prompt()`.
- `callback({ credential })` → `authService.googleOneTap(credential)` → `setUser` →
  navigate (respecting an existing `?redirect=` param when on the login route).
- Cancel/close prompt is silent; password login stays available.

### 8.2 Login form button

In `apps/frontend/src/features/auth/login-form.tsx`, render the Google button via
`google.accounts.id.renderButton(ref, { … })` next to the password form. Same callback
path as the provider.

### 8.3 Service

`apps/frontend/src/services/auth-service.ts`:

```ts
googleOneTap(credential: string): Promise<LoginResponse>
// POST /auth/google/one-tap, axios withCredentials, unwrap ApiSuccessEnvelope
```

## 9. Shared contracts (`packages/shared/contracts/src/index.ts`)

```ts
interface GoogleOneTapPayload {
  credential: string;
}
// response reuses the existing LoginResponse { user }
```

`AuthProvider` enum is shared where the frontend needs to label a session
(`UserLoginSession.authProvider`).

## 10. Error handling

| Situation                                                      | Result                                                                |
| -------------------------------------------------------------- | --------------------------------------------------------------------- |
| Invalid / expired / malformed ID token, or `aud` mismatch      | `401 Unauthorized`                                                    |
| `email_verified === false`                                     | `403 Forbidden` (no user created)                                     |
| Unique-constraint conflict on concurrent first login           | Re-lookup identity, proceed (no error surfaced)                       |
| GIS script fails to load / prompt dismissed / FedCM suppressed | Silent on FE; password login unaffected                               |
| `SESSION_LIMIT` reached                                        | Existing eviction behavior (oldest session revoked) applies unchanged |

No secrets or tokens are logged. Audit records the event and provider only.

## 11. Security

- Google **client ID is public**; safe to expose to the frontend. No client secret is used.
- The server verifies `aud`, `iss`, and `exp` on every credential — the client token is
  never trusted blindly.
- Auto-link is keyed on the provider's `email_verified` flag; unverified emails are rejected,
  so a Google login cannot hijack an account whose email Google has not verified.
- Cookies remain `httpOnly` + `SameSite=Lax` + `Secure` in production (unchanged).
- **Deferred hardening (future):** nonce-based replay protection. It requires a server
  round-trip to mint a nonce before `prompt()`, so it is out of scope for v1. Documented
  here so it is a conscious omission, not an oversight.

## 12. Extensibility — adding GitHub / Facebook / SMS later

Everything below is already provided by this design; a new provider only adds its own
verifier (and, for OAuth code flows, a redirect route):

- **Shared, no change needed:** `auth_identities` table, `AuthProvider` enum,
  `SocialAuthService.findOrLinkIdentity`, the session-issuance tail, `authProvider` on
  sessions, the `SessionPersistence.OAUTH` TTL.
- **GitHub / Facebook (OAuth code flow):** add `GithubOAuthVerifier` / `FacebookOAuthVerifier`
  that exchange the auth code for a token, fetch the profile, and return a
  `NormalizedIdentity`. Add redirect routes (`GET /auth/{provider}` → `GET /auth/{provider}/callback`)
  and provider `clientId` + **clientSecret** config. These reuse `findOrLinkIdentity`.
- **SMS/phone:** add `PHONE` to `AuthProvider`, an OTP send/verify service, and an endpoint
  that establishes the identity (`providerAccountId = phone number`) then calls
  `findOrLinkIdentity`. No OAuth involved; the session tail is still reused.

Per the rule of three, this design implements **only** the Google verifier now. It does not
stub the other verifiers or build an N-provider framework prematurely.

## 13. Testing

- **`GoogleOneTapVerifier`** (unit): mock `verifyIdToken`; assert reject on bad `aud`/`iss`/`exp`
  and on `email_verified=false`; assert normalized shape.
- **`SocialAuthService.findOrLinkIdentity`** (unit/integration): new-email create,
  existing-email auto-link, existing-identity returns same user, concurrent-create race.
- **Endpoint** (Bruno, `apps/backend/bruno-nx`): success sets both cookies and returns `{ user }`;
  invalid credential → 401; unverified email → 403. Verification is mocked in the test env.
- **Session TTL:** OAUTH policy resolves to `refreshTtlOauth` (30d); password paths unchanged.
- **Frontend** (`GoogleOneTapProvider` hook): prompts only when anonymous; credential callback
  calls the service and sets the user; no prompt when authenticated.

## 14. Migration plan

1. TypeORM migration: create `auth_identities` (+ enum), make `users.password` nullable,
   add `user_sessions.authProvider` (default `LOCAL`).
2. No backfill required — existing users keep password login; identities are created lazily
   on first Google login.
3. Config/env additions (`GOOGLE_CLIENT_ID`, `session.refreshTtlOauth`, `VITE_GOOGLE_CLIENT_ID`)
   must be present before enabling the feature.

## 15. Rollout

Feature is inert until `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` are configured, so it can
merge dark and be enabled per environment.
