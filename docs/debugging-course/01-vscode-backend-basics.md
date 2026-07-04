# Bài 01 — VSCode debugger cơ bản với backend NestJS (~45 phút)

Mục tiêu: đặt breakpoint, đọc Variables / Call Stack, step qua flow login thật, và dùng
Debug Console thay cho `console.log`.

## Sân tập: flow login

```
POST /api/auth/login
  → CaptchaGuard + AuthGuard('local.user')      (xác thực email/password)
  → AuthBaseController.login()                   auth.base.controller.ts
  → AuthService.login()                          auth.service.ts
  → SessionService.createSession()               session.service.ts (JWT + Redis)
  → UserSessionService.createSession()           user-session.service.ts (ghi DB)
  → setSessionCookies()                          set cookie httpOnly
```

## Thực hành 1 — breakpoint đầu tiên

1. Chạy `pnpm nx serve @org/backend`, rồi `F5` với config **Attach Backend (Nx)**.
2. Mở `apps/backend/src/api/auth/controllers/auth.base.controller.ts`, đặt breakpoint (`F9`)
   tại dòng `return this.authService.login(...)` trong handler `login`.
3. Gọi login — bằng form frontend, hoặc curl:

   ```bash
   curl -s http://localhost:3000/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"<email-cua-anh>","password":"<password>","rememberMe":true}'
   ```

4. VSCode dừng tại breakpoint. Nhìn quanh:
   - **Variables** (panel trái): mở `loginDto` — thấy `email`, `rememberMe`. Mở `userData` —
     user entity mà passport strategy đã xác thực xong và gắn vào request.
   - **Call Stack**: các frame từ Express → guard → controller. Click một frame bất kỳ để
     nhảy tới code của frame đó — Variables đổi theo frame đang chọn.
   - **Hover** chuột lên bất kỳ biến nào trong code để xem giá trị tại chỗ.

## Thực hành 2 — step xuống tận đáy

Vẫn đang dừng ở controller:

1. `F11` (Step Into) để đi vào `authService.login()` — anh đang ở `auth.service.ts`.
2. `F10` (Step Over) từng dòng tới `this.sessionService.createSession(id, rememberMe)`,
   rồi `F11` vào trong — giờ ở `session.service.ts`, hàm `createSession`.
3. `F10` qua dòng tạo `jti` — nhìn Variables thấy `jti` vừa được gán UUID.
4. `Shift+F11` (Step Out) hai lần để quay ngược về `auth.service.ts` — để ý **Call Stack**
   ngắn dần khi anh thoát khỏi từng hàm.
5. `F5` (Continue) cho request chạy nốt — curl nhận response.

> Async không cản trở gì: NestJS toàn `async/await` nhưng debugger vẫn step qua `await`
> tự nhiên như code đồng bộ.

## Thực hành 3 — Debug Console thay console.log

Đặt lại breakpoint trong `AuthService.login` (dòng sau `createSession`), login lần nữa.
Khi dừng, mở tab **Debug Console** (cạnh Terminal) và gõ thử:

```js
session.jti;
session.refreshTokenTtlMs / 86_400_000; // TTL ra ngày — 60 nếu rememberMe
user.email;
this.userSessionService; // inspect cả service được inject
```

Debug Console **evaluate trong scope đang dừng** — gọi được hàm, xem được `this`. Đây là thứ
thay thế 90% nhu cầu `console.log` khi debug: không sửa code, không cần restart, hỏi gì được nấy.

## Ghi nhớ

- Attach một lần, đặt/gỡ breakpoint thoải mái — không cần restart backend.
- Step Into khi muốn biết _bên trong_ hàm làm gì; Step Over khi tin hàm đó rồi.
- Call Stack đọc từ trên xuống = "ai đang chạy ← ai gọi nó ← ai gọi nữa".
- Xong bài này anh đã debug xuyên 3 tầng controller → service → service. Bài 02 học các
  loại breakpoint "thông minh" hơn.
