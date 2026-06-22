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

### [x] Rate limiting (`@nestjs/throttler`) ✅

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

### [x] Helmet security headers ✅

**Why**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options. Hạn chế XSS / clickjacking.

**How**:

```bash
pnpm --filter @org/backend add helmet
```

```ts
// Prod bật CSP đầy đủ; dev/test tắt CSP vì default chặn assets của Swagger UI (/docs chỉ mount ngoài prod).
app.use(helmet(isProduction ? undefined : { contentSecurityPolicy: false }));
```

**Acceptance**: `curl -I localhost:3000` thấy `Strict-Transport-Security`, `X-Frame-Options`...

---

### [x] Structured logging (JSON) ✅

**Why**: JSON logs có timestamp + level → Cloud logs (CF, Datadog, Loki) parse được. `console.log` chỉ tốt cho dev.

**How**: dùng `ConsoleLogger` built-in của Nest (không thêm dependency) — `json: true` ở production, colored ở dev. Xem `app.logger.ts` (`createAppLogger`) + `main.ts` (`bufferLogs` + `useLogger`). Log levels lấy từ `app.logLevels`.

> Pino (`nestjs-pino`) bị bỏ qua: worker transport (`pino-pretty`) không resolve được module trong webpack bundle, và lợi ích `reqId`/structured chưa tương xứng chi phí ở giai đoạn này. Khi cần request-id tracing thật (đã deploy + log aggregator), cân nhắc thêm lại.

**Acceptance**: prod log ra JSON một dòng/entry; dev log dễ đọc.

---

### [x] Sentry error tracking ✅

**Why**: bug production không thấy nếu không có monitoring. Free tier 5k events/month.

**How**: dùng `@sentry/nestjs` (integration chính thức cho NestJS) + `@sentry/react`. Cấu hình qua hệ config tập trung sẵn có, không đọc `process.env` thô.

- Backend: `apps/backend/src/instrument.ts` gọi `Sentry.init()` (guard bằng `sentry.dsn`), import dòng đầu `main.ts` để chạy trước mọi module. `SentryModule.forRoot()` + `SentryGlobalFilter` đăng ký **đầu** mảng `APP_FILTER` (NestJS reverse global filters → check cuối) nên `HttpExceptionFilter`/`TypeormExceptionFilter` giữ nguyên response shape; chỉ error lạ (non-HTTP) mới gửi Sentry. DSN + `tracesSampleRate` nằm trong `@org/backend-config` (env `SENTRY_DSN`).
- Frontend: `initSentry()` (`src/lib/sentry.ts`) guard bằng `sentry.dsn`, gọi trong `main.tsx`; bọc `Sentry.ErrorBoundary` quanh root + `captureException` trong route `ErrorPage`. DSN inject lúc build qua `__FRONTEND_CONFIG__` (env `VITE_SENTRY_DSN`).

> Khác bản gốc: dùng `@sentry/nestjs` thay `@sentry/node` (đúng pattern Nest). Bỏ `@sentry/profiling-node` vì kéo native module `@sentry-internal/node-cpu-profiler` bị pnpm chặn build script — error tracking là giá trị cốt lõi, thêm lại khi cần profiling. DSN để trống = tắt, app chạy bình thường không cần Sentry account.

**Acceptance**: throw test error → xuất hiện trên Sentry dashboard.

---

## 🟡 Frontend

### [x] Data fetching layer (TanStack Query) ✅

**Why**: chưa thấy data fetching layer chuẩn. TanStack Query khớp với TanStack Router đang dùng. Cache, retry, optimistic update built-in.

**How**: `QueryClientProvider` bọc app root; `queryClient` (`lib/query-client.ts`) đặt defaults — `staleTime 60s`, không retry lỗi 4xx (`ApiError`), tắt `refetchOnWindowFocus`. Tích hợp Router context đầy đủ: `queryClient` đưa vào router context, route `loader` dùng `ensureQueryData` prefetch, component `useQuery` đọc lại từ cache. Query định nghĩa bằng `queryOptions` factory cạnh service (`userQueries.credit()`) để loader và hook dùng chung query key. Devtools lazy-load, gate sau `NODE_ENV === 'development'` nên không lọt prod bundle.

> Khác bản gốc: tích hợp Router context (loader prefetch) thay vì chỉ provider. `SimpleHeader > CreditBadge` được refactor từ `useEffect` thủ công sang `useQuery` → header + dashboard share cache, chỉ 1 request.

**Acceptance**: dashboard prefetch + `useQuery(userQueries.credit())` hiển thị credit; build prod không chứa devtools.

---

### [ ] Storybook (nếu build design system)

**Why**: bạn đã có shadcn + radix → muốn document component cho team thì Storybook là chuẩn.

**How**:

```bash
pnpm dlx storybook@latest init
```

**Acceptance**: `pnpm nx storybook @org/frontend` mở http://localhost:6006 với stories.

---

### [x] Bundle analyzer ✅

**Why**: trước go live cần biết bundle nặng gì để code-split / remove deps không cần.

**How**: `rollup-plugin-visualizer` cắm vào `vite.config.mts` (`plugins`), **gate sau cờ `ANALYZE`** để build thường (CI / Vercel) không sinh `stats.html` thừa trong output. Script tiện: `pnpm analyze:frontend`.

> Khác bản gốc: gate sau `ANALYZE=true` thay vì emit mọi build — tránh rác trong dist deploy. Vite 8 dùng rolldown nhưng plugin vẫn tương thích qua lớp Rollup-compat.

**Acceptance**: `pnpm analyze:frontend` (hoặc `ANALYZE=true pnpm nx build @org/frontend`) tạo `apps/frontend/dist/stats.html`; build thường thì không.

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
pnpm --filter @org/backend add resend @react-email/components
pnpm --filter @org/backend add -D react-email
```

**Template: chọn `@react-email/components`** (không dùng Handlebars). Lý do với stack React + Resend này:

- **Email client compat**: tự lo table layout + inline CSS, xử lý quirk của Outlook/Gmail — phần đau nhất của email HTML. Handlebars là templating thuần, phải tự viết HTML table bằng tay.
- **Type-safe**: props của email là interface, sai field là compile error. Handlebars data là `any`, sai thì silent.
- **DX**: `react-email dev` preview live; truyền thẳng component vào Resend qua `resend.emails.send({ react: <Email/> })`, không cần render ra HTML string.
- **Reuse**: cùng mental model JSX với frontend, share component/style được.

Cân nhắc Handlebars chỉ khi: template do non-dev chỉnh, hoặc load động từ DB/CMS (string lưu DB dễ hơn code phải build).

Render template (đồng bộ) trong `EmailProcessor` của BullMQ rồi đẩy qua Resend.

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
