# Infrastructure Roadmap

Kế hoạch triển khai infrastructure (Terraform) theo 3 môi trường: **dev**, **staging**, **prod**. Mỗi phase là 1–2 tuần, commit từng bước riêng.

## Quyết định kiến trúc

| Env         | Stack                                                                                    | Mục đích                                        | $/mo                    |
| ----------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------- |
| **dev**     | Local `docker-compose.yml` + 2 Cloudflare R2 buckets (TF state + app uploads)            | Local dev, học Terraform, test upload S3-compat | $0                      |
| **staging** | AWS ECS Fargate + RDS + ALB — giống prod, size nhỏ nhất + ephemeral                      | Validate prod deploy, smoke test trước release  | $1–5 (chỉ chạy khi cần) |
| **prod**    | AWS HA: ECS Fargate multi-AZ + RDS Multi-AZ + ElastiCache + CloudFront + Secrets Manager | User thật                                       | $200–300                |

**Nguyên tắc**:

- **Dev = local-first**. Cloud part chỉ có 1 thứ: R2 bucket cho file upload (S3-compatible). Mọi thứ khác (Postgres, Redis, NestJS, frontend dev server) chạy local qua `docker-compose.yml` + `pnpm dev` sẵn có.
- Staging và prod **dùng chung Terraform modules** (cùng `infra/aws/modules/`), chỉ khác `terraform.tfvars`.
- Code app dùng AWS SDK, đọc endpoint + credential từ env var → đổi giữa **R2 (dev)** và **S3 (prod)** chỉ là đổi env. Không refactor.
- Mỗi env có **state riêng**, không apply chéo.

**Cấu trúc folder**:

```
infra/
├── dev/                       # 2 R2 bucket — vậy thôi
│   ├── bootstrap/             # R2 state bucket — apply tay 1 lần
│   ├── versions.tf            # provider cloudflare
│   ├── backend.tf             # remote state ở R2
│   ├── providers.tf
│   ├── variables.tf
│   ├── main.tf                # R2 uploads bucket + IAM access key cho app
│   ├── outputs.tf
│   └── terraform.tfvars
└── aws/                       # AWS stack — share giữa staging + prod (Phase 2+)
    ├── bootstrap/
    ├── modules/{vpc,rds,ecs-app,secrets,elasticache,s3-cloudfront}/
    └── envs/{staging,prod}/
```

Các tài nguyên Cloudflare khác (Tunnel, Pages, Access, backup bucket, MinIO, home VPS, self-hosted runner…) **không nằm trong Phase 1**. Khi cần thì thêm — xem [Phase 1.5 — Optional add-ons](#phase-15--optional-add-ons-khi-cần).

## Legend

- [ ] TODO
- [x] DONE
- 🟢 Quick win (~1–2 giờ)
- 🟡 Medium (nửa ngày – 1 ngày)
- 🔴 Heavy (2+ ngày)

---

## Phase 0 — Prerequisites (1–2 ngày)

Chuẩn bị account + tool. Không viết Terraform ở phase này.

### [ ] 🟢 Cloudflare account + R2

**Why**: dev cloud stack toàn bộ nằm trên Cloudflare R2 — chỉ cần CF account, KHÔNG cần domain ở phase này.

**How**:

- Tạo CF account, verify email, bật 2FA.
- Vào **R2** từ sidebar — bấm "Enable R2" (free tier 10GB storage + 1M ops/tháng, **không tính egress fee**).
- Tạo API token: My Profile → API Tokens → Create Token → custom permission `Account:Cloudflare R2 Storage:Edit` (đủ cho Phase 1).
- Lưu Account ID (thấy ở sidebar dashboard) + API token vào password manager.

**Acceptance**: vào trang R2 trong dashboard không bị paywall, tạo được test bucket tay rồi xoá.

---

### [ ] 🟢 AWS account mới + hardening (làm sớm, dùng từ Phase 2)

**Why**: account mới có 12 tháng free tier. Đăng ký sớm để clock free tier bắt đầu chạy — khi tới Phase 2 không phí ngày nào.

**How**:

- Đăng ký AWS, verify thẻ.
- Bật MFA cho root user, lock root key đi.
- Tạo IAM user `admin` (không phải root), MFA, gán `AdministratorAccess` tạm thời.
- Bật **AWS Budgets** với cảnh báo: $5, $20, $50.
- Bật **Cost Anomaly Detection** (free).
- Region mặc định: `ap-southeast-1` (Singapore) cho VN.

**Acceptance**: login bằng IAM user, budget alert về email.

---

### [ ] 🟢 Tool local

**Why**: cần Terraform CLI + tflint cho Phase 1.

**How**:

```bash
brew install terraform tflint tfsec
brew install awscli         # cần cho Phase 2; có thể skip lúc này
brew install gh             # GitHub CLI (nice-to-have)
```

Pin Terraform version qua **`mise` hoặc `tfenv`**:

```
# .tool-versions
terraform 1.10.0
```

**Acceptance**: `terraform version` ra 1.10.x.

---

### [ ] 🟢 Cấu trúc thư mục `infra/`

**Why**: scaffold rỗng để các phase sau drop file vào, không cần move file.

**How**: tạo cây thư mục như sau (chưa cần content, để `.gitkeep` ở folder rỗng):

```
infra/
├── .gitignore
├── .terraform-version
├── dev/
│   └── bootstrap/             # Phase 1 — R2 state bucket
└── aws/
    ├── bootstrap/             # Phase 2 — S3 state + OIDC + ECR
    ├── modules/               # Phase 3+ — vpc, rds, ecs-app, secrets...
    └── envs/
        ├── staging/           # Phase 3
        └── prod/              # Phase 6
```

`infra/.gitignore`:

```
.terraform/
*.tfstate
*.tfstate.*
*.tfvars
!*.tfvars.example
*.tfplan
```

**Acceptance**: `git status` clean sau khi tạo thư mục rỗng (có `.gitkeep`).

---

## Phase 1 — Dev: R2 bucket cho file upload (2–3 ngày)

**Mục tiêu**: NestJS chạy local (qua `docker-compose.yml` đã có) đọc/ghi được vào 1 R2 bucket cloud thật. Đây là dev infra **minimum viable** — chỉ thêm cloud part mà local docker-compose không làm được (object storage có thể access từ nhiều máy / production-like behavior).

**Phạm vi Phase 1**: 2 R2 bucket (1 cho TF state, 1 cho app upload) + 1 IAM credential cho NestJS đọc bucket app.

**Ngoài phạm vi Phase 1** (xem [Phase 1.5](#phase-15--optional-add-ons-khi-cần)):

- Cloudflare Tunnel / Pages / Access — chỉ cần khi muốn share dev URL ra ngoài.
- Backup cronjob — chỉ cần khi dev có data quý.
- MinIO self-hosted — chỉ cần nếu thay R2 bằng option self-host.
- Home VPS / self-hosted runner — chỉ cần nếu muốn dev always-on khi máy bạn tắt.

---

### [ ] 🟡 Bootstrap R2 state bucket — `infra/dev/bootstrap/`

**Why**: Terraform state của dev cần remote backend. R2 free 10GB, S3-compatible. Đây là chicken-and-egg: stack chính cần state ở R2 → R2 bucket phải có trước → tạo qua stack `bootstrap/` với local state, apply 1 lần.

**How**:

- File: `versions.tf`, `variables.tf`, `main.tf`, `outputs.tf`, `terraform.tfvars.example`.
- Resource: 1 `cloudflare_r2_bucket "tf_state"` (name = `tf-state-dev`).
- Outputs: bucket name + R2 endpoint URL.
- KHÔNG có `backend.tf` ở bootstrap → state local trên máy bạn.
- Apply: `terraform init && terraform apply` từ `infra/dev/bootstrap/`.

**Sau khi apply**:

- Vào R2 dashboard → Manage R2 API tokens → tạo 1 access key (Object Read & Write) → lưu password manager.
- Bucket xuất hiện trên dashboard.

**Acceptance**: bucket `tf-state-dev` tồn tại; `terraform.tfstate` local file ~3KB chứa metadata.

---

### [ ] 🟢 Main stack files — `infra/dev/{versions,backend,providers,variables,outputs}.tf`

**Why**: foundation cho stack chính dùng R2 làm remote state.

**How**: 5 file skeleton:

- `versions.tf` — pin TF + provider `cloudflare/cloudflare ~> 5.0`.
- `backend.tf` — `backend "s3"` trỏ R2 endpoint (cần điền account_id từ bước trên).
- `providers.tf` — config provider Cloudflare với `api_token = var.cloudflare_api_token`.
- `variables.tf` — `cloudflare_account_id`, `cloudflare_api_token` (sensitive), `app_bucket_name` (default `uploads-dev`).
- `outputs.tf` — sẽ điền sau khi có resource ở `main.tf`.

Chạy `terraform init` với env var:

```bash
export AWS_ACCESS_KEY_ID="<R2 access key>"
export AWS_SECRET_ACCESS_KEY="<R2 secret>"
export TF_VAR_cloudflare_api_token="<CF token>"
cd infra/dev && terraform init
```

**Acceptance**: `terraform init` chạy thành công, state lưu R2, `.terraform/` folder + `.terraform.lock.hcl` xuất hiện.

---

### [ ] 🟡 R2 uploads bucket + IAM credential — `infra/dev/main.tf`

**Why**: bucket thực tế cho NestJS upload file. Cần thêm 1 R2 API token với scope giới hạn 1 bucket này.

**How**:

- `cloudflare_r2_bucket "uploads"` — name = `uploads-dev` hoặc giá trị từ variable.
- `cloudflare_api_token "app_uploads"` — token có scope `Account:Cloudflare R2 Storage:Edit` giới hạn vào bucket này.

⚠️ Cloudflare provider hiện tại có thể chưa support tạo token với bucket-scoped policy đầy đủ — fallback là tạo token tay trong dashboard, lưu vào SSM/.env. Check provider docs trước khi viết.

- `outputs.tf` thêm:
  - `app_bucket_name` (non-sensitive)
  - `app_token_value` (sensitive, in qua `terraform output -raw app_token_value`)
  - `app_endpoint` = `https://<account_id>.r2.cloudflarestorage.com`

**Acceptance**:

```bash
terraform output -raw app_endpoint
# https://abc123.r2.cloudflarestorage.com

aws s3 ls --endpoint-url $(terraform output -raw app_endpoint) s3://uploads-dev/
# (rỗng — OK)
```

---

### [ ] 🟢 Wire NestJS đọc R2

**Why**: cho NestJS dùng được bucket vừa tạo, end-to-end test upload.

**How**:

- Add env vars vào `apps/backend/.env` (local) hoặc đẩy lên `.env.example`:

  ```
  S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
  S3_REGION=auto
  S3_BUCKET=uploads-dev
  S3_ACCESS_KEY_ID=<từ terraform output>
  S3_SECRET_ACCESS_KEY=<từ terraform output>
  S3_FORCE_PATH_STYLE=true
  ```

- Cài SDK + tạo `StorageModule` trong NestJS với `@aws-sdk/client-s3` (xem [setup-roadmap.md task File upload + S3/R2](./setup-roadmap.md)).
- Smoke test bằng endpoint mini upload + list.

**Acceptance**: gọi `POST /api/upload` từ local → file xuất hiện trên R2 bucket; `GET /api/uploads` list ra file đó.

---

## Phase 1.5 — Optional add-ons (khi cần)

Các thành phần đẩy lùi khỏi Phase 1 core. Pick-and-choose khi nhu cầu thật sự xuất hiện, không build trước.

### [ ] 🟡 Cloudflare Pages — frontend dev URL public

**Khi cần**: muốn share dev frontend với người khác (designer, PM), không phải chỉ chạy localhost. Cần domain (mục Phase 0 ban đầu).

**How tóm tắt**: thêm `cloudflare_pages_project` vào `infra/dev/main.tf` hoặc tạo file `pages.tf`. Source = GitHub repo, build command = `pnpm nx build @org/frontend`.

---

### [ ] 🔴 Cloudflare Tunnel + Access — public dev API + auth gate

**Khi cần**: muốn expose backend API ra ngoài (vd frontend Pages gọi tới), nhưng không muốn deploy backend lên cloud. Tunnel chạy local → CF edge.

**How tóm tắt**: `cloudflare_zero_trust_tunnel_cloudflared` + `_config` map hostname → `localhost:3000`. Thêm `cloudflare_zero_trust_access_application` để chỉ email allow-list mới vào được.

---

### [ ] 🟡 R2 backup bucket + cronjob

**Khi cần**: dev data đã đáng để giữ (vài tuần làm việc, data seed phức tạp).

**How tóm tắt**: thêm `cloudflare_r2_bucket "backups"`. Cronjob máy local hoặc VPS chạy `pg_dump | age | rclone copy r2:backups/`.

---

### [ ] 🔴 MinIO self-hosted (thay R2)

**Khi cần**: muốn dev 100% self-hosted, không phụ thuộc CF account / billing. Hoặc nhu cầu nội bộ không cho dùng cloud public.

**How tóm tắt**: chạy `minio/minio` container trong `docker-compose.yml`. Dùng provider `aminueza/minio` quản bucket. Backend đổi env `S3_ENDPOINT` sang `http://minio:9000`. R2 vẫn giữ làm backup target.

---

### [ ] 🟡 Home VPS + always-on dev

**Khi cần**: muốn dev backend chạy 24/7 (vd cronjob test, webhook test từ Stripe/GitHub).

**How tóm tắt**: provision VPS (Hetzner CX22 €4 hoặc hardware home), cài Docker + cloudflared, deploy `docker-compose.yml` lên đó. Kết hợp với Tunnel ở mục trên.

---

### [ ] 🟡 Self-hosted GitHub runner + deploy-dev workflow

**Khi cần**: đã có Home VPS, muốn push dev → tự build + deploy lên VPS.

**How tóm tắt**: tạo runner trong Repo Settings → Actions → Runners, cài lên VPS. Workflow `deploy-dev.yml` build multi-arch image (do VPS có thể ARM), push GHCR, runner trên VPS pull + `docker compose up -d`.

---

## Phase 2 — AWS bootstrap (3–5 ngày)

Chuẩn bị foundation cho staging + prod. Apply tay (state chưa có chỗ lưu remote).

### [ ] 🟡 Bootstrap stack `infra/aws/bootstrap/`

**Why**: tạo S3 state bucket + DynamoDB lock + GitHub OIDC provider + ECR — các thứ TF cần để CI/CD apply.

**How**: file `main.tf` (local state):

- `aws_s3_bucket "tf_state"` + versioning + encryption + block public access.
- `aws_dynamodb_table "tf_lock"`.
- `aws_iam_openid_connect_provider` for GitHub Actions OIDC.
- `aws_iam_role "gha_terraform_staging"` + `gha_terraform_prod` với trust policy bind theo `repo:owner/repo:ref:refs/heads/main`.
- `aws_iam_role "gha_deploy_app_staging"` + `gha_deploy_app_prod` (quyền hẹp: ECR push, ECS update-service, S3 sync, CF invalidation).

Apply local 1 lần, commit state local file vào private bucket (hoặc xoá đi, accept rebuild nếu cần).

**Acceptance**: `aws s3 ls` thấy state bucket; trong GitHub Actions có thể `aws sts assume-role` được mà không cần access key.

---

### [ ] 🟢 Audit Cloudflare DNS cho domain prod

**Why**: prod sẽ trỏ ALB AWS. Giữ DNS ở Cloudflare = WAF + cache + analytics free. AWS Route53 không cần.

**How**: confirm zone đã trên Cloudflare (Phase 0), không tạo Route53 hosted zone.

**Acceptance**: zone NS trỏ CF, không có hosted zone trên AWS.

---

### [ ] 🟢 ECR repos

**Why**: registry cho prod image. Staging có thể share repo với prod (tag khác) hoặc repo riêng.

**How**: trong `infra/aws/bootstrap/`:

```hcl
resource "aws_ecr_repository" "backend" {
  name                 = "yourapp/backend"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_lifecycle_policy" "backend" {
  # giữ 10 image tag `prod-*`, 5 tag `staging-*`, xoá untagged sau 7 ngày
}
```

**Acceptance**: `aws ecr describe-repositories` thấy repo, lifecycle policy active.

---

## Phase 3 — Staging (AWS ephemeral) (2–3 tuần)

Staging mirror prod, size nhỏ nhất, apply ↔ destroy theo session test.

### [ ] 🔴 Module `infra/aws/modules/vpc/`

**Why**: VPC riêng + public/private subnet + NAT (hoặc bỏ NAT cho staging, dùng public subnet với SG khoá).

**How**:

- 2 AZ, mỗi AZ 1 public + 1 private subnet.
- Internet Gateway.
- **Staging**: ECS task ở public subnet (variable `assign_public_ip = true`), không NAT → tiết kiệm $32/mo.
- **Prod**: ECS task ở private subnet, NAT Gateway 1 cái cho cost (multi-NAT khi scale).

Dùng `terraform-aws-modules/vpc/aws` để tiết kiệm code.

**Acceptance**: VPC + subnet visible, route table đúng cho từng subnet.

---

### [ ] 🔴 Module `infra/aws/modules/rds/`

**Why**: Postgres managed.

**How**: `aws_db_instance`:

- Engine `postgres`, version pin chính xác (vd `16.4`).
- Variable cho instance class, multi_az, deletion_protection, skip_final_snapshot.
- Subnet group: private subnet only.
- Security group: chỉ allow port 5432 từ ECS task SG.
- Parameter group custom nếu cần (log_statement, timezone).
- Backup retention variable (1 ngày staging, 30 ngày prod).

⚠️ Đừng quên `skip_final_snapshot = true` cho staging — không thì destroy fail.

**Acceptance**: `psql` từ ECS task connect được, từ ngoài internet thì không.

---

### [ ] 🔴 Module `infra/aws/modules/ecs-app/`

**Why**: ECS Fargate task + ALB + service.

**How**:

- `aws_ecs_cluster`.
- `aws_ecs_task_definition` — image từ ECR, env vars, secrets từ Secrets Manager / SSM, log driver `awslogs`, task role + execution role.
- `aws_ecs_service` — desired count variable, capacity provider `FARGATE_SPOT` (staging) / `FARGATE` (prod), deployment circuit breaker bật.
- `aws_lb` (ALB) + `aws_lb_target_group` (target type `ip` cho Fargate) + `aws_lb_listener` HTTPS với ACM cert.
- `aws_acm_certificate` + DNS validation qua Cloudflare provider (cross-provider).
- `aws_cloudwatch_log_group` + retention variable.

Output: ALB DNS name → cấu hình Cloudflare DNS CNAME tới ALB (qua Cloudflare provider cùng env).

**Acceptance**: `curl https://api.staging.yourapp.com/health/readiness` trả 200.

---

### [ ] 🟡 Module `infra/aws/modules/secrets/`

**Why**: lưu DB password, JWT secret, Stripe key…

**How**:

- Dùng **SSM Parameter Store SecureString** (free) cho non-rotating secret.
- Dùng **Secrets Manager** chỉ cho RDS password (cần auto-rotation).
- Task definition reference qua `secrets` block, ECS inject thành env var.

**Acceptance**: `process.env.DB_PASSWORD` có giá trị trong container; `aws ssm get-parameter` của user thường bị deny (chỉ task role đọc được).

---

### [ ] 🔴 `infra/aws/envs/staging/` — wire lên

**Why**: combine modules thành staging hoàn chỉnh.

**How**:

- `backend.tf` → backend "s3" + DynamoDB lock.
- `main.tf` → gọi vpc, rds, ecs-app, secrets.
- `terraform.tfvars`:

```hcl
environment        = "staging"
aws_region         = "ap-southeast-1"
fargate_cpu        = 256
fargate_memory     = 512
fargate_count      = 1
fargate_capacity   = "FARGATE_SPOT"
db_instance_class  = "db.t4g.micro"
db_multi_az        = false
db_skip_snapshot   = true
db_deletion_protection = false
log_retention_days = 3
enable_nat         = false
```

**Acceptance**: `terraform apply` xong (~10 phút lần đầu), API endpoint healthy.

---

### [ ] 🟡 Workflow `staging-up.yml` + `staging-down.yml`

**Why**: ephemeral spin-up/tear-down.

**How**:

**up** (workflow_dispatch):

```yaml
on:
  workflow_dispatch:
    inputs:
      ttl_hours:
        default: '2'
jobs:
  up:
    permissions:
      id-token: write
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_TERRAFORM_STAGING }}
      - run: terraform -chdir=infra/aws/envs/staging apply -auto-approve
      - run: ./scripts/migrate-staging.sh
      - run: ./scripts/smoke-test-staging.sh
      - run: |
          # schedule destroy via workflow_dispatch sau N giờ
          gh workflow run staging-down.yml --field force=true
```

**down** (workflow_dispatch + cron failsafe):

```yaml
on:
  workflow_dispatch:
  schedule:
    - cron: '0 * * * *' # check mỗi giờ
jobs:
  down:
    steps:
      - check uptime của ALB (tag `created_at`)
      - if > 4h hoặc force=true → terraform destroy -auto-approve
```

**Acceptance**: bấm `Run workflow` → staging up trong 10 phút → 2h sau auto-destroy → resource count = 0.

---

### [ ] 🟡 Migration + smoke test script

**Why**: mỗi lần spin-up, DB là fresh — cần chạy migration + seed minimal data trước smoke test.

**How**:

- `scripts/migrate-staging.sh` — chạy ECS one-off task với command `npm run db:migration:run`.
- `scripts/smoke-test-staging.sh` — gọi `/health/readiness` + 3–5 endpoint cơ bản, assert 200.

**Acceptance**: workflow up tự chạy 2 script này, fail thì destroy ngay.

---

## Phase 4 — Observability + secrets (1 tuần)

### [ ] 🟡 Sentry cho backend + frontend

**Why**: catch runtime error production. Free tier 5k event/mo.

**How**: Sentry SDK init với DSN khác cho mỗi env. DSN lưu trong SSM Parameter Store.

**Acceptance**: throw test error ở staging → xuất hiện trên Sentry, gắn tag `environment: staging`.

---

### [ ] 🟢 CloudWatch alarm cơ bản cho staging

**Why**: bắt được khi staging fail trong lúc test.

**How**: trong `infra/aws/modules/ecs-app/`, thêm:

- ALB `HTTPCode_Target_5XX_Count` > 5 trong 5 phút.
- ECS `RunningTaskCount` < 1.
- RDS `CPUUtilization` > 80%.

Alert sink: SNS topic → email (staging) hoặc Slack webhook (prod sau).

**Acceptance**: kill task ECS thủ công → email alert trong < 5 phút.

---

### [ ] 🟢 SOPS + age cho staging secret

**Why**: `.env.staging` cần commit để CI dùng được, nhưng không thể commit plaintext. SOPS encrypt từng value, commit file `.env.staging.sops` an toàn.

**How**:

- `age-keygen` → public key check-in `.sops.yaml`, private key trong password manager (CI có 1 copy riêng).
- `sops -e .env.staging > .env.staging.sops` → commit. Decrypt khi deploy: `sops -d .env.staging.sops`.

**Acceptance**: `cat .env.staging.sops` không đọc được (ciphertext); CI workflow `sops -d` ra plaintext rồi inject vào ECS task.

---

## Phase 5 — CI/CD đầy đủ (1 tuần)

### [ ] 🟡 Workflow `terraform-plan.yml`

**Why**: PR đụng `infra/` phải có plan để review.

**How**:

```yaml
on:
  pull_request:
    paths: [infra/**]
jobs:
  plan-staging:
    if: contains(github.event.pull_request.files.*.path, 'infra/aws/envs/staging/')
    steps:
      - assume role gha_terraform_staging
      - terraform fmt -check
      - terraform validate
      - tflint
      - tfsec
      - terraform plan -out=tfplan
      - comment tfplan vào PR (dùng action có sẵn)
```

**Acceptance**: PR mới đụng staging → bot comment plan diff đầy đủ.

---

### [ ] 🟡 Workflow `terraform-apply.yml`

**Why**: merge main → auto apply dev/staging, manual approval cho prod.

**How**: phân nhánh theo path đã đổi:

- `infra/dev/**` → apply tự động.
- `infra/aws/envs/staging/**` → apply tự động.
- `infra/aws/envs/prod/**` → `environments.prod` với required reviewers.

**Acceptance**: merge PR đụng prod → workflow pause chờ approve, không tự apply.

---

### [ ] 🟢 Image tagging strategy

**Why**: tag rõ ràng để rollback nhanh.

**How**:

- `dev-<sha>` cho dev.
- `staging-<sha>` cho staging.
- `prod-<sha>` cho prod.
- Mỗi tag immutable (ECR `IMMUTABLE`).
- Rollback = update ECS task definition về SHA cũ, không cần TF.

**Acceptance**: lệnh rollback ngắn: `aws ecs update-service --task-definition <prev-revision>`.

---

## Phase 6 — Prod (2–3 tuần, làm khi có dự án thật)

### [ ] 🔴 Module `infra/aws/modules/elasticache/`

**Why**: Redis managed multi-AZ. Staging chưa có (Redis sidecar trong Fargate task tạm đủ).

**How**: `aws_elasticache_replication_group` (cluster mode disabled, 1 primary + 1 replica multi-AZ).

**Acceptance**: connect từ ECS task ok; failover test thủ công ok.

---

### [ ] 🔴 Module `infra/aws/modules/s3-cloudfront/`

**Why**: frontend prod cần CDN. Trước đó dev dùng CF Pages — prod có thể vẫn dùng CF Pages (rẻ + đủ tốt), hoặc S3 + CloudFront để giữ data plane AWS hoàn toàn.

**How**:

- `aws_s3_bucket` private, block public access.
- `aws_cloudfront_distribution` với OAC (Origin Access Control) trỏ S3.
- ACM cert (us-east-1, requirement của CloudFront).
- DNS record qua Cloudflare provider.

⚠️ Nếu giữ CF Pages cho prod → skip module này.

**Acceptance**: frontend load qua https, cache hit rate > 80% sau warm-up.

---

### [ ] 🔴 `infra/aws/envs/prod/` — wire full HA

**Why**: env cuối cùng cho user thật.

**How**:

- `backend.tf` → state bucket riêng + DynamoDB lock riêng.
- `terraform.tfvars`:

```hcl
environment        = "prod"
aws_region         = "ap-southeast-1"
fargate_cpu        = 512
fargate_memory     = 1024
fargate_count      = 2
fargate_capacity   = "FARGATE"
db_instance_class  = "db.t4g.small"
db_multi_az        = true
db_skip_snapshot   = false
db_deletion_protection = true
log_retention_days = 30
enable_nat         = true
enable_elasticache = true
enable_cloudfront  = true   # hoặc false nếu giữ CF Pages
```

**Acceptance**: prod live, healthy, multi-AZ confirmed (RDS failover test ok).

---

### [ ] 🟡 Workflow `deploy-prod.yml` với manual approval

**Why**: prod deploy không bao giờ tự động.

**How**: workflow trigger trên tag `v*`, dùng `environments: prod` với required reviewer. Step:

1. Build + push ECR với tag `prod-<sha>`.
2. **Wait approval** (manual).
3. ECS update-service → rolling deploy (deployment circuit breaker bật, auto rollback nếu fail).
4. Smoke test sau deploy.

**Acceptance**: tag `v0.1.0` → workflow pause chờ approve → sau approve, deploy hoàn tất trong 10 phút, healthcheck pass.

---

### [ ] 🟢 AWS Budget hard limit cho prod

**Why**: account có thể bị bill shock $1000 nếu code bug gọi infinite loop ra S3.

**How**: AWS Budget với action: gửi email + tự gắn policy deny vào IAM role nếu vượt $500/mo.

**Acceptance**: simulate budget exceed → action trigger.

---

## Phase 7 — Post-launch hardening (ongoing)

### [ ] 🟡 Disaster recovery drill

**Why**: backup không có giá trị nếu chưa từng test restore.

**How**:

- Quý 1 lần: restore RDS snapshot vào instance mới, point staging API vào instance đó, smoke test ok → tear down.
- Document RTO (thời gian restore) và RPO (mất tối đa bao nhiêu data).

**Acceptance**: doc ghi RTO < 1h, RPO < 24h, có timestamp drill gần nhất.

---

### [ ] 🟡 Pre-prod ephemeral env

**Why**: staging giống prod nhưng test ad-hoc. Pre-prod = staging với data prod-like (anonymized snapshot), chạy 2h trước mỗi release.

**How**: copy `infra/aws/envs/staging/` → `infra/aws/envs/preprod/`. Workflow restore RDS snapshot từ prod (anonymized), apply preprod, run regression test, destroy.

**Acceptance**: workflow `preprod-up.yml` chạy < 30 phút, có data realistic.

---

### [ ] 🟢 CloudWatch dashboard

**Why**: 1 trang nhìn được sức khỏe toàn hệ.

**How**: `aws_cloudwatch_dashboard` resource trong TF prod, widget: ALB RPS, ECS CPU/mem, RDS connections, Redis hit rate, error count.

**Acceptance**: bookmark URL dashboard, mở thấy 6–8 widget.

---

### [ ] 🟡 Cloudflare WAF rules

**Why**: chặn bot, rate limit theo IP, geo block nếu cần.

**How**: `cloudflare_ruleset` với rule: block known-bad UA, rate limit > 100 req/min/IP, challenge nếu request từ Tor.

**Acceptance**: test với UA `curl/8.0` thấy bị challenge.

---

### [ ] 🟡 AWS account riêng cho prod

**Why**: blast radius = 0 khi tay nhầm. Đáng làm khi prod đã serve user thật.

**How**:

- Tạo AWS Organizations (root account).
- Move account hiện tại làm `nonprod` (chứa staging + dev AWS resource).
- Tạo `prod` account mới.
- SSO qua IAM Identity Center.
- Migrate TF state prod sang account prod.

**Acceptance**: 2 account riêng biệt, billing tách bạch, IAM role không cross account.

---

## Lưu ý chung

- **Mỗi phase commit 1 PR riêng**, dễ review + dễ revert nếu apply hỏng.
- **Apply theo thứ tự dev → staging → prod**. Đừng nhảy phase, mỗi phase build trên kiến thức phase trước.
- **Test destroy trước khi commit module mới**. Module không destroy sạch là module hỏng (nhất là RDS với deletion protection).
- **State backup**: bật S3 versioning ở state bucket. Có thể rollback nếu apply gây lỗi.
- **Không apply prod từ máy local** sau khi bootstrap xong. Chỉ qua workflow với OIDC role.
- **Đừng tối ưu sớm**: skip `infra/aws/modules/elasticache/`, `infra/aws/modules/s3-cloudfront/` ở Phase 3. Thêm khi tới Phase 6.

## Quyết định để sau

- Multi-region prod (DR site): chưa cần cho phase 1 năm đầu.
- AWS Backup vault ngoài snapshot: chỉ khi compliance yêu cầu.
- AWS X-Ray / OpenTelemetry tracing: chỉ khi debug latency cross-service phức tạp.
- EKS thay Fargate: chỉ khi cần stateful workload / cron phức tạp / custom networking.

## Tham khảo

- App-level setup: [setup-roadmap.md](./setup-roadmap.md)
- Docker compose hiện tại: [docker-compose.yml](../docker-compose.yml)
- CI workflows: [.github/workflows/](../.github/workflows/)
