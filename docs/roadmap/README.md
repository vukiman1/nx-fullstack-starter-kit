# Auth Roadmap

Danh sách việc cần triển khai sau cho phần authentication của backend. Mỗi mục có file chi tiết riêng trong thư mục này.

Quy ước ưu tiên: 🔴 nên làm sớm (bảo mật) · 🟡 nên làm (chất lượng) · 🟢 nice-to-have.

## Tổng hợp

| #   | Việc                                         | Ưu tiên | Loại      | Chi tiết                                                     |
| --- | -------------------------------------------- | ------- | --------- | ------------------------------------------------------------ |
| 1   | Bịt account enumeration ở login              | 🔴      | Hardening | [01-auth-hardening.md](01-auth-hardening.md)                 |
| 2   | Siết password policy (DTO)                   | 🟡      | Hardening | [01-auth-hardening.md](01-auth-hardening.md)                 |
| 3   | Bỏ fallback secret hardcode (fail-fast)      | 🟡      | Hardening | [01-auth-hardening.md](01-auth-hardening.md)                 |
| 4   | Forgot / reset password                      | 🟡      | Feature   | [02-auth-account-lifecycle.md](02-auth-account-lifecycle.md) |
| 5   | Email verification                           | 🟡      | Feature   | [02-auth-account-lifecycle.md](02-auth-account-lifecycle.md) |
| 6   | Change password endpoint (+ hash khi update) | 🟢      | Feature   | [02-auth-account-lifecycle.md](02-auth-account-lifecycle.md) |
| 7   | Unit test SessionService / CryptoService     | 🟡      | Test      | [03-auth-tests.md](03-auth-tests.md)                         |
| 8   | Redis cluster: hash-tag cho session keys     | 🟢      | Scaling   | [04-infra-scaling.md](04-infra-scaling.md)                   |
| 9   | Audit logging cho sự kiện auth               | 🟢      | Ops       | [04-infra-scaling.md](04-infra-scaling.md)                   |
| 10  | CAPTCHA cho login                            | 🟢      | Hardening | [04-infra-scaling.md](04-infra-scaling.md)                   |

## Đã hoàn thành (ngữ cảnh)

Phần session/token đã làm xong, không nằm trong roadmap này:

- Multi-device session theo `jti`, key Redis tách theo phiên.
- Allowlist AT trong Redis + revoke tức thì khi logout.
- Cookie cứng: `httpOnly` + `secure` (production) + `sameSite=lax`.
- Crypto cookie `sub`: AES-256-GCM + IV ngẫu nhiên (có auth tag).
- AT lưu **hash** trong Redis; RF lưu nguyên (cần verify khi rotate).
- Rotate RF mỗi lần refresh + sliding TTL.
- Giới hạn `MAX_SESSIONS_PER_USER` (mặc định 5), enforce **atomic** bằng Lua.
- `POST /auth/refresh-token` (không còn GET đổi state).
- `POST /auth/logout` (revoke đúng phiên theo `jti` đã xác thực) + `POST /auth/logout-all`.
- Password hash argon2 (`@BeforeInsert`), `@Exclude()` chặn lộ password.
