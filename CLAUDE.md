<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Branching Model

- **`main`** is the stable/release branch. **`dev`** is the integration branch where day-to-day work and dependency bumps land first. `main` lags behind `dev` and only receives merges when cutting a release.
- **Dependabot targets `dev`** (configured in `.github/dependabot.yml` via `target-branch: 'dev'` for every ecosystem: npm, github-actions, docker). All Dependabot PRs base into `dev`, never `main`.
- **Default base branch for new PRs is `dev`**, unless the change is explicitly a hotfix or release-merge into `main`. When in doubt, ask before opening a PR into `main`.
- **Fixing a Dependabot PR**: the fix must land on `dev` (same base as the Dependabot PR), otherwise rebasing the Dependabot PR will not pick it up. After the fix merges into `dev`, comment `@dependabot rebase` on the Dependabot PR to trigger an immediate rebase.
- **Backporting between branches**: if a fix accidentally lands on the wrong base, cherry-pick it onto a branch from the correct base and open a follow-up PR — do not merge `main` → `dev` (or vice versa) just to drag one commit across.

## Useful Dependabot commands (post as PR comments)

- `@dependabot rebase` — rebase the PR against its base branch immediately.
- `@dependabot recreate` — drop the branch and recreate from scratch (use when rebase fails).
- `@dependabot ignore this major version` / `... minor version` / `... dependency` — stop future bumps for the scope.
