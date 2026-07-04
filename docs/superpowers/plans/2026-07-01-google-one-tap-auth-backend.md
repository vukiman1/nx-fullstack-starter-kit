# Google One Tap Auth — Backend Implementation Plan (Plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `POST /auth/google/one-tap` endpoint that verifies a Google ID token, auto-provisions/links a user by verified email, and issues the existing JWT+session cookies with a dedicated 30-day OAuth refresh lifetime.

**Architecture:** A per-provider verifier turns the Google credential into a normalized identity; a provider-agnostic `SocialAuthService.findOrLinkIdentity` resolves it to a `UserEntity`; the existing `AuthService` session tail issues cookies. Identities live in a polymorphic `auth_identities` table so GitHub/Facebook/SMS can be added later with no schema change.

**Tech Stack:** NestJS 11, TypeORM (PostgreSQL), Redis, `google-auth-library`, Jest, Nx, pnpm.

Spec: [docs/superpowers/specs/2026-07-01-google-one-tap-auth-design.md](../specs/2026-07-01-google-one-tap-auth-design.md)

## Global Constraints

- Node `>=26` (workspace pin); run all tasks through Nx: `pnpm nx <target> @org/backend`.
- No `any`. Backend tsconfig has `strictNullChecks: true`; type every signature explicitly.
- String enums only (debuggability), matching `Roles`.
- Every session/identity DB query is scoped by `userId` (or the unique identity key).
- Tests are Jest, colocated `*.spec.ts`; run with `pnpm nx test @org/backend`.
- The Google **client ID is public**; no client secret anywhere.
- Do not change password-login behavior; it must keep passing its existing specs.

---

## File Structure

**Create:**

- `packages/backend/enum/src/auth-provider.enum.ts` — `AuthProvider` string enum (shared by identities + sessions).
- `apps/backend/src/api/auth/enums/session-persistence.enum.ts` — `SessionPersistence` enum (TTL policy).
- `apps/backend/src/api/auth/entities/auth-identity.entity.ts` — `AuthIdentityEntity`.
- `apps/backend/src/api/auth/services/social/google-one-tap.verifier.ts` — `GoogleOneTapVerifier`.
- `apps/backend/src/api/auth/services/social/google-one-tap.verifier.spec.ts`
- `apps/backend/src/api/auth/services/social/social-auth.service.ts` — `SocialAuthService`.
- `apps/backend/src/api/auth/services/social/social-auth.service.spec.ts`
- `apps/backend/src/api/auth/services/social/normalized-identity.ts` — `NormalizedIdentity` type.
- `apps/backend/src/api/auth/dto/google-one-tap.dto.ts` — `GoogleOneTapDto`.
- `apps/backend/src/migrations/<ts>-AddSocialAuth.ts` — schema migration.

**Modify:**

- `packages/backend/enum/src/index.ts` — re-export `AuthProvider`.
- `packages/backend/config/src/index.ts` — add `google.clientId`, `session.refreshTtlOauth`.
- `apps/backend/config/*.yml` + `apps/backend/.env.example` — new config values.
- `apps/backend/package.json` — add `google-auth-library`.
- `apps/backend/src/api/user/entities/user.entity.ts` — `password` nullable + guarded hash hooks.
- `apps/backend/src/api/auth/entities/user-session.entity.ts` — add `authProvider`.
- `apps/backend/src/api/auth/services/user-session.service.ts` — accept + persist `authProvider`.
- `apps/backend/src/api/auth/services/session.service.ts` — `SessionPersistence` instead of `rememberMe`.
- `apps/backend/src/api/auth/services/session.service.spec.ts` — update to new signature.
- `apps/backend/src/api/auth/services/auth.service.ts` — cookie carries persistence; `issueSession` extracted; `loginWithGoogle` added.
- `apps/backend/src/api/auth/controllers/auth.user.controller.ts` — add route.
- `apps/backend/src/api/auth/auth.module.ts` — register entity + providers.
- `packages/shared/contracts/src/index.ts` — `GoogleOneTapPayload`, `AuthProvider` label.

---

## Task 1: Data model (identities, nullable password, session provider)

**Files:**

- Create: `packages/backend/enum/src/auth-provider.enum.ts`
- Modify: `packages/backend/enum/src/index.ts`
- Create: `apps/backend/src/api/auth/entities/auth-identity.entity.ts`
- Modify: `apps/backend/src/api/user/entities/user.entity.ts`
- Modify: `apps/backend/src/api/auth/entities/user-session.entity.ts`
- Create: `apps/backend/src/migrations/<ts>-AddSocialAuth.ts`
- Test: `apps/backend/src/api/user/entities/user.entity.spec.ts` (new)

**Interfaces:**

- Produces: `enum AuthProvider { LOCAL='local', GOOGLE='google' }`; `AuthIdentityEntity` with columns `userId, provider, providerAccountId, email, emailVerified, displayName, avatar, metadata`; `UserEntity.password: string | null`; `UserSessionEntity.authProvider: AuthProvider`.

- [ ] **Step 1: Write the failing test** — the argon2 hook must not hash a missing password.

`apps/backend/src/api/user/entities/user.entity.spec.ts`:

```ts
import { UserEntity } from './user.entity';

describe('UserEntity password hashing', () => {
  it('hashes a plaintext password on insert', async () => {
    const user = new UserEntity();
    user.password = 'plaintext-secret';
    await user.beforeInsert();
    expect(user.password).toMatch(/^\$argon2/);
  });

  it('leaves a null password untouched on insert (OAuth-only user)', async () => {
    const user = new UserEntity();
    user.password = null;
    await user.beforeInsert();
    expect(user.password).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @org/backend --testFile=user.entity.spec.ts`
Expected: FAIL — `beforeInsert` throws on `null` (argon2 hashes `undefined`).

- [ ] **Step 3: Create the `AuthProvider` enum**

`packages/backend/enum/src/auth-provider.enum.ts`:

```ts
export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}
```

`packages/backend/enum/src/index.ts` — add:

```ts
export * from './auth-provider.enum';
```

- [ ] **Step 4: Make `password` nullable and guard the hooks**

In `apps/backend/src/api/user/entities/user.entity.ts`, change the password column and hooks:

```ts
  @Column({ nullable: true, type: 'varchar', length: 255, name: 'password' })
  @Exclude()
  password!: string | null;

  @BeforeInsert()
  async beforeInsert() {
    if (this.password && !this.password.startsWith(ARGON2_HASH_PREFIX)) {
      this.password = await argon2.hash(this.password);
    }
  }

  @BeforeUpdate()
  async beforeUpdate() {
    if (this.password && !this.password.startsWith(ARGON2_HASH_PREFIX)) {
      this.password = await argon2.hash(this.password);
    }
  }
```

- [ ] **Step 5: Create `AuthIdentityEntity`**

`apps/backend/src/api/auth/entities/auth-identity.entity.ts`:

```ts
import { BaseEntity } from '@org/backend-base';
import { AuthProvider } from '@org/backend-enum';
import { Column, Entity, Index, Unique } from 'typeorm';

@Entity('auth_identities')
@Unique('uq_identity_provider_account', ['provider', 'providerAccountId'])
@Index('idx_identity_user', ['userId'])
export class AuthIdentityEntity extends BaseEntity {
  @Column({ type: 'uuid', nullable: false, name: 'user_id' })
  userId!: string;

  @Column({ type: 'enum', enum: AuthProvider, nullable: false, name: 'provider' })
  provider!: AuthProvider;

  @Column({ type: 'varchar', length: 255, nullable: false, name: 'provider_account_id' })
  providerAccountId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'email' })
  email: string | null;

  @Column({ type: 'boolean', nullable: false, default: false, name: 'email_verified' })
  emailVerified!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'display_name' })
  displayName: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'avatar' })
  avatar: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata: Record<string, unknown> | null;
}
```

- [ ] **Step 6: Add `authProvider` to `UserSessionEntity`**

In `apps/backend/src/api/auth/entities/user-session.entity.ts`, add the import and column (place next to `rememberMe`):

```ts
import { AuthProvider } from '@org/backend-enum';

  @Column({
    type: 'enum',
    enum: AuthProvider,
    nullable: false,
    default: AuthProvider.LOCAL,
    name: 'auth_provider',
  })
  authProvider!: AuthProvider;
```

- [ ] **Step 7: Run the entity test to verify it passes**

Run: `pnpm nx test @org/backend --testFile=user.entity.spec.ts`
Expected: PASS (both cases).

- [ ] **Step 8: Write the migration**

Create `apps/backend/src/migrations/<ts>-AddSocialAuth.ts` (use a millisecond timestamp greater than `1782719084470`; keep the class-name suffix identical to the file prefix):

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialAuth1782800000000 implements MigrationInterface {
  name = 'AddSocialAuth1782800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "auth_provider_enum" AS ENUM('local', 'google')`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD "auth_provider" "auth_provider_enum" NOT NULL DEFAULT 'local'`,
    );
    await queryRunner.query(`
      CREATE TABLE "auth_identities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        "provider" "auth_provider_enum" NOT NULL,
        "provider_account_id" character varying(255) NOT NULL,
        "email" character varying(255),
        "email_verified" boolean NOT NULL DEFAULT false,
        "display_name" character varying(255),
        "avatar" character varying(512),
        "metadata" jsonb,
        CONSTRAINT "pk_auth_identities" PRIMARY KEY ("id"),
        CONSTRAINT "uq_identity_provider_account" UNIQUE ("provider", "provider_account_id"),
        CONSTRAINT "fk_identity_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_identity_user" ON "auth_identities" ("user_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_identity_user"`);
    await queryRunner.query(`DROP TABLE "auth_identities"`);
    await queryRunner.query(`ALTER TABLE "user_sessions" DROP COLUMN "auth_provider"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`);
    await queryRunner.query(`DROP TYPE "auth_provider_enum"`);
  }
}
```

Note: confirm the `id`/timestamp column definitions match `BaseEntity` (the existing `CreateUsersTable` migration is the reference — copy its exact `id`/`created_at`/`updated_at` DDL if it differs from the above).

- [ ] **Step 9: Build migrations and run up/down to verify it is reversible**

Run:

```bash
pnpm nx build-migrations @org/backend
pnpm nx migration-run @org/backend
pnpm nx migration-revert @org/backend
pnpm nx migration-run @org/backend
```

Expected: `up` creates the table/column/type; `revert` drops them cleanly; re-run `up` succeeds (idempotent, reversible).

- [ ] **Step 10: Commit**

```bash
git add packages/backend/enum apps/backend/src/api/user/entities apps/backend/src/api/auth/entities apps/backend/src/migrations
git commit -m "feat(auth): add auth_identities model, nullable password, session provider"
```

---

## Task 2: Session persistence policy (30d OAuth TTL)

**Files:**

- Create: `apps/backend/src/api/auth/enums/session-persistence.enum.ts`
- Modify: `packages/backend/config/src/index.ts`, `apps/backend/config/*.yml`, `apps/backend/.env.example`
- Modify: `apps/backend/src/api/auth/services/session.service.ts`
- Modify: `apps/backend/src/api/auth/services/session.service.spec.ts`
- Modify: `apps/backend/src/api/auth/services/auth.service.ts`

**Interfaces:**

- Produces: `enum SessionPersistence { STANDARD='standard', REMEMBER='remember', OAUTH='oauth' }`; `SessionService.createSession(userId: string, persistence: SessionPersistence): Promise<IssuedSession>`; `rotateSession(userId, jti, persistence)`; `AuthService.issueSession(user, response, request, opts: { persistence: SessionPersistence; rememberMe: boolean; authProvider: AuthProvider }): Promise<{ user }>`.
- Consumes (Task 1): `AuthProvider`.

- [ ] **Step 1: Write the failing test** — OAuth persistence resolves to the 30d config key.

Add to `apps/backend/src/api/auth/services/session.service.spec.ts`. First extend the mocked config to answer the new key, then assert the OAuth path. Replace the `config.get` mock body with:

```ts
config = {
  get: jest.fn((key: string) => {
    if (key === 'session.maxSessionsPerUser') return 5;
    if (key === 'session.refreshTtl') return '1d';
    if (key === 'session.refreshTtlRemember') return '60d';
    if (key === 'session.refreshTtlOauth') return '30d';
    return undefined;
  }),
} as unknown as jest.Mocked<ConfigService>;
```

Update existing calls from booleans to the enum and add the OAuth case:

```ts
import { SessionPersistence } from '../enums/session-persistence.enum';

const OAUTH_TTL_MS = 30 * DAY_MS;

it('uses the 30-day OAuth lifetime for social logins', async () => {
  const session = await service.createSession('user-1', SessionPersistence.OAUTH);
  expect(session.refreshTokenTtlMs).toBe(OAUTH_TTL_MS);
  expect(redis.set).toHaveBeenCalledWith(
    expect.objectContaining({ value: 'refresh-jwt', expired: OAUTH_TTL_MS / 1000 }),
  );
});
```

Also change the two existing `createSession('user-1', false)` → `createSession('user-1', SessionPersistence.STANDARD)`, `createSession('user-1', true)` → `SessionPersistence.REMEMBER`, and both `rotateSession('user-1', 'jti-1', false)` → `SessionPersistence.STANDARD`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @org/backend --testFile=session.service.spec.ts`
Expected: FAIL — `SessionPersistence` module not found / `createSession` still expects a boolean.

- [ ] **Step 3: Create the `SessionPersistence` enum**

`apps/backend/src/api/auth/enums/session-persistence.enum.ts`:

```ts
export enum SessionPersistence {
  STANDARD = 'standard',
  REMEMBER = 'remember',
  OAUTH = 'oauth',
}
```

- [ ] **Step 4: Add the config key**

In `packages/backend/config/src/index.ts`, extend the `session` schema and its interface:

```ts
  session: z.object({
    maxSessionsPerUser: z.coerce.number().int().positive(),
    refreshTtl: durationSchema,
    refreshTtlRemember: durationSchema,
    refreshTtlOauth: durationSchema,
  }),
```

Add `refreshTtlOauth: '30d'` under `session:` in every `apps/backend/config/*.yml`, and a `# session.refreshTtlOauth=30d` note plus the source env key (if the yml reads from env) to `apps/backend/.env.example`.

- [ ] **Step 5: Refactor `SessionService` to persistence**

In `apps/backend/src/api/auth/services/session.service.ts`, replace the two TTL key constants and `resolveRefreshTtlMs`, and change the method signatures:

```ts
import { SessionPersistence } from '../enums/session-persistence.enum';

const REFRESH_TTL_CONFIG_KEYS: Record<SessionPersistence, string> = {
  [SessionPersistence.STANDARD]: 'session.refreshTtl',
  [SessionPersistence.REMEMBER]: 'session.refreshTtlRemember',
  [SessionPersistence.OAUTH]: 'session.refreshTtlOauth',
};
```

```ts
  async createSession(userId: string, persistence: SessionPersistence): Promise<IssuedSession> {
    const jti = randomUUID();
    const tokens = await this.issueTokens(userId, jti, this.resolveRefreshTtlMs(persistence));
    await this.enforceSessionLimit(userId);
    return { jti, ...tokens };
  }

  async rotateSession(
    userId: string,
    jti: string,
    persistence: SessionPersistence,
  ): Promise<SessionTokens> {
    const storedRefreshToken = await this.redisService.get(this.refreshTokenKey(userId, jti));
    if (!storedRefreshToken) {
      throw new UnauthorizedException();
    }
    await this.jwtService.verifyJwt(storedRefreshToken);
    return this.issueTokens(userId, jti, this.resolveRefreshTtlMs(persistence));
  }

  private resolveRefreshTtlMs(persistence: SessionPersistence): number {
    const key = REFRESH_TTL_CONFIG_KEYS[persistence];
    return parseDurationToMs(this.configService.get<string>(key) ?? '');
  }
```

Delete the old `REFRESH_TTL_CONFIG_KEY` / `REFRESH_TTL_REMEMBER_CONFIG_KEY` constants.

- [ ] **Step 6: Thread persistence through `AuthService` cookies + refresh**

In `apps/backend/src/api/auth/services/auth.service.ts`:

Change the cookie payload type and imports:

```ts
import { SessionPersistence } from '../enums/session-persistence.enum';
import { AuthProvider } from '@org/backend-enum';

interface SessionCookiePayload {
  id: string;
  jti: string;
  persistence: SessionPersistence;
}
```

Replace `login` with a thin wrapper over a shared `issueSession`, and add `issueSession`:

```ts
  async login(user: UserEntity, response: Response, request: Request, rememberMe: boolean) {
    const persistence = rememberMe ? SessionPersistence.REMEMBER : SessionPersistence.STANDARD;
    return this.issueSession(user, response, request, {
      persistence,
      rememberMe,
      authProvider: AuthProvider.LOCAL,
    });
  }

  async issueSession(
    user: UserEntity,
    response: Response,
    request: Request,
    opts: { persistence: SessionPersistence; rememberMe: boolean; authProvider: AuthProvider },
  ) {
    const { id, email, avatar, balance } = user;
    const session = await this.sessionService.createSession(id, opts.persistence);
    await this.userSessionService.createSession({
      userId: id,
      jti: session.jti,
      rememberMe: opts.rememberMe,
      authProvider: opts.authProvider,
      refreshTokenTtlMs: session.refreshTokenTtlMs,
      request,
    });

    this.setSessionCookies(response, {
      id,
      jti: session.jti,
      persistence: opts.persistence,
      accessToken: session.accessToken,
      accessTokenTtlMs: session.accessTokenTtlMs,
      refreshTokenTtlMs: session.refreshTokenTtlMs,
    });
    this.auditService.record(AuthEvent.LOGIN_SUCCEEDED, {
      userId: id,
      email,
      jti: session.jti,
      request,
    });

    return { user: { email, avatar, balance } };
  }
```

Update `refreshToken` to use persistence from the cookie:

```ts
const { id, jti, persistence } = this.decodeSessionCookie(request);
const { email, avatar, balance } = await this.getUserById(id, userType);
const tokens = await this.sessionService.rotateSession(id, jti, persistence);
```

and the `setSessionCookies(...)` call there passes `persistence` instead of `remember`.

Update `setSessionCookies` params (`persistence` instead of `remember`) and `encodeSessionCookie`/`parseSessionCookie` for backward compatibility with legacy `remember` cookies:

```ts
  private parseSessionCookie(raw: string): SessionCookiePayload | null {
    try {
      const parsed: unknown = JSON.parse(this.cryptoService.decryptData(raw));
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof (parsed as Record<string, unknown>).id === 'string' &&
        typeof (parsed as Record<string, unknown>).jti === 'string'
      ) {
        const record = parsed as Record<string, unknown>;
        return {
          id: record.id as string,
          jti: record.jti as string,
          persistence: coercePersistence(record),
        };
      }
      return null;
    } catch {
      return null;
    }
  }
```

Add a module-level helper:

```ts
function coercePersistence(record: Record<string, unknown>): SessionPersistence {
  const value = record.persistence;
  if (
    value === SessionPersistence.STANDARD ||
    value === SessionPersistence.REMEMBER ||
    value === SessionPersistence.OAUTH
  ) {
    return value;
  }
  // Legacy cookies stored `remember: boolean`.
  return record.remember === true ? SessionPersistence.REMEMBER : SessionPersistence.STANDARD;
}
```

- [ ] **Step 7: Update `UserSessionService.createSession` to persist `authProvider`**

In `apps/backend/src/api/auth/services/user-session.service.ts`, extend the param type and the created record:

```ts
type CreateUserSessionParams = {
  userId: string;
  jti: string;
  rememberMe: boolean;
  authProvider: AuthProvider;
  refreshTokenTtlMs: number;
  request: Request;
};
```

Add `import { AuthProvider } from '@org/backend-enum';`, destructure `authProvider`, and pass `authProvider` into `this.sessionRepo.create({ ... authProvider, ... })`. Add `authProvider` to `UserSessionSummary` and the `listActiveSessions` mapping (`authProvider: session.authProvider`).

- [ ] **Step 8: Run the affected tests**

Run: `pnpm nx test @org/backend --testFile=session.service.spec.ts`
Run: `pnpm nx test @org/backend --testFile=auth.service.spec.ts`
Run: `pnpm nx test @org/backend --testFile=user-session.service.spec.ts`
Expected: PASS. Fix any spec that still passes a boolean where the enum is now required (update those specs to `SessionPersistence.*` and add `authProvider: AuthProvider.LOCAL` to `createSession` param assertions).

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/api/auth packages/backend/config apps/backend/config apps/backend/.env.example
git commit -m "feat(auth): add OAuth session persistence with 30d refresh lifetime"
```

---

## Task 3: Google ID-token verifier

**Files:**

- Modify: `apps/backend/package.json` (add `google-auth-library`)
- Modify: `packages/backend/config/src/index.ts`, `apps/backend/config/*.yml`, `apps/backend/.env.example`
- Create: `apps/backend/src/api/auth/services/social/normalized-identity.ts`
- Create: `apps/backend/src/api/auth/services/social/google-one-tap.verifier.ts`
- Test: `apps/backend/src/api/auth/services/social/google-one-tap.verifier.spec.ts`

**Interfaces:**

- Produces: `interface NormalizedIdentity { provider: AuthProvider; providerAccountId: string; email: string; emailVerified: boolean; displayName?: string; avatar?: string }`; `GoogleOneTapVerifier.verify(credential: string): Promise<NormalizedIdentity>`.
- Consumes (Task 1): `AuthProvider`.

- [ ] **Step 1: Write the failing test**

`apps/backend/src/api/auth/services/social/google-one-tap.verifier.spec.ts`:

```ts
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@org/backend-enum';
import { GoogleOneTapVerifier } from './google-one-tap.verifier';

const verifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken })),
}));

function payload(overrides: Record<string, unknown> = {}) {
  return {
    getPayload: () => ({
      sub: 'google-sub-1',
      email: 'jane@example.com',
      email_verified: true,
      name: 'Jane',
      picture: 'https://pic',
      ...overrides,
    }),
  };
}

describe('GoogleOneTapVerifier', () => {
  let verifier: GoogleOneTapVerifier;

  beforeEach(() => {
    verifyIdToken.mockReset();
    const config = {
      get: jest.fn((key: string) => (key === 'google.clientId' ? 'client-123' : undefined)),
    } as unknown as ConfigService;
    verifier = new GoogleOneTapVerifier(config);
  });

  it('returns a normalized identity for a valid verified token', async () => {
    verifyIdToken.mockResolvedValue(payload());
    const identity = await verifier.verify('good-token');
    expect(identity).toEqual({
      provider: AuthProvider.GOOGLE,
      providerAccountId: 'google-sub-1',
      email: 'jane@example.com',
      emailVerified: true,
      displayName: 'Jane',
      avatar: 'https://pic',
    });
    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'good-token', audience: 'client-123' });
  });

  it('rejects an unverified email with 403', async () => {
    verifyIdToken.mockResolvedValue(payload({ email_verified: false }));
    await expect(verifier.verify('t')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an invalid token with 401', async () => {
    verifyIdToken.mockRejectedValue(new Error('bad token'));
    await expect(verifier.verify('t')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @org/backend --testFile=google-one-tap.verifier.spec.ts`
Expected: FAIL — verifier module not found.

- [ ] **Step 3: Add the dependency**

In `apps/backend/package.json`, add to `dependencies`:

```json
"google-auth-library": "^10.4.0"
```

Run: `pnpm install`

- [ ] **Step 4: Add the `google.clientId` config**

In `packages/backend/config/src/index.ts`, add to the schema and interface:

```ts
  google: z.object({
    clientId: z.string().min(1),
  }),
```

Wire the value from env (`GOOGLE_CLIENT_ID`) in the same place other secrets are read (`apps/backend/config/*.yml` `google.clientId: ${GOOGLE_CLIENT_ID}` or the node-config equivalent). Add `GOOGLE_CLIENT_ID=` to `apps/backend/.env.example`.

- [ ] **Step 5: Create the `NormalizedIdentity` type and verifier**

`apps/backend/src/api/auth/services/social/normalized-identity.ts`:

```ts
import { AuthProvider } from '@org/backend-enum';

export interface NormalizedIdentity {
  provider: AuthProvider;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  avatar?: string;
}
```

`apps/backend/src/api/auth/services/social/google-one-tap.verifier.ts`:

```ts
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@org/backend-enum';
import { OAuth2Client } from 'google-auth-library';
import { NormalizedIdentity } from './normalized-identity';

const GOOGLE_CLIENT_ID_CONFIG_KEY = 'google.clientId';

@Injectable()
export class GoogleOneTapVerifier {
  private readonly clientId: string;
  private readonly client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>(GOOGLE_CLIENT_ID_CONFIG_KEY) ?? '';
    this.client = new OAuth2Client(this.clientId);
  }

  async verify(credential: string): Promise<NormalizedIdentity> {
    const payload = await this.verifyToken(credential);
    if (!payload?.email || payload.email_verified !== true) {
      throw new ForbiddenException('Google account email is not verified');
    }
    return {
      provider: AuthProvider.GOOGLE,
      providerAccountId: payload.sub,
      email: payload.email,
      emailVerified: true,
      displayName: payload.name,
      avatar: payload.picture,
    };
  }

  private async verifyToken(credential: string) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: this.clientId,
      });
      return ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google credential');
    }
  }
}
```

Note: `verifyIdToken` already enforces `aud`, `iss`, and `exp`; the `email_verified` check is the extra policy gate.

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm nx test @org/backend --testFile=google-one-tap.verifier.spec.ts`
Expected: PASS (3 cases).

- [ ] **Step 7: Commit**

```bash
git add apps/backend/package.json pnpm-lock.yaml packages/backend/config apps/backend/config apps/backend/.env.example apps/backend/src/api/auth/services/social
git commit -m "feat(auth): add Google One Tap ID-token verifier"
```

---

## Task 4: Find-or-link identity

**Files:**

- Create: `apps/backend/src/api/auth/services/social/social-auth.service.ts`
- Test: `apps/backend/src/api/auth/services/social/social-auth.service.spec.ts`

**Interfaces:**

- Produces: `SocialAuthService.findOrLinkIdentity(identity: NormalizedIdentity): Promise<UserEntity>`.
- Consumes: `NormalizedIdentity` (Task 3), `AuthIdentityEntity` (Task 1), `UserService.getOne/create/update`, `UserEntity`.

- [ ] **Step 1: Write the failing test**

`apps/backend/src/api/auth/services/social/social-auth.service.spec.ts`:

```ts
import { AuthProvider } from '@org/backend-enum';
import { SocialAuthService } from './social-auth.service';
import { NormalizedIdentity } from './normalized-identity';

const identity: NormalizedIdentity = {
  provider: AuthProvider.GOOGLE,
  providerAccountId: 'sub-1',
  email: 'jane@example.com',
  emailVerified: true,
  displayName: 'Jane',
  avatar: 'https://pic',
};

describe('SocialAuthService.findOrLinkIdentity', () => {
  let identityRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let userService: { getOne: jest.Mock; create: jest.Mock; update: jest.Mock };
  let service: SocialAuthService;

  beforeEach(() => {
    identityRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'identity-1', ...v })),
    };
    userService = {
      getOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => Promise.resolve({ id: 'user-new', ...v })),
      update: jest.fn((u, v) => Promise.resolve({ ...u, ...v })),
    };
    service = new SocialAuthService(identityRepo as never, userService as never);
  });

  it('returns the linked user when the identity already exists', async () => {
    identityRepo.findOne.mockResolvedValue({ userId: 'user-9' });
    userService.getOne.mockResolvedValue({ id: 'user-9', email: 'jane@example.com' });
    const user = await service.findOrLinkIdentity(identity);
    expect(user.id).toBe('user-9');
    expect(userService.create).not.toHaveBeenCalled();
  });

  it('links to an existing user by verified email', async () => {
    userService.getOne.mockResolvedValue({ id: 'user-5', email: 'jane@example.com' });
    const user = await service.findOrLinkIdentity(identity);
    expect(user.id).toBe('user-5');
    expect(identityRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-5', providerAccountId: 'sub-1' }),
    );
    expect(userService.create).not.toHaveBeenCalled();
  });

  it('creates a new verified user when no account exists', async () => {
    const user = await service.findOrLinkIdentity(identity);
    expect(userService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'jane@example.com',
        isEmailVerified: true,
        avatar: 'https://pic',
      }),
    );
    expect(identityRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-new', provider: AuthProvider.GOOGLE }),
    );
    expect(user.id).toBe('user-new');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @org/backend --testFile=social-auth.service.spec.ts`
Expected: FAIL — `SocialAuthService` not found.

- [ ] **Step 3: Implement `SocialAuthService`**

`apps/backend/src/api/auth/services/social/social-auth.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthIdentityEntity } from '../../entities/auth-identity.entity';
import { UserEntity } from '../../../user/entities/user.entity';
import { UserService } from '../../../user/user.service';
import { NormalizedIdentity } from './normalized-identity';

@Injectable()
export class SocialAuthService {
  constructor(
    @InjectRepository(AuthIdentityEntity)
    private readonly identityRepo: Repository<AuthIdentityEntity>,
    private readonly userService: UserService,
  ) {}

  async findOrLinkIdentity(identity: NormalizedIdentity): Promise<UserEntity> {
    const existing = await this.identityRepo.findOne({
      where: { provider: identity.provider, providerAccountId: identity.providerAccountId },
    });
    if (existing) {
      return this.userService.getOneOrFail({ id: existing.userId });
    }

    const user = (await this.userService.getOne({ email: identity.email }))
      ? await this.linkToExistingUser(identity)
      : await this.createUserWithIdentity(identity);

    return user;
  }

  private async linkToExistingUser(identity: NormalizedIdentity): Promise<UserEntity> {
    const user = await this.userService.getOneOrFail({ email: identity.email });
    if (identity.emailVerified && !user.isEmailVerified) {
      await this.userService.update(user, { isEmailVerified: true });
    }
    await this.saveIdentity(user.id, identity);
    return user;
  }

  private async createUserWithIdentity(identity: NormalizedIdentity): Promise<UserEntity> {
    const user = await this.userService.create({
      email: identity.email,
      isEmailVerified: identity.emailVerified,
      avatar: identity.avatar ?? null,
    });
    await this.saveIdentity(user.id, identity);
    return user;
  }

  private saveIdentity(userId: string, identity: NormalizedIdentity): Promise<AuthIdentityEntity> {
    return this.identityRepo.save(
      this.identityRepo.create({
        userId,
        provider: identity.provider,
        providerAccountId: identity.providerAccountId,
        email: identity.email,
        emailVerified: identity.emailVerified,
        displayName: identity.displayName ?? null,
        avatar: identity.avatar ?? null,
      }),
    );
  }
}
```

Note: the test's `getOne` returns a truthy user for the link case, and `getOneOrFail` is used to load it; in the spec, stub `getOneOrFail` too if the link test exercises it — add `getOneOrFail: jest.fn().mockResolvedValue({ id: 'user-5', ... })` to the mock. (The concurrent-create race is handled by the DB `uq_identity_provider_account` constraint; a follow-up integration test under Task 5 covers it end-to-end.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test @org/backend --testFile=social-auth.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/auth/services/social
git commit -m "feat(auth): resolve social identity to a user (find/link/create)"
```

---

## Task 5: Endpoint, service wiring, module, contracts

**Files:**

- Create: `apps/backend/src/api/auth/dto/google-one-tap.dto.ts`
- Modify: `apps/backend/src/api/auth/services/auth.service.ts` (add `loginWithGoogle`)
- Modify: `apps/backend/src/api/auth/controllers/auth.user.controller.ts`
- Modify: `apps/backend/src/api/auth/auth.module.ts`
- Modify: `packages/shared/contracts/src/index.ts`
- Test: `apps/backend/src/api/auth/services/auth.service.spec.ts` (add `loginWithGoogle` case)

**Interfaces:**

- Consumes: `GoogleOneTapVerifier.verify` (Task 3), `SocialAuthService.findOrLinkIdentity` (Task 4), `AuthService.issueSession` (Task 2).
- Produces: `POST /auth/google/one-tap` → `{ user }` + `Set-Cookie` ×2.

- [ ] **Step 1: Write the failing test** — `AuthService.loginWithGoogle` verifies, resolves, and issues an OAuth session.

Add to `apps/backend/src/api/auth/services/auth.service.spec.ts` (extend its existing mock setup with `verifier` + `socialAuthService`; wire them into the `AuthService` constructor):

```ts
it('loginWithGoogle issues a session for the resolved user', async () => {
  verifier.verify.mockResolvedValue({
    provider: AuthProvider.GOOGLE,
    providerAccountId: 'sub-1',
    email: 'jane@example.com',
    emailVerified: true,
  });
  socialAuthService.findOrLinkIdentity.mockResolvedValue({
    id: 'user-1',
    email: 'jane@example.com',
    avatar: null,
    balance: 0,
  });
  const issueSpy = jest.spyOn(service, 'issueSession');

  const result = await service.loginWithGoogle('cred', response, request);

  expect(verifier.verify).toHaveBeenCalledWith('cred');
  expect(issueSpy).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'user-1' }),
    response,
    request,
    expect.objectContaining({
      persistence: SessionPersistence.OAUTH,
      rememberMe: false,
      authProvider: AuthProvider.GOOGLE,
    }),
  );
  expect(result.user.email).toBe('jane@example.com');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @org/backend --testFile=auth.service.spec.ts`
Expected: FAIL — `loginWithGoogle` / injected deps missing.

- [ ] **Step 3: Add `loginWithGoogle` to `AuthService`**

Inject the two new services in the constructor and add:

```ts
  async loginWithGoogle(credential: string, response: Response, request: Request) {
    const identity = await this.googleOneTapVerifier.verify(credential);
    const user = await this.socialAuthService.findOrLinkIdentity(identity);
    return this.issueSession(user, response, request, {
      persistence: SessionPersistence.OAUTH,
      rememberMe: false,
      authProvider: AuthProvider.GOOGLE,
    });
  }
```

Constructor additions:

```ts
    private readonly googleOneTapVerifier: GoogleOneTapVerifier,
    private readonly socialAuthService: SocialAuthService,
```

with imports for `GoogleOneTapVerifier` and `SocialAuthService`.

- [ ] **Step 4: Create the DTO**

`apps/backend/src/api/auth/dto/google-one-tap.dto.ts`:

```ts
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleOneTapDto {
  @IsString()
  @IsNotEmpty()
  credential!: string;
}
```

- [ ] **Step 5: Add the controller route**

In `apps/backend/src/api/auth/controllers/auth.user.controller.ts`, add imports (`Res`, `Response`, `GoogleOneTapDto`) and the route (public — no guards):

```ts
  @Post('google/one-tap')
  @HttpCode(200)
  @Throttle(STRICT_THROTTLE)
  async googleOneTap(
    @Body() body: GoogleOneTapDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.loginWithGoogle(body.credential, response, request);
  }
```

- [ ] **Step 6: Register providers and entity in the module**

In `apps/backend/src/api/auth/auth.module.ts`:

- add `AuthIdentityEntity` to `TypeOrmModule.forFeature([UserSessionEntity, AuthIdentityEntity])`;
- add `GoogleOneTapVerifier` and `SocialAuthService` to `providers`.

- [ ] **Step 7: Add shared contracts**

In `packages/shared/contracts/src/index.ts`:

```ts
export interface GoogleOneTapPayload {
  credential: string;
}
```

Add an `authProvider` field to `UserLoginSession` (`authProvider: string`) so the sessions list can label the login method. Response reuses `LoginResponse`.

- [ ] **Step 8: Run the service tests + typecheck + build**

Run: `pnpm nx test @org/backend --testFile=auth.service.spec.ts`
Run: `pnpm nx build @org/backend`
Expected: tests PASS; build compiles (0 errors, 0 warnings).

- [ ] **Step 9: Manual endpoint check (Bruno) + race note**

Add a Bruno request in `apps/backend/bruno-nx` for `POST {{baseUrl}}/auth/google/one-tap` with body `{ "credential": "<paste a real Google ID token from the frontend>" }`. Verify a `200` with `{ data: { user } }` and two `Set-Cookie` headers on first login, and that a second call with the same account returns the same user (identity reused, no duplicate row). Invalid credential → `401`; a token whose `email_verified` is false → `403`.

- [ ] **Step 10: Commit**

```bash
git add apps/backend/src/api/auth packages/shared/contracts
git commit -m "feat(auth): add POST /auth/google/one-tap endpoint"
```

---

## Self-Review

**Spec coverage:**

- §5 data model → Task 1 (identities table, nullable password, session provider). ✓
- §6 config → Task 2 (`refreshTtlOauth`) + Task 3 (`google.clientId`). ✓
- §7.1 verifier → Task 3. ✓
- §7.2 findOrLinkIdentity → Task 4. ✓
- §7.3 session tail reuse → Task 2 (`issueSession`) + Task 5 (`loginWithGoogle`). ✓
- §7.4 endpoint → Task 5. ✓
- §7.5 TTL wiring (persistence in cookie, preserved on refresh) → Task 2. ✓
- §9 contracts → Task 5. ✓
- §10 error handling (401/403/race) → Task 3 (401/403) + Task 4/Task 5 step 9 (race). ✓
- §11 security (aud/iss/exp verified, no secret) → Task 3. ✓
- Frontend (§8) → Plan 2 (separate).

**Placeholder scan:** No TBD/TODO; every code step shows real code. Two "confirm against existing file" notes (migration `id` DDL in Task 1 Step 8; env wiring in Task 3 Step 4) point at concrete reference files, not deferred work.

**Type consistency:** `SessionPersistence` and `AuthProvider` names/values consistent across Tasks 1–5; `createSession(userId, persistence)`, `rotateSession(userId, jti, persistence)`, `issueSession(user, response, request, {persistence, rememberMe, authProvider})`, `NormalizedIdentity`, `findOrLinkIdentity`, `loginWithGoogle(credential, response, request)` all match their producers/consumers.

## Deviation from spec (note for reviewer)

The spec §7.5 said the session TTL is driven by an OAuth policy. Implementation detail discovered while reading the code: the encrypted `sub` cookie previously stored `remember: boolean`, and refresh re-derived the TTL from it. To keep the 30-day lifetime across refreshes, the cookie now carries `persistence` (with backward-compatible parsing of legacy `remember` cookies). This is captured in Task 2 Step 6.
