# Auth Hardening

Các điểm bảo mật còn hở trong luồng credential (không thuộc session/token đã xong).

---

## 1. 🔴 Bịt account enumeration ở login

**Vấn đề:** [user.local.strategy.ts](../../apps/backend/src/api/auth/strategies/local/user.local.strategy.ts) phân biệt hai trường hợp:

- Email không tồn tại → `getOneOrFail` ném `404 "User not found"`.
- Email tồn tại, sai password → `401 "Invalid password"`.

Kẻ tấn công dựa vào mã/nội dung lỗi khác nhau để dò email nào đã đăng ký.

**Vì sao quan trọng:** lộ danh sách tài khoản → tạo điều kiện cho credential stuffing / phishing nhắm mục tiêu.

**Cách làm:**

- Đổi `getOneOrFail` → `getOne` (không ném).
- Cả "không có user" lẫn "sai password" đều trả **cùng** `401 "Invalid credentials"`.
- Chống timing-attack: khi user không tồn tại, vẫn chạy một `argon2.verify` với hash giả (dummy) để thời gian phản hồi đồng nhất.

**File liên quan:** `strategies/local/user.local.strategy.ts`.

**Acceptance:** login sai email và login sai password trả về mã + message giống hệt nhau; thời gian phản hồi không lệch rõ giữa hai trường hợp.

> Lưu ý: register vẫn trả `409 "Email already exists"` — đây là trade-off UX phổ biến, chấp nhận được. Nếu muốn giấu hoàn toàn thì chuyển sang luồng email verification (xem mục 5).

---

## 2. 🟡 Siết password policy ở DTO

**Vấn đề:** [register.dto.ts](../../apps/backend/src/api/auth/dto/register.dto.ts) chỉ `@IsString @IsNotEmpty` → password `"1"` cũng hợp lệ. Việc so khớp `confirmPassword` đang nằm ở service thay vì DTO.

**Cách làm:**

- Thêm `@MinLength(8)` (và độ phức tạp nếu cần, ví dụ `@Matches` cho chữ + số).
- Đưa kiểm tra `password === confirmPassword` lên DTO bằng một custom validator (ví dụ `@Match('password')`), bỏ check thủ công trong `auth.service.register`.

**File liên quan:** `dto/register.dto.ts`, `services/auth.service.ts` (gỡ check confirmPassword thủ công).

**Acceptance:** đăng ký với password ngắn / không khớp confirm bị chặn ngay ở tầng validation với message rõ ràng.

---

## 3. 🟡 Bỏ fallback secret hardcode (fail-fast)

**Vấn đề:** còn fallback bí mật yếu trong code:

- [user.jwt.strategy.ts](../../apps/backend/src/api/auth/strategies/jwt/user.jwt.strategy.ts): `configService.get('jwt.secret') || 'secret'`.
- [crypto.service.ts](../../packages/backend/crypto/src/crypto.service.ts): default `'vibe_source_secret_key'`.

Config đã được zod validate nên runtime hiện luôn có giá trị, nhưng fallback hardcode khiến nếu config bị sai đường dẫn / thiếu, app **âm thầm chạy bằng secret yếu** thay vì báo lỗi.

**Cách làm:** bỏ các fallback; nếu thiếu secret thì để app crash khi khởi động (fail-fast). Có thể assert tường minh trong constructor.

**File liên quan:** `strategies/jwt/user.jwt.strategy.ts`, `packages/backend/crypto/src/crypto.service.ts`.

**Acceptance:** chạy app thiếu `JWT_SECRET` / `SECRET_KEY` → fail ngay lúc bootstrap, không khởi động được.
