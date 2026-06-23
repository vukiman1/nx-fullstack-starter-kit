# Auth Account Lifecycle

Các luồng vòng đời tài khoản chưa có. Quyết định phạm vi: template tự bao gồm hay để người dùng tự thêm.

---

## 4. 🟡 Forgot / reset password

**Vấn đề:** chưa có cách lấy lại mật khẩu khi quên.

**Cách làm (gợi ý):**

1. `POST /auth/forgot-password` nhận email → sinh reset token ngẫu nhiên, lưu Redis `RESET:${userId}` với TTL ngắn (ví dụ 15m) → gửi email kèm link chứa token. Trả response **đồng nhất** dù email có tồn tại hay không (tránh enumeration).
2. `POST /auth/reset-password` nhận token + password mới → verify token trong Redis → cập nhật password (đảm bảo **hash** — xem mục 6) → xoá reset token → **revoke toàn bộ session** của user (`revokeAllSessions`).

**File liên quan:** auth controller/service, `SessionService.revokeAllSessions`, `EmailService`, Redis.

**Acceptance:** quên mật khẩu → nhận email → đặt lại thành công → mọi phiên cũ bị thu hồi, đăng nhập lại bằng mật khẩu mới.

---

## 5. 🟡 Email verification

**Vấn đề:** register kích hoạt tài khoản ngay; welcome email được gửi nhưng không bắt xác minh email có thật.

**Cách làm (gợi ý):**

- Thêm cờ `isEmailVerified` (mặc định `false`) vào `UserEntity`.
- Register sinh verify token (Redis TTL) → gửi email xác minh.
- `GET/POST /auth/verify-email` nhận token → set `isEmailVerified = true`.
- Quyết định chính sách: chặn login khi chưa verify, hay chỉ giới hạn quyền cho tới khi verify.

**File liên quan:** `UserEntity` (+ migration), auth controller/service, `EmailService`.

**Acceptance:** user mới chưa verify bị chặn theo đúng chính sách đã chọn; sau khi bấm link xác minh thì truy cập bình thường.

---

## 6. 🟢 Change password endpoint (+ hash khi update)

**Vấn đề:** [auth.swagger.ts](../../apps/backend/src/api/auth/auth.swagger.ts) đã có `ApiChangePassword` nhưng **không có endpoint** tương ứng. Ngoài ra `UserEntity` chỉ hash ở `@BeforeInsert`, **không** có `@BeforeUpdate` → nếu thêm đổi-password qua `update` dễ quên hash, lưu plaintext.

**Cách làm:**

- Thêm `POST /auth/change-password` (yêu cầu đăng nhập): verify mật khẩu cũ → đặt mật khẩu mới.
- Đảm bảo mật khẩu mới được **hash** (thêm `@BeforeUpdate` hook hash khi password đổi, hoặc hash tường minh trong service).
- Cân nhắc revoke các phiên khác sau khi đổi mật khẩu.

**File liên quan:** auth controller/service, `UserEntity`, `auth.swagger.ts` (hoặc gỡ swagger thừa nếu không làm).

**Acceptance:** đổi mật khẩu hoạt động, mật khẩu mới luôn ở dạng hash trong DB; nếu không làm thì gỡ `ApiChangePassword` để tránh swagger lẫn lộn.
