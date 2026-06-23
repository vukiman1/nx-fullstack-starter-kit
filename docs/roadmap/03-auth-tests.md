# Auth Tests

Phần session/token chứa nhiều business logic nhưng chưa có unit test. Đây là việc đáng làm nhất để template "chuẩn" trọn vẹn.

---

## 7. 🟡 Unit test SessionService / CryptoService

**Vì sao:** `SessionService` là nơi tập trung toàn bộ logic phiên (create/rotate/revoke/enforce limit). Test được độc lập vì chỉ phụ thuộc 2 boundary: `RedisService` và `JwtService` — mock cả hai.

**SessionService — các hành vi cần phủ:**

- `createSession`: sinh jti, lưu AT (hash) + RF (nguyên), track session, trả đúng TTL.
- `enforceSessionLimit`: khi vượt `MAX_SESSIONS_PER_USER` thì đẩy đúng số phiên cũ nhất; phiên mới không bị đẩy.
- `rotateSession`: RF không tồn tại → `401`; RF hợp lệ → cấp AT+RF mới, ghi đè key cũ.
- `isAccessTokenActive`: khớp hash → `true`; sai/null → `false`.
- `revokeSession`: xoá đúng AC/RF + gỡ khỏi ZSET.
- `revokeAllSessions`: xoá mọi phiên + xoá ZSET key.

**CryptoService — các hành vi cần phủ:**

- `encryptData` → `decryptData` round-trip trả lại đúng plaintext.
- Hai lần `encryptData` cùng input cho ra ciphertext **khác nhau** (IV ngẫu nhiên).
- Ciphertext bị sửa (đổi 1 byte) → `decryptData` ném lỗi (auth tag GCM).

**Mock:** chỉ mock `RedisService` và `JwtService` (boundary ngoài). Không mock nội bộ.

**File liên quan:** thêm `session.service.spec.ts`, `crypto.service.spec.ts`.

**Acceptance:** `nx test @org/backend` và test của lib crypto chạy xanh, phủ các nhánh trên.

> Logic Lua (enforce limit atomic) khó unit-test với mock thuần → cân nhắc một integration test nhỏ chạy trên Redis thật (testcontainers) cho riêng phần giới hạn phiên.
