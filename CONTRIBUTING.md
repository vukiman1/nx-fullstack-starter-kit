# Contributing

Thanks for taking the time to contribute. This guide gets you from clone to merged PR.

## Prerequisites

| Tool   | Version | Install                                                  |
| ------ | ------- | -------------------------------------------------------- |
| Node   | 22.x    | https://nodejs.org or `nvm install 22`                   |
| pnpm   | 10.x    | `corepack enable && corepack prepare pnpm@10 --activate` |
| Docker | 20+     | https://docs.docker.com/get-docker/                      |
| Git    | 2.40+   | system package                                           |

## Initial setup

```bash
git clone https://github.com/vukiman1/nx-fullstack-starter-kit.git
cd nx-fullstack-starter-kit
pnpm install                          # also wires up husky hooks via the `prepare` script

cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

pnpm infra:up                         # docker compose up -d db redis
pnpm db:migration:run                 # apply latest migrations
```

Run both apps in dev mode:

```bash
pnpm dev                              # backend :3000 + frontend :4200
```

Swagger API docs: http://localhost:3000/api/docs

## Daily workflow

### Branch naming

`<type>/<short-description>` — examples:

- `feat/user-profile-endpoint`
- `fix/cart-total-rounding`
- `chore/bump-nx`
- `docs/api-reference`

Type list: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `ci`, `build`.

### Commit convention

Conventional Commits, enforced by [commitlint](./commitlint.config.mjs) via a `commit-msg` git hook:

```
type(scope): short description

[optional body explaining why]
```

Rules:

- `type` must be one of: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `ci`, `build`
- `scope` is **required** (suggested: `backend`, `frontend`, `ci`, `deps`, `infra`, or a feature name)
- Subject in imperative present tense (`add user endpoint`, not `added`)
- Wrap commit body at ~72 chars

Examples:

```
feat(backend): add user profile endpoint
fix(frontend): cart total off-by-one when discount applied
chore(deps): bump nx from 22.7 to 22.8
docs(readme): refresh tech stack badges
```

### Local quality gates (git hooks)

Husky runs these automatically — failures block the action:

| Hook       | Runs                                                | When          |
| ---------- | --------------------------------------------------- | ------------- |
| pre-commit | `lint-staged` → `prettier --write` + `eslint --fix` | before commit |
| commit-msg | `commitlint --edit "$1"`                            | message saved |
| pre-push   | `pnpm nx affected -t lint typecheck`                | before push   |

Bypass (emergency only): `git commit --no-verify` / `git push --no-verify`.

## Pull requests

1. **Push your branch**: `git push -u origin feat/<name>`
2. **Open PR against `dev`** — fill out the [PR template](./.github/PULL_REQUEST_TEMPLATE.md). PR title must follow Conventional Commits because squash merge uses it as the commit subject.
3. **PR auto-label workflow** parses the title and applies `type/*` + `scope/*` labels.
4. **Required CI** ([`pull-request.yml`](./.github/workflows/pull-request.yml)) runs: format, lint, typecheck, test, build, backend-e2e, frontend-e2e, security-scan, branch freshness.
5. **Address review comments**, push more commits (squash merge collapses them anyway).
6. **Merge via "Squash and merge"** — the only allowed merge strategy on this repo.

After merge, sync your local:

```bash
git checkout dev && git pull --rebase && git branch -D feat/<name>
```

## Testing

| Task          | Command                                              |
| ------------- | ---------------------------------------------------- |
| Unit tests    | `pnpm test` or `pnpm nx test <project>`              |
| Affected      | `pnpm nx affected -t test`                           |
| Backend e2e   | `pnpm nx e2e @org/backend-e2e` (spins up DB + Redis) |
| Frontend e2e  | `pnpm nx e2e @org/frontend-e2e` (Playwright)         |
| Format check  | `pnpm format:check`                                  |
| Format write  | `pnpm format`                                        |
| Lint          | `pnpm lint`                                          |
| Typecheck     | `pnpm typecheck`                                     |
| Project graph | `pnpm nx graph`                                      |

Run all checks before push:

```bash
pnpm nx affected -t lint typecheck test
```

## Database migrations

When you change a TypeORM entity:

```bash
pnpm db:migration:generate <DescriptiveName>    # generates SQL diff
pnpm db:migration:run                           # apply locally
git add apps/backend/src/migrations && git commit -m "feat(backend): <what>"
```

To roll back: `pnpm db:migration:revert`.

Migrations are committed to the repo and applied automatically in CI before e2e tests.

## Adding dependencies

```bash
pnpm add <pkg> --filter @org/backend            # production dep for backend
pnpm add -D <pkg> --filter @org/frontend        # dev dep for frontend
pnpm add -Dw <pkg>                              # dev dep at workspace root
```

After adding, commit both `package.json` and `pnpm-lock.yaml`.

## Project structure

See [README — Project Structure](./README.md#-project-structure).

## Reporting issues

- **Bug**: open a [Bug report issue](./.github/ISSUE_TEMPLATE/bug-report.yml).
- **Feature**: open a [Feature request issue](./.github/ISSUE_TEMPLATE/feature-request.yml).
- **Security vulnerability**: do **NOT** file a public issue. Use [GitHub Security Advisories](https://github.com/vukiman1/nx-fullstack-starter-kit/security/advisories/new) instead.
- **Open-ended question**: use Discussions (if enabled), not Issues.

## Style notes

- Comments: only when WHY is non-obvious. Code should explain WHAT through names.
- No `any` in TypeScript. Use `unknown` + narrow, or a proper generic.
- One file = one purpose. If file content drifts from filename, rename or split.
- No commented-out code blocks in commits. Git history is the archive.

## Roadmap

See [`docs/setup-roadmap.md`](./docs/setup-roadmap.md) for in-progress and planned setup items.
