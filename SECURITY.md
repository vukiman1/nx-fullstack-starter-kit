# Security Policy

## Reporting a vulnerability

**Please do NOT open a public issue or pull request** for security problems — that exposes the vulnerability before a fix is available.

Use one of the private channels below:

1. **GitHub Security Advisories** (preferred): open a draft at
   https://github.com/vukiman1/nx-fullstack-starter-kit/security/advisories/new
2. **Email**: `vukiman1@protonmail.com` (replace with maintainer-preferred address before publishing).

Include:

- Affected component (`apps/backend`, `apps/frontend`, a specific package under `packages/`).
- Vulnerable version / commit SHA.
- Steps to reproduce or proof-of-concept (curl command, code snippet, screenshot).
- Impact you observed (data exposure, RCE, auth bypass, DoS, etc.).
- Suggested fix, if you have one.

## Response timeline

| Stage             | Target                                                                  |
| ----------------- | ----------------------------------------------------------------------- |
| Acknowledgement   | Within **3 business days** of report                                    |
| Triage + severity | Within **7 business days**                                              |
| Fix or workaround | Depends on severity — critical/high prioritized; medium/low best-effort |
| Public disclosure | After patched release, with credit to reporter unless they opt out      |

## Scope

In scope:

- `apps/backend` (NestJS API)
- `apps/frontend` (React SPA)
- `packages/backend/*` and `packages/shared/*` (reusable modules)
- CI/CD workflows (`.github/workflows/`)
- Docker build images (`apps/*/Dockerfile`)

Out of scope:

- Issues in third-party dependencies — please report upstream. Dependabot already monitors and patches CVEs in this repo automatically.
- Theoretical issues without a working PoC.
- Self-inflicted misconfiguration (e.g., committing a real `.env` to the repo) — the kit ships `.env.example` only.

## Supported versions

This is a starter kit; only the latest commit on `dev` is supported. There are no LTS branches.

## Hall of fame

Researchers who have responsibly disclosed vulnerabilities will be listed here after public disclosure (unless they opt out).
