<div align="center">

# Nx Fullstack Starter Kit

A production-ready fullstack monorepo template — **NestJS backend** + **React frontend** + **Nx tooling**, batteries included.

[![Nx](https://img.shields.io/badge/Nx-23.1-143055?logo=nx&logoColor=white)](https://nx.dev)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com)

</div>

---

## ✨ Highlights

- **Nx monorepo** — incremental build, computation caching, task graph, affected commands.
- **NestJS 11** backend with TypeORM (Postgres), Redis, JWT auth, Swagger/OpenAPI.
- **React 19** frontend with Vite, TanStack Router, Tailwind 4, shadcn/radix UI.
- **Full auth flow** — password + Google One Tap, email verification by code, password reset, optional TOTP two-factor with recovery codes, per-device session list and revocation.
- **Shared packages** — `@org/backend-*` for reusable infrastructure, `@org/shared-contracts` for DTOs used by both sides.
- **Hardened by default** — helmet, CORS allow-list, rate limiting, health probes, Sentry on both ends.
- **Docker compose** — Postgres + Redis + backend + frontend, with profiles separating dev and prod.
- **CI/CD** — GitHub Actions (pull-request + push-dev), Nx Cloud remote cache.
- **Husky hooks** — pre-commit (lint-staged), commit-msg (commitlint), pre-push (`nx affected -t lint typecheck`).
- **GitHub repo config-as-code** — Probot Settings for labels, branch protection, release note grouping.
- **Auto PR labels** — derived from the PR title (`feat(backend): ...`) into `type/*` + `scope/*`.

## 📦 Stack

### Backend (`apps/backend`)

- **NestJS 11** with a module-based architecture
- **TypeORM** + **PostgreSQL 16** — migration-driven
- **ioredis** + **Redis 7** — cache, sessions, queue-ready
- **JWT** auth (access + refresh token) + Passport
- **Swagger** auto docs at `/docs`
- **Webpack** build, multi-stage **Docker** image

### Frontend (`apps/frontend`)

- **React 19** + **Vite 8**
- **TanStack Router** — file-based, type-safe routing
- **TanStack Query** + **Zustand** — server and client state
- **Tailwind CSS 4** + **shadcn/ui** + **Radix UI**
- **Zod** runtime validation
- **Nginx** static serving for the production image

### Shared (`packages/`)

- `@org/backend-*` — base, config, constants, crypto, database, decorators, enum, filters, helpers, interceptors, interfaces, jwt, redis
- `@org/shared-contracts` — DTOs and types shared by both apps

## 🚀 Quick Start

### Prerequisites

| Tool   | Version | Install                             |
| ------ | ------- | ----------------------------------- |
| Node   | 26.x    | https://nodejs.org / nvm            |
| pnpm   | 10.x    | `npm install -g pnpm@10`            |
| Docker | 20+     | https://docs.docker.com/get-docker/ |
| Git    | 2.40+   | `brew install git` / system package |

CI and both Dockerfiles run Node 26. `engines` allows `>=24`, but 26 is what everything is
built and tested against. Node 26 no longer ships corepack, which is why pnpm is installed
as a global rather than activated through it.

### Install

```bash
git clone https://github.com/vukiman1/nx-fullstack-starter-kit.git
cd nx-fullstack-starter-kit
pnpm install                              # installs deps + sets up husky
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

### Boot infrastructure (Postgres + Redis)

```bash
pnpm infra:up                             # docker compose up -d db redis
pnpm db:migration:run                     # apply latest migrations
```

### Run both apps in dev

```bash
pnpm dev                                  # backend :3000 + frontend :4200, parallel
```

Or one at a time:

```bash
pnpm dev:backend                          # http://localhost:3000/api
pnpm dev:frontend                         # http://localhost:4200
```

Swagger API docs: http://localhost:3000/docs

Routes are served under the `api` prefix; the health probes and the Swagger UI sit outside it.

There is no seed account — sign up through the UI and confirm the emailed code. `RESEND_API_KEY`
is optional for this: with it empty the send is skipped, but the code is part of the subject line
the backend logs, so registration, password reset and two-factor recovery all still complete
locally. Read the code off the backend output.

## 🧰 Common Commands

| Task               | Command                                |
| ------------------ | -------------------------------------- |
| Format check       | `pnpm format:check`                    |
| Format write       | `pnpm format`                          |
| Lint               | `pnpm lint`                            |
| Typecheck          | `pnpm typecheck`                       |
| Unit tests         | `pnpm test`                            |
| E2E (Playwright)   | `pnpm e2e`                             |
| Build all          | `pnpm build`                           |
| Affected only      | `pnpm affected -t lint typecheck test` |
| Docker backend up  | `pnpm docker:backend:up`               |
| Infra logs         | `pnpm infra:logs`                      |
| Migration create   | `pnpm db:migration:create <Name>`      |
| Migration generate | `pnpm db:migration:generate <Name>`    |
| Migration revert   | `pnpm db:migration:revert`             |

Nx directly: `pnpm nx <target> <project>`. Project graph: `pnpm nx graph`.

## 🏗️ Project Structure

```
.
├── apps/
│   ├── backend/             NestJS app
│   ├── backend-e2e/         Jest + axios e2e against a real Postgres and Redis
│   ├── frontend/            React SPA (Vite)
│   └── frontend-e2e/        Playwright e2e
├── packages/
│   ├── backend/             Reusable backend modules (jwt, redis, crypto, ...)
│   └── shared/contracts     DTOs + types shared FE ⇄ BE
├── tools/                   Helper scripts (migrations, seed, ...)
├── docs/                    Setup roadmap + architecture notes
├── .github/
│   ├── workflows/           pull-request.yml, push-dev.yml, pr-auto-label.yml
│   ├── settings.yml         Probot Settings (labels, repo config)
│   └── release.yml          Release note grouping by label
├── .husky/                  Git hooks
├── docker-compose.yml       Postgres + Redis (+ optional backend/frontend profiles)
└── nx.json                  Nx workspace config
```

## 🔧 Git Workflow

- **Default branch**: `dev`
- **Commit convention**: `type(scope): description` — Conventional Commits, enforced by commitlint.
- Type: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `ci`, `build`.
- Scope (suggested): `backend`, `frontend`, `ci`, `deps`, `infra`.
- PR titles follow the same format, and the auto-label workflow turns them into `type/*` + `scope/*`.

### Pre-commit hook

- `lint-staged`: prettier + eslint over staged files, auto-fixing.

### Commit-msg hook

- `commitlint` against `@commitlint/config-conventional`.

### Pre-push hook

- `pnpm nx affected -t lint typecheck` — only the projects affected relative to `origin/dev`. A failure blocks the push.

Emergency bypass: `git commit --no-verify` (same flag for push). Use sparingly.

## 🐳 Docker

### Local infrastructure only

```bash
docker compose up -d db redis
```

### Full stack (backend + frontend behind nginx)

```bash
docker compose --profile backend --profile frontend up --build
# backend  :3000
# frontend :4200 (nginx serving the SPA)
```

### Build images

```bash
pnpm nx run-many -t docker-build         # Nx prep pipeline for both
docker build -f apps/backend/Dockerfile -t starter-backend .
docker build -f apps/frontend/Dockerfile -t starter-frontend .
```

## 🤖 CI / CD

| Workflow            | Trigger          | Jobs                                                                                                    |
| ------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `pull-request.yml`  | PR → `dev`       | check-branch-up-to-date, format, lint, typecheck, test, build, backend-e2e, frontend-e2e, security-scan |
| `push-dev.yml`      | push → `dev`     | format, lint, typecheck, test, build, security-scan, migrate (skips e2e + branch check)                 |
| `pr-auto-label.yml` | PR opened/edited | derive `type/*` + `scope/*` labels from the PR title                                                    |

Nx Cloud remote cache is wired up (`nxCloudId` in `nx.json`).

## 📐 Repository Configuration

Managed through [Probot Settings](https://github.com/apps/settings) — [`.github/settings.yml`](.github/settings.yml) syncs to GitHub on merge into `dev`. It covers:

- Label taxonomy (`type/*`, `scope/*`, `priority/*`, `status/*`)
- Branch protection rules
- Squash merge format (PR title → commit title)
- Security flags (vulnerability alerts, secret scanning)

Release notes are grouped by label via [`.github/release.yml`](.github/release.yml).

## 🗺️ Roadmap

See [`docs/setup-roadmap.md`](docs/setup-roadmap.md) for what is done and what is left, in priority
order. The infrastructure items it opened with — commitlint, health probes, throttler, helmet,
Sentry — have since landed.

## 📝 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

Built with ❤️ on top of [Nx](https://nx.dev) · [NestJS](https://nestjs.com) · [React](https://react.dev)

</div>
