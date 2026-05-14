<div align="center">

# Nx Fullstack Starter Kit

A production-ready fullstack monorepo template — **NestJS backend** + **React frontend** + **Nx tooling**, batteries included.

[![Nx](https://img.shields.io/badge/Nx-22.7-143055?logo=nx&logoColor=white)](https://nx.dev)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com)

</div>

---

## ✨ Highlights

- **Nx monorepo** — incremental build, computation caching, task graph, affected commands.
- **NestJS 11** backend với TypeORM (Postgres), Redis, JWT auth, Swagger/OpenAPI.
- **React 19** frontend với Vite, TanStack Router, Tailwind 4, shadcn/radix UI.
- **Shared packages** — `@org/backend-*` cho infra reusable, `@org/shared-contracts` cho DTO chung.
- **Docker compose** — Postgres + Redis + backend + frontend, profiles tách dev/prod.
- **CI/CD** — GitHub Actions (pull-request + push-dev), Nx Cloud remote cache.
- **Husky hooks** — pre-commit (lint-staged) + pre-push (`nx affected -t lint typecheck`).
- **GitHub repo config-as-code** — Probot Settings cho labels, branch protection, release notes auto-grouping.
- **Auto PR labels** — derive `type/*` + `scope/*` từ PR title (`feat(backend): ...`).

## 📦 Stack

### Backend (`apps/backend`)

- **NestJS 11** với module-based architecture
- **TypeORM** + **PostgreSQL 16** — migration-driven
- **ioredis** + **Redis 7** — cache, session, queue-ready
- **JWT** auth (access + refresh token) + Passport
- **Swagger** auto docs ở `/api/docs`
- **Webpack** build, **Docker** multi-stage image

### Frontend (`apps/frontend`)

- **React 19** + **Vite 7**
- **TanStack Router** — file-based routing, type-safe
- **Tailwind CSS 4** + **shadcn/ui** + **Radix UI**
- **Zod** runtime validation
- **Nginx** static serving cho production image

### Shared (`packages/`)

- `@org/backend-*` — base, config, constants, crypto, database, decorators, enum, filters, helpers, interceptors, interfaces, jwt, redis
- `@org/shared-contracts` — DTO/type dùng chung 2 phía

## 🚀 Quick Start

### Prerequisites

| Tool   | Version | Cài đặt                                                  |
| ------ | ------- | -------------------------------------------------------- |
| Node   | 22.x    | https://nodejs.org / nvm                                 |
| pnpm   | 10.x    | `corepack enable && corepack prepare pnpm@10 --activate` |
| Docker | 20+     | https://docs.docker.com/get-docker/                      |
| Git    | 2.40+   | `brew install git` / system package                      |

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

Hoặc chạy từng cái:

```bash
pnpm dev:backend                          # http://localhost:3000
pnpm dev:frontend                         # http://localhost:4200
```

Swagger API docs: http://localhost:3000/api/docs

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

Nx native: `pnpm nx <target> <project>`. Project graph: `pnpm nx graph`.

## 🏗️ Project Structure

```
.
├── apps/
│   ├── backend/             NestJS app
│   ├── backend-e2e/         Jest + supertest e2e
│   ├── frontend/            React SPA (Vite)
│   └── frontend-e2e/        Playwright e2e
├── packages/
│   ├── backend/             Reusable backend modules (jwt, redis, crypto, ...)
│   └── shared/contracts     DTO + types shared FE ⇄ BE
├── tools/                   Helper scripts (migrations, seed, ...)
├── docs/                    Setup roadmap + architecture notes
├── .github/
│   ├── workflows/           pull-request.yml, push-dev.yml, pr-auto-label.yml
│   ├── settings.yml         Probot Settings (labels, repo config)
│   └── release.yml          Release notes auto-grouping by label
├── .husky/                  Git hooks
├── docker-compose.yml       Postgres + Redis (+ optional backend/frontend profiles)
└── nx.json                  Nx workspace config
```

## 🔧 Git Workflow

- **Default branch**: `dev`
- **Commit convention**: `type(scope): description` — Conventional Commits.
- Type: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `ci`, `build`.
- Scope (gợi ý): `backend`, `frontend`, `ci`, `deps`, `infra`.
- PR title cũng theo format này → **auto-label** workflow tự gắn `type/*` + `scope/*`.

### Pre-commit hook

- `lint-staged`: prettier + eslint trên file staged. Auto-fix.

### Pre-push hook

- `pnpm nx affected -t lint typecheck` — chỉ chạy project bị ảnh hưởng so với `origin/dev`. Fail → block push.

Bypass khẩn cấp: `git commit --no-verify` (hoặc `--no-verify` cho push). Hạn chế dùng.

## 🐳 Docker

### Local infrastructure only

```bash
docker compose up -d db redis
```

### Full stack (backend + frontend qua nginx)

```bash
docker compose --profile backend --profile frontend up --build
# backend  :3000
# frontend :4200 (nginx serving SPA)
```

### Build images

```bash
pnpm nx run-many -t docker-build         # Nx prep pipeline cho cả 2
docker build -f apps/backend/Dockerfile -t starter-backend .
docker build -f apps/frontend/Dockerfile -t starter-frontend .
```

## 🤖 CI / CD

| Workflow            | Trigger          | Jobs                                                                                                    |
| ------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `pull-request.yml`  | PR → `dev`       | check-branch-up-to-date, format, lint, typecheck, test, build, backend-e2e, frontend-e2e, security-scan |
| `push-dev.yml`      | push → `dev`     | format, lint, typecheck, test, build, security-scan (skip e2e + branch check)                           |
| `pr-auto-label.yml` | PR opened/edited | derive `type/*` + `scope/*` labels từ PR title                                                          |

Nx Cloud remote cache đã wire-up (`nxCloudId` trong `nx.json`).

## 📐 Repository Configuration

Quản lý bằng [Probot Settings](https://github.com/apps/settings) — file [`.github/settings.yml`](.github/settings.yml) sync về GitHub khi merge vào `dev`. Bao gồm:

- Labels taxonomy (`type/*`, `scope/*`, `priority/*`, `status/*`)
- Branch protection rules
- Squash merge format (PR title → commit title)
- Security flags (vulnerability alerts, secret scanning)

Release notes auto-group theo label nhờ [`.github/release.yml`](.github/release.yml).

## 🗺️ Roadmap

Xem [`docs/setup-roadmap.md`](docs/setup-roadmap.md) — danh sách các hạng mục còn thiếu (commitlint, health check, throttler, helmet, pino, sentry, ...) sắp theo độ ưu tiên.

## 📝 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

Built with ❤️ on top of [Nx](https://nx.dev) · [NestJS](https://nestjs.com) · [React](https://react.dev)

</div>
