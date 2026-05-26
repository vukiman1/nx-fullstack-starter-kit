# Terraform Learning Path — Từ 0 → Production

Học Terraform bằng cách viết code tăng dần. **10 step**, mỗi step ~30 phút – 2 giờ. Hết 10 step bạn có cấu trúc generic + multi-env + CI/CD đầy đủ.

**Cách dùng doc này**:

- Mỗi step có **Why** (vấn đề step trước chưa giải) → **What** (concept mới) → **Code** (viết gì) → **Verify** (chạy gì để confirm) → **Còn lại** (motivation cho step sau).
- Đọc xong **đừng copy** — gõ tay từng dòng. Não nhớ qua tay nhanh hơn qua mắt.
- Khi xong step, `terraform destroy` để dọn → step sau làm lại sạch. Tránh tiền phát sinh.

**Khu vực thực hành**: tạo folder `infra/` ở root repo. Đây sẽ là folder thật bạn dùng lâu dài — không phải sandbox vứt đi.

```bash
mkdir -p infra
```

**Yêu cầu trước khi bắt đầu**:

- **AWS account** đã setup:
  - Tạo account, verify thẻ.
  - Bật MFA cho root user, khoá root access key.
  - Tạo IAM user `admin` với MFA, gán `AdministratorAccess`.
  - Bật **AWS Budgets** với alert $5 / $20 / $50.
  - Default region: `ap-southeast-1` (Singapore — gần VN).
- **AWS CLI** login được: `aws sts get-caller-identity` ra ARN của bạn.
- **Terraform** ≥ 1.5: `brew install terraform`.
- **Cloudflare account** (chỉ cần cho Step 10):
  - Tạo account, bật 2FA.
  - Sidebar → R2 → "Enable R2" (free 10 GB, không egress fee).
  - API token với scope `Account · Cloudflare R2 Storage · Edit`.
- **Vài $1 ngân sách** (lab tốn vài cent; destroy đều đặn là an toàn).

---

## Step 1 — Hello Terraform: 1 file, 1 S3 bucket (30 phút)

**Why**: viết dòng code đầu tiên → biết TF làm gì. Không có gì để giải step trước (đây là step đầu).

**What**: 2 khái niệm cốt lõi:

- **Provider** = nhà cung cấp (AWS, Cloudflare, Stripe…). TF nói chuyện với API của họ.
- **Resource** = một "thứ" trên cloud (bucket, queue, server…). Khai báo trong code → TF tạo trên cloud.

**Code**: tạo `infra/main.tf`:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

provider "aws" {
  region = "ap-southeast-1"
}

resource "aws_s3_bucket" "first" {
  # Bucket name PHẢI globally unique (không trùng với ai trên thế giới).
  # Tip: thêm tên bạn + ngày.
  bucket = "an-learn-tf-20260515"
}
```

**Verify**:

```bash
cd infra
terraform init       # download provider AWS (~30 MB), KHÔNG đụng cloud
terraform plan       # TF nói: "tôi sẽ tạo 1 bucket". KHÔNG đụng cloud
terraform apply      # gõ "yes" → bucket tạo trên AWS
aws s3 ls            # thấy bucket trong list
```

Để ý folder `infra/` sau apply có 2 thứ mới:

- `terraform.tfstate` — file JSON ghi nhớ TF đã tạo gì (resource type, id, attribute). **State là source of truth**.
- `.terraform/` — provider binary đã download (ignored bởi `infra/.gitignore`).

**Còn lại**:

- Bucket name hard-code. Đổi bucket name = sửa code.
- Bucket name không hiển thị ra ngoài → script khác muốn dùng không biết tên gì.

→ Step 2: variable + output.

---

## Step 2 — Variables + outputs (30 phút)

**Why**: hard-code = mỗi env phải có 1 bản code copy → khó maintain. Cần parameter hoá.

**What**:

- **Variable** = input của module. Truyền giá trị qua `terraform.tfvars`, env var (`TF_VAR_xxx`), hoặc CLI (`-var=...`).
- **Output** = "return value" của module. Đọc sau apply qua `terraform output`. Script bash hay app khác dùng được.

**Code**: sửa `infra/main.tf`:

```hcl
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.70" }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}

variable "bucket_name" {
  description = "S3 bucket name (globally unique)"
  type        = string
}

resource "aws_s3_bucket" "first" {
  bucket = var.bucket_name
}

output "bucket_arn" {
  description = "ARN of the bucket"
  value       = aws_s3_bucket.first.arn
}
```

Tạo `infra/terraform.tfvars`:

```hcl
bucket_name = "an-learn-tf-20260515"
```

**Verify**:

```bash
terraform plan    # đọc tfvars tự động, KHÔNG diff vì bucket vẫn tên cũ
terraform apply   # no changes
terraform output bucket_arn   # in ra ARN
```

Thử đổi bucket name trong tfvars → `plan` sẽ báo: "destroy bucket cũ + tạo bucket mới" (vì name là immutable). **Cẩn thận với destroy/create**.

**Còn lại**:

- Mỗi lần thêm resource phải nhồi hết vô 1 file. Sẽ rất dài.
- Code app cần biết bucket name → đang phải đọc `terraform output` thủ công, copy vào `.env`.

→ Step 3: thêm resource + tách file.

---

## Step 3 — Thêm SQS + tách file (1 giờ)

**Why**: 1 file 30 dòng còn đọc được. 1 file 300 dòng thì khó scan. TF convention: tách theo loại.

**What**:

- TF gộp **tất cả file `.tf` trong cùng folder** thành 1 module. Tách file chỉ để dễ đọc, không đổi behavior.
- Convention chuẩn:
  - `versions.tf` — pin TF + provider version
  - `variables.tf` — input
  - `main.tf` — resource
  - `outputs.tf` — output
  - `providers.tf` — provider config (nếu phức tạp; nhỏ thì gộp vào `main.tf`)

**Code**: tách `infra/main.tf` thành 4 file.

`infra/versions.tf`:

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.70" }
  }
}

provider "aws" {
  region = var.aws_region
}
```

`infra/variables.tf`:

```hcl
variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "bucket_name" {
  type = string
}

variable "queue_name" {
  type    = string
  default = "learn-jobs"
}
```

`infra/main.tf`:

```hcl
resource "aws_s3_bucket" "uploads" {
  bucket = var.bucket_name
}

resource "aws_sqs_queue" "jobs" {
  name                       = var.queue_name
  visibility_timeout_seconds = 30
  message_retention_seconds  = 345600   # 4 ngày
}
```

`infra/outputs.tf`:

```hcl
output "bucket_arn" {
  value = aws_s3_bucket.uploads.arn
}

output "queue_url" {
  description = "Pass to app as SQS_QUEUE_URL"
  value       = aws_sqs_queue.jobs.url
}
```

**Verify**:

```bash
terraform plan    # TF tạo SQS queue mới (bucket không đổi)
terraform apply
aws sqs send-message --queue-url $(terraform output -raw queue_url) --message-body '{"hello":"world"}'
aws sqs receive-message --queue-url $(terraform output -raw queue_url)
```

**Còn lại**:

- `terraform.tfstate` đang nằm trên máy bạn. Đồng nghiệp clone repo về **không apply được tiếp** (state khác → TF nghĩ phải tạo lại từ đầu).
- Nếu máy bạn cháy → mất state → resource còn trên AWS nhưng TF không biết.

→ Step 4: remote state.

---

## Step 4 — Remote state (S3 backend) (1 giờ)

**Why**: state là "ground truth" của TF. Phải lưu nơi an toàn + sharable. Tiêu chuẩn AWS: S3 bucket + DynamoDB lock (để 2 người không apply cùng lúc).

**What**:

- **Backend** = nơi TF lưu state. Default = local file. Đổi sang `s3` = lưu cloud.
- **Lock** = mutex. Trước apply, TF lock state; xong mới unlock. 2 người apply song song → người sau bị block.

**Chicken-and-egg**: state bucket cần state ở đâu? → tạo TAY trước (không qua TF). Sau này (Step 8) sẽ học "bootstrap pattern" để giải quyết đẹp hơn.

**Code**:

1. Tạo state bucket TAY:

```bash
aws s3api create-bucket \
  --bucket an-learn-tf-state \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1
aws s3api put-bucket-versioning \
  --bucket an-learn-tf-state \
  --versioning-configuration Status=Enabled
aws dynamodb create-table \
  --table-name an-learn-tf-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1
```

2. Add backend vô `infra/versions.tf`:

```hcl
terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket         = "an-learn-tf-state"
    key            = "infra/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "an-learn-tf-lock"
    encrypt        = true
  }

  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.70" }
  }
}
```

3. Migrate state local → S3:

```bash
terraform init -migrate-state   # TF hỏi "copy state cũ lên S3?" → yes
```

**Verify**:

```bash
aws s3 ls s3://an-learn-tf-state/infra/   # thấy file terraform.tfstate
ls terraform.tfstate                       # KHÔNG còn nữa
terraform plan                             # no changes
```

**Còn lại**:

- Mỗi lần thêm bucket = thêm 1 resource block. 5 bucket → 5 block giống hệt → DRY tệ.

→ Step 5: `for_each`.

---

## Step 5 — `for_each` (45 phút)

**Why**: 5 bucket giống cấu hình chỉ khác tên → 5 block copy = tệ. TF có meta-argument `for_each` để loop.

**What**:

- `for_each = toset([...])` → loop 1 resource block cho mỗi item.
- `each.key` / `each.value` = item hiện tại trong loop.
- Reference: `aws_s3_bucket.uploads["logs"]` thay vì `aws_s3_bucket.logs`.

**Code**: sửa `infra/variables.tf`:

```hcl
variable "buckets" {
  description = "Set of bucket names"
  type        = set(string)
  default     = ["uploads", "logs", "backups"]
}

variable "bucket_prefix" {
  description = "Prefix prepended to bucket names for uniqueness"
  type        = string
  default     = "an-learn-20260515"
}
```

Sửa `infra/main.tf`:

```hcl
resource "aws_s3_bucket" "all" {
  for_each = var.buckets
  bucket   = "${var.bucket_prefix}-${each.key}"
}

resource "aws_sqs_queue" "jobs" {
  name                       = var.queue_name
  visibility_timeout_seconds = 30
  message_retention_seconds  = 345600
}
```

Sửa `infra/outputs.tf`:

```hcl
output "bucket_arns" {
  value = { for k, b in aws_s3_bucket.all : k => b.arn }
}
```

**Verify**:

```bash
terraform plan    # destroy bucket cũ (uploads), tạo 3 bucket mới
terraform apply
terraform output bucket_arns
# {
#   "backups" = "arn:aws:s3:::an-learn-20260515-backups"
#   "logs"    = "arn:aws:s3:::an-learn-20260515-logs"
#   "uploads" = "arn:aws:s3:::an-learn-20260515-uploads"
# }
```

Thêm bucket = thêm 1 dòng trong default → apply → bucket mới có ngay.

**Còn lại**:

- Nếu muốn tạo bucket ở project khác (repo khác) → phải copy nguyên block + variable. Không reuse được.

→ Step 6: module.

---

## Step 6 — Module (1.5 giờ)

**Why**: tách logic ra để **reuse** + **encapsulate**. 1 module = 1 folder với variable + main + output. Gọi từ stack chính như gọi 1 function.

**What**:

- **Root module** = folder chứa file TF đang chạy (cái `infra/` hiện tại).
- **Child module** = folder khác, được gọi qua `module "name" { source = "..." }`.
- `source` có thể là: path local (`./modules/s3`), git URL, TF registry.

**Code**: tạo `infra/modules/s3/` với 3 file.

`infra/modules/s3/versions.tf`:

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.70" }
  }
}
```

`infra/modules/s3/main.tf`:

```hcl
variable "bucket_name" {
  type = string
}

variable "versioning_enabled" {
  type    = bool
  default = true
}

resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }
}

output "id" {
  value = aws_s3_bucket.this.id
}

output "arn" {
  value = aws_s3_bucket.this.arn
}
```

(Để gọn, tôi gộp variable + resource + output vô 1 file. Production thì tách như Step 3.)

Sửa `infra/main.tf` để dùng module:

```hcl
module "buckets" {
  source   = "./modules/s3"
  for_each = var.buckets

  bucket_name        = "${var.bucket_prefix}-${each.key}"
  versioning_enabled = true
}

resource "aws_sqs_queue" "jobs" {
  name = var.queue_name
}
```

Sửa `infra/outputs.tf`:

```hcl
output "bucket_arns" {
  value = { for k, b in module.buckets : k => b.arn }
}
```

**Verify**:

```bash
terraform init    # TF detect module mới, init
terraform plan    # diff: thêm versioning resource cho mỗi bucket
terraform apply
```

**Bài tập (optional)**: tạo `infra/modules/sqs/` tương tự. Move queue vào module → root chỉ còn gọi 2 module.

**Còn lại**:

- 1 stack đang chạy 1 env (dev). Muốn có staging nữa → copy folder? Đổi tfvars?

→ Step 7: multi-env.

---

## Step 7 — Multi-env (dev + staging) (1 giờ)

**Why**: cùng infra, khác env (dev nhỏ, staging giống prod). Cần state riêng để apply độc lập.

**What**: 2 cách phổ biến:

- **Workspace** (TF built-in): 1 folder, nhiều "workspace" → state riêng. ❌ Dễ apply nhầm env.
- **Folder per env** (recommended): `envs/dev/`, `envs/staging/`. ✅ Rõ ràng, không nhầm.

**Code**: tổ chức lại `infra/`:

```
infra/
├── modules/
│   ├── s3/
│   └── sqs/
└── envs/
    ├── dev/
    │   ├── versions.tf
    │   ├── main.tf
    │   └── terraform.tfvars
    └── staging/
        ├── versions.tf
        ├── main.tf
        └── terraform.tfvars
```

`infra/envs/dev/versions.tf`:

```hcl
terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket         = "an-learn-tf-state"
    key            = "envs/dev/terraform.tfstate"   # ← key khác per env
    region         = "ap-southeast-1"
    dynamodb_table = "an-learn-tf-lock"
    encrypt        = true
  }

  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.70" }
  }
}

provider "aws" {
  region = "ap-southeast-1"
}
```

`infra/envs/dev/main.tf`:

```hcl
variable "buckets"       { type = set(string) }
variable "bucket_prefix" { type = string }
variable "queue_name"    { type = string }

module "buckets" {
  source   = "../../modules/s3"
  for_each = var.buckets

  bucket_name = "${var.bucket_prefix}-${each.key}"
}

module "queue" {
  source = "../../modules/sqs"
  name   = var.queue_name
}
```

`infra/envs/dev/terraform.tfvars`:

```hcl
buckets       = ["uploads", "logs"]
bucket_prefix = "an-learn-dev-20260515"
queue_name    = "learn-dev-jobs"
```

Copy `dev/` → `staging/`, đổi `key = "envs/staging/terraform.tfstate"` + đổi tfvars (`bucket_prefix = "an-learn-staging-..."`).

**Verify**:

```bash
cd envs/dev && terraform init && terraform apply
cd ../staging && terraform init && terraform apply
# 2 env độc lập, state riêng
```

**Còn lại**:

- State bucket vẫn tạo TAY (`aws s3api create-bucket` ở Step 4). Khi onboard người mới, họ phải làm lại bước đó. Nên TF hoá luôn.

→ Step 8: bootstrap pattern.

---

## Step 8 — Bootstrap pattern (45 phút)

**Why**: state bucket nên cũng quản qua TF — nhưng nó chính là nơi lưu state, nên không thể tự lưu state chính nó.

**What**: tách thành 2 stack:

- `bootstrap/` — state bucket + DynamoDB lock. **State LOCAL**. Apply tay 1 lần, sau đó không đụng nữa.
- `envs/*/` — dùng state remote ở bucket vừa tạo.

**Code**: tạo `infra/bootstrap/main.tf`:

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.70" }
  }
}

provider "aws" {
  region = "ap-southeast-1"
}

resource "aws_s3_bucket" "tf_state" {
  bucket = "an-learn-tf-state"
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_dynamodb_table" "tf_lock" {
  name         = "an-learn-tf-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
}

output "state_bucket" { value = aws_s3_bucket.tf_state.id }
output "lock_table"   { value = aws_dynamodb_table.tf_lock.name }
```

Vì bucket + table đã có (Step 4 tạo tay), TF sẽ báo "already exists". Cần **import** state hiện có vô TF state:

```bash
cd infra/bootstrap
terraform init
terraform import aws_s3_bucket.tf_state an-learn-tf-state
terraform import aws_dynamodb_table.tf_lock an-learn-tf-lock
terraform plan   # sẽ diff: thêm versioning resource (nếu chưa enable trước)
terraform apply
```

**Verify**: `terraform.tfstate` local file ~5KB chứa state bucket + lock table.

**Còn lại**:

- Mỗi lần apply phải có AWS credential trên máy. Đẩy lên CI/CD thì sao? Không lẽ commit access key?

→ Step 9: GitHub OIDC.

---

## Step 9 — CI/CD với GitHub OIDC (1.5 giờ)

**Why**: long-lived AWS access key trong GitHub secret = nguy hiểm (rò rỉ là toang). OIDC = GitHub Actions tự xin token tạm thời từ AWS, không lưu key cố định.

**What**:

- **OIDC provider** (1 cái trên AWS): đăng ký GitHub Actions là "trusted issuer".
- **IAM role** với trust policy: chỉ workflow của repo `your/repo` ở branch `main` mới `AssumeRole` được.
- Workflow dùng `aws-actions/configure-aws-credentials@v4` → token tạm 1 giờ.

**Code**: thêm vô `infra/bootstrap/main.tf`:

```hcl
variable "github_owner" {
  type    = string
  default = "your-github-org"
}

variable "github_repo" {
  type    = string
  default = "nx-fullstack-stater-kit"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "gha_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_owner}/${var.github_repo}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "gha_terraform" {
  name               = "learn-gha-terraform"
  assume_role_policy = data.aws_iam_policy_document.gha_assume.json
}

resource "aws_iam_role_policy_attachment" "gha_admin" {
  role       = aws_iam_role.gha_terraform.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

output "gha_role_arn" {
  value = aws_iam_role.gha_terraform.arn
}
```

Apply: `terraform apply` → có role ARN.

Tạo workflow `.github/workflows/learn-tf-plan.yml`:

```yaml
name: learn terraform plan
on:
  pull_request:
    paths: ['infra/**']

permissions:
  id-token: write
  contents: read

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::<your-account-id>:role/learn-gha-terraform
          aws-region: ap-southeast-1
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.10.0
      - run: terraform init
        working-directory: infra/envs/dev
      - run: terraform plan
        working-directory: infra/envs/dev
```

**Verify**: push PR đụng `infra/` → workflow chạy `plan` thành công, không cần secret nào.

**Còn lại**:

- App đang dùng S3 trên AWS. Dev local không muốn dùng AWS thật cho file upload (egress fee, slow round-trip). Có alternative S3-compatible nào free hơn?

→ Step 10: Cloudflare R2.

---

## Step 10 — Cloudflare R2 (multi-provider) (1 giờ)

**Why**: R2 S3-compatible, **free egress** (S3 charge $0.09/GB out). Dùng cho dev / public asset / backup target.

**What**: 1 stack có thể dùng nhiều provider. R2 = bucket trên CF, expose qua S3 API → AWS SDK gọi được không đổi 1 dòng code app.

**Code**: tạo `infra/cloudflare/main.tf`:

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

variable "cloudflare_account_id" {
  type = string
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_r2_bucket" "uploads" {
  account_id = var.cloudflare_account_id
  name       = "an-learn-uploads-dev"
  location   = "APAC"
}

output "s3_endpoint" {
  value = "https://${var.cloudflare_account_id}.r2.cloudflarestorage.com"
}
```

Set env var:

```bash
export TF_VAR_cloudflare_account_id="<your account id>"
export TF_VAR_cloudflare_api_token="<your token, scope R2:Edit>"
```

**Verify**:

```bash
cd infra/cloudflare
terraform init
terraform apply
aws s3 ls --endpoint-url "$(terraform output -raw s3_endpoint)" \
  --profile cf-r2 \
  s3://an-learn-uploads-dev/
```

(Cần cấu hình AWS CLI profile `cf-r2` với R2 access keys từ CF dashboard → R2 → Manage API Tokens.)

**Hoàn thành 10 step rồi → còn lại là refinement, không phải concept mới**:

- `terraform.tfvars.example` checked-in, `terraform.tfvars` gitignore (tránh leak credential).
- `backend.hcl` tách backend config khỏi `backend.tf` (để bucket/region khác giữa env).
- Module có thêm variable: lifecycle, CORS, KMS encryption, DLQ, FIFO, validation rules.
- Tag chuẩn qua `default_tags` ở provider (cost allocation).
- CI workflow `terraform-apply.yml` ngoài `plan` — apply tự động khi merge `main`, manual approval cho prod (qua GitHub Environments).

---

## Dọn dẹp (nếu cần)

Đang lab → muốn dừng tránh chi phí: `terraform destroy` từng stack theo thứ tự ngược apply:

```bash
cd infra/envs/staging && terraform destroy
cd infra/envs/dev     && terraform destroy
cd infra/cloudflare   && terraform destroy
cd infra/bootstrap    && terraform destroy   # state bucket + lock table CUỐI CÙNG
```

Tip an toàn: `terraform destroy -target=...` để xoá 1 resource thôi, tránh xoá nhầm cả stack.

---

## Concept cheatsheet

| Step | Concept                             | Khi nào dùng                                  |
| ---- | ----------------------------------- | --------------------------------------------- |
| 1    | provider, resource, init/plan/apply | Always.                                       |
| 2    | variable, output, tfvars            | Khi giá trị thay đổi giữa env hoặc cần expose |
| 3    | tách `*.tf` theo loại               | Khi file > 100 dòng                           |
| 4    | remote backend (S3 + DynamoDB)      | Khi > 1 người apply hoặc cần backup state     |
| 5    | `for_each`, `count`, `dynamic`      | Khi loop resource giống nhau                  |
| 6    | module                              | Khi reuse > 2 lần hoặc encapsulate logic      |
| 7    | folder-per-env                      | Khi cần > 1 env (dev/staging/prod)            |
| 8    | bootstrap stack với local state     | Khi state backend cần TF tự tạo               |
| 9    | OIDC + IAM role cho GitHub Actions  | Khi muốn CI/CD apply tự động                  |
| 10   | multi-provider (AWS + CF)           | Khi 1 stack đụng nhiều cloud                  |

## Đọc thêm

- **Terraform docs** (tốt nhất bắt đầu): <https://developer.hashicorp.com/terraform/tutorials>
- **AWS provider**: <https://registry.terraform.io/providers/hashicorp/aws/latest/docs>
- **Cloudflare provider**: <https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs>
- **Style guide**: <https://developer.hashicorp.com/terraform/language/style>
- **App-level setup** (không phải infra): [setup-roadmap.md](./setup-roadmap.md)
