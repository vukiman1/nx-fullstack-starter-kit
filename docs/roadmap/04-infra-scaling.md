# Infra & Scaling

Các điểm liên quan vận hành / mở rộng. Không chặn ở quy mô starter, nhưng cần biết trước khi scale.

---

## 8. 🟢 Redis cluster: hash-tag cho session keys

**Vấn đề:** Lua script `enforceSessionLimit` / `trackSession` thao tác trên nhiều key (`SESSIONS:${id}`, `AC_TOKEN:${id}:${jti}`, `RF_TOKEN:${id}:${jti}`) nhưng chỉ khai báo `SESSIONS:${id}` trong `KEYS[]`, các key AC/RF được dựng bên trong script. Ở **Redis Cluster**, mọi key một script đụng tới phải nằm cùng slot, nếu không sẽ lỗi `CROSSSLOT`.

Config mặc định `redis.cluster: false` nên hiện **không** ảnh hưởng.

**Cách làm (khi bật cluster):** thêm hash-tag `{id}` để mọi key của một user vào cùng slot:

- `SESSIONS:{id}`
- `AC_TOKEN:{id}:${jti}`
- `RF_TOKEN:{id}:${jti}`

Cập nhật `SessionService` key builders + ARGV prefix truyền vào Lua.

**File liên quan:** [session.service.ts](../../apps/backend/src/api/auth/services/session.service.ts).

**Acceptance:** chạy trên Redis Cluster, login/refresh/logout/enforce-limit không lỗi `CROSSSLOT`.

---

## 9. 🟢 Audit logging cho sự kiện auth

**Vấn đề:** chưa ghi log các sự kiện đăng nhập / đăng xuất / refresh / login thất bại / phiên bị đẩy ra do vượt giới hạn.

**Cách làm:** log có cấu trúc (userId, sự kiện, jti, IP, user-agent, thời điểm) cho các điểm trên. Không log token/secret/PII nhạy cảm.

**Acceptance:** truy vết được "ai đăng nhập/đăng xuất ở đâu, khi nào", phục vụ điều tra sự cố.

---

## 10. 🟢 CAPTCHA cho login

**Vấn đề:** [login.dto.ts](../../apps/backend/src/api/auth/dto/login.dto.ts) đã có comment `captchaToken` nhưng chưa triển khai. Hiện chống brute-force chỉ bằng `@Throttle` (5/60s).

**Cách làm:** tích hợp CAPTCHA (ví dụ Turnstile / reCAPTCHA) ở login khi cần lớp chặn bot mạnh hơn — verify token phía server trước khi xử lý đăng nhập.

**Acceptance:** login yêu cầu và xác minh CAPTCHA token theo chính sách đã chọn.
