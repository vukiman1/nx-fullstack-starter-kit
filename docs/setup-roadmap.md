# Starter Kit Setup Roadmap

Kế hoạch triển khai các hạng mục còn thiếu, sắp theo độ ưu tiên và effort.

## Legend

- [ ] TODO
- [x] DONE
- 🟢 Quick win (~15 phút)
- 🟡 Medium (1-2 giờ)
- 🔴 Heavy (nửa ngày trở lên)

## Đã có (baseline)

- [x] Husky pre-commit (lint-staged) + pre-push (`nx affected -t lint typecheck`) + commit-msg (commitlint)
- [x] ESLint, Prettier, TypeScript strict
- [x] Jest unit tests, Playwright e2e
- [x] GitHub Actions: `pull-request.yml`, `push-dev.yml`
- [x] Nx Cloud caching + analytics
- [x] Docker setup cho backend + frontend (nginx)
- [x] Probot Settings: labels, repo config, squash format
- [x] PR auto-label theo title prefix
- [x] `.github/release.yml` group release notes theo label
- [x] Swagger / OpenAPI cho NestJS backend
- [x] CODEOWNERS

---

## 🟢 Quick wins

### [x] commitlint + commit-msg hook ✅

**Why**: enforce format `type(scope): desc` ở mức commit. Hiện chỉ tự kỷ luật, không có gì chặn commit sai format.

**How**:

```bash
pnpm add -Dw @commitlint/cli @commitlint/config-conventional
```

Tạo `commitlint.config.mjs`:

```js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'refactor', 'perf', 'test', 'ci', 'build'],
    ],
  },
};
```

Thêm `.husky/commit-msg`:

```
pnpm exec commitlint --edit "$1"
```

**Acceptance**: commit message `feat:` (thiếu scope) hoặc `wip` bị chặn local.

---

### [x] `.editorconfig` ✅

**Why**: đồng bộ tab/space/EOL/charset giữa VS Code, WebStorm, Cursor.

**How**: tạo `.editorconfig` ở root.

**Acceptance**: file mới tạo bằng IDE khác nhau ra cùng style.

---

### [x] `.github/PULL_REQUEST_TEMPLATE.md` ✅

**Why**: PR có sẵn checklist (test plan, screenshots, breaking changes) → đỡ phải nhớ.

**How**: file markdown với sections `## Summary`, `## Changes`, `## Test plan`, `## Screenshots`.

**Acceptance**: tạo PR mới → form pre-populate template.

---

### [x] `.github/ISSUE_TEMPLATE/` ✅

**Why**: structured bug report + feature request thay vì free-form.

**How**: tạo `bug-report.yml` + `feature-request.yml` (form-based, không phải markdown).

**Acceptance**: New Issue UI hiện 2 lựa chọn template.

---

### [x] `.github/dependabot.yml` ✅

**Why**: auto-PR weekly bump npm + Actions versions. PR auto-gắn label `dependencies` → vào "Dependencies" section của release notes.

**How**:

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    labels: ['dependencies', 'scope/deps']
    open-pull-requests-limit: 5
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
    labels: ['dependencies', 'scope/ci']
```

**Acceptance**: tuần sau có Dependabot PR đầu tiên, gắn label đúng.

---

### [x] `CONTRIBUTING.md` ✅

**Why**: onboarding teammate / future-self.

**How**: viết: prerequisites (Node 22, pnpm 10, Docker), clone + install, dev commands, test, commit convention link tới commitlint.

**Acceptance**: người mới đọc xong setup được dev environment trong < 15 phút.

---

### [x] `SECURITY.md` ✅

**Why**: hướng dẫn report vulnerability privately. GitHub UI hiện link tới file này.

**How**: ngắn gọn, email/URL để report.

**Acceptance**: tab Security của repo show file content.

---

## 🟡 Backend hardening

### [x] Health check endpoint ✅

**Why**: Cloudflare Tunnel / k8s / load balancer cần `/health` để biết container sống. Kiểm tra DB + Redis cùng lúc.

**How**:

```bash
pnpm --filter @org/backend add @nestjs/terminus
```

Tạo `HealthModule` với `TypeOrmHealthIndicator`, `RedisHealthIndicator`. Expose 2 endpoints:

- `GET /health/liveness` — server alive (chỉ check process)
- `GET /health/readiness` — sẵn sàng nhận traffic (check DB + Redis)

**Acceptance**: `curl localhost:3000/health/readiness` trả 200 + status từng dependency.

---

### [ ] Rate limiting (`@nestjs/throttler`)

**Why**: chống brute force login, scraping. Default 60 req/min/IP đủ cho hầu hết.

**How**:

```bash
pnpm --filter @org/backend add @nestjs/throttler
```

```ts
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]);
```

Apply `@Throttle({ default: { limit: 5, ttl: 60_000 } })` cho auth endpoints (chặt hơn).

**Acceptance**: gọi `/auth/login` quá 5 lần/phút → 429.

---

### [ ] Helmet security headers

**Why**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options. Hạn chế XSS / clickjacking.

**How**:

```bash
pnpm --filter @org/backend add helmet
```

```ts
app.use(helmet());
```

**Acceptance**: `curl -I localhost:3000` thấy `Strict-Transport-Security`, `X-Frame-Options`...

---

### [ ] Structured logging (Pino)

**Why**: JSON logs có timestamp + trace ID + level → Cloud logs (CF, Datadog, Loki) parse được. `console.log` chỉ tốt cho dev.

**How**:

```bash
pnpm --filter @org/backend add nestjs-pino pino-http pino-pretty
```

Wire `LoggerModule.forRoot` với pretty transport ở dev, JSON ở prod. Add request-id correlation.

**Acceptance**: prod log ra JSON; mỗi request có `reqId` để trace.

---

### [ ] Sentry error tracking

**Why**: bug production không thấy nếu không có monitoring. Free tier 5k events/month.

**How**:

```bash
pnpm add -w @sentry/node @sentry/profiling-node
pnpm --filter @org/frontend add @sentry/react
```

Backend: `Sentry.init({ dsn, tracesSampleRate: 0.1 })` trước `bootstrap()`.
Frontend: wrap `<ErrorBoundary>` của Sentry quanh root.

Env vars: `SENTRY_DSN_BACKEND`, `VITE_SENTRY_DSN_FRONTEND`.

**Acceptance**: throw test error → xuất hiện trên Sentry dashboard.

---

## 🟡 Frontend

### [ ] Data fetching layer (TanStack Query)

**Why**: chưa thấy data fetching layer chuẩn. TanStack Query khớp với TanStack Router đang dùng. Cache, retry, optimistic update built-in.

**How**:

```bash
pnpm --filter @org/frontend add @tanstack/react-query @tanstack/react-query-devtools
```

Wrap `<QueryClientProvider>` quanh app root.

**Acceptance**: 1 page demo dùng `useQuery` fetch backend API.

---

### [ ] Storybook (nếu build design system)

**Why**: bạn đã có shadcn + radix → muốn document component cho team thì Storybook là chuẩn.

**How**:

```bash
pnpm dlx storybook@latest init
```

**Acceptance**: `pnpm nx storybook @org/frontend` mở http://localhost:6006 với stories.

---

### [ ] Bundle analyzer

**Why**: trước go live cần biết bundle nặng gì để code-split / remove deps không cần.

**How**:

```bash
pnpm --filter @org/frontend add -D rollup-plugin-visualizer
```

Plug vào `vite.config.mts` ở `build.rollupOptions.plugins`.

**Acceptance**: `pnpm nx build @org/frontend` xong tạo `dist/stats.html`.

---

## 🟠 Database / DevOps

### [ ] Seed script cho dev local

**Why**: clone repo xong, dev cần data mẫu để click thử. Hiện chỉ có `tools/backend-e2e-seed.mjs` cho test.

**How**: mở rộng script seed có flag `--env dev` insert sample users + sample data.

**Acceptance**: `pnpm db:seed:dev` xong, login được bằng `demo@example.com / demo`.

---

### [ ] Database backup strategy (cho production)

**Why**: mất data = mất tất cả. Backup ít nhất daily.

**How**: tùy host:

- Self-hosted Postgres: `pg_dump` cron, upload S3/R2.
- Managed (Neon, Supabase, RDS): built-in PITR backup.

**Acceptance**: restore thử backup vào staging và app chạy được.

---

## 🔴 Production features (làm khi cần)

### [ ] BullMQ + background jobs

**Why**: đã có Redis, không dùng cho job queue thì phí. Email, report generation, webhook delivery đều nên async.

**How**:

```bash
pnpm --filter @org/backend add @nestjs/bullmq bullmq
```

Tạo `QueueModule`, `EmailProcessor`...

**Acceptance**: gửi email qua queue thay vì sync trong request handler.

---

### [ ] Email service (Resend/SendGrid)

**Why**: forgot password, notification, verify email là minimum.

**How**: Resend SDK đơn giản nhất.

```bash
pnpm --filter @org/backend add resend
```

Template với `@react-email/components` hoặc handlebars.

**Acceptance**: register user → nhận welcome email.

---

### [ ] File upload + S3/R2

**Why**: avatar, attachment, export PDF... cần object storage. R2 (Cloudflare) free 10GB.

**How**:

```bash
pnpm --filter @org/backend add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Pattern: backend tạo presigned URL → frontend upload thẳng → backend nhận callback. Tránh proxy file qua backend.

**Acceptance**: upload avatar, thấy file trên R2 bucket.

---

### [ ] i18n

**Why**: nếu app phục vụ > 1 ngôn ngữ. Tách string ra khỏi code từ đầu rẻ hơn nhiều so với refactor sau.

**How**: `react-i18next` (frontend) + `nestjs-i18n` (backend, cho error messages).

**Acceptance**: switch ngôn ngữ trong UI, label thay đổi, không reload page.

---

### [ ] OpenTelemetry tracing

**Why**: distributed tracing nếu có > 1 service hoặc cần xem chi tiết latency từng query.

**How**: `@opentelemetry/auto-instrumentations-node`, export sang Jaeger / Tempo / Honeycomb.

**Acceptance**: 1 request thấy span tree đầy đủ trên UI tracing.

---

## Lưu ý chung

- Không làm tất cả cùng lúc. Mỗi block trên là 1 PR riêng, dễ review + dễ revert.
- Quick wins (1-7) đáng làm sớm — chi phí thấp, lợi ích cao.
- Backend hardening (8-12) nên xong trước khi có user thật.
- Frontend block (13-15) làm khi vào giai đoạn build feature thật.
- Production features (16-21) làm khi nhu cầu cụ thể xuất hiện, không build trước.

## Tham khảo

- Husky setup: [.husky/](../.husky/)
- Probot Settings config: [.github/settings.yml](../.github/settings.yml)
- CI workflows: [.github/workflows/](../.github/workflows/)
- Release notes config: [.github/release.yml](../.github/release.yml)
