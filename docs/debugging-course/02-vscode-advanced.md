# Bài 02 — VSCode debugger nâng cao (~45 phút)

Mục tiêu: breakpoint có điều kiện, logpoint, exception breakpoint, watch, và sửa biến runtime.
Sân tập vẫn là flow login + `session.service.ts`.

Chuẩn bị: backend đang serve + đã attach (như bài 01).

## 1. Conditional breakpoint — chỉ dừng khi đáng dừng

Tình huống thật: hàm được gọi hàng trăm lần, anh chỉ quan tâm một case.

1. Mở `apps/backend/src/api/auth/services/session.service.ts`, tìm hàm `resolveRefreshTtlMs`.
2. **Chuột phải lên số dòng** đầu hàm → **Add Conditional Breakpoint** → nhập:
   `rememberMe === true`
3. Login **không tick** Remember me → không dừng. Login **có tick** → dừng.

Cũng menu đó có **Hit Count** (dừng ở lần gọi thứ N) — hữu ích khi bug chỉ xảy ra ở
iteration cụ thể trong vòng lặp.

## 2. Logpoint — console.log không cần sửa code

1. Chuột phải số dòng cuối hàm `issueTokens` (dòng `return { accessToken, ... }`) →
   **Add Logpoint** → nhập:
   `issued jti={jti} ttlMs={refreshTokenTtlMs}`
2. Login vài lần với/không Remember me — Debug Console in giá trị mỗi lần chạy qua,
   **không dừng** process, **không đổi code**, không có gì để quên xóa trước khi commit.

Logpoint hiện hình **kim cương đỏ** thay vì chấm tròn. Đây là kỹ thuật thay thế trực tiếp
thói quen rải `console.log` rồi phải dọn.

## 3. Exception breakpoint — dừng ngay nơi lỗi ném ra

1. Trong panel **Breakpoints** (dưới cùng bên trái), tick **All Exceptions**.
2. Login với **password sai** → debugger dừng ngay tại nơi `UnauthorizedException` được ném
   (trong local strategy / service xác thực), **trước khi** nó bị filter của Nest nuốt và
   biến thành response 401.
3. Nhìn Call Stack lúc đó: anh thấy chính xác con đường dẫn tới lỗi — thứ mà đọc log không
   bao giờ cho thấy đủ.

> Lưu ý: app NestJS ném exception "chủ đích" khá nhiều (validation, 401...), nên **All
> Exceptions** ồn — bật khi cần săn, tắt khi xong. **Uncaught Exceptions** thì ít ồn hơn,
> có thể để bật thường trực.

## 4. Watch — theo dõi biểu thức qua từng bước

1. Đặt breakpoint đầu hàm `createSession` (`session.service.ts`).
2. Panel **Watch** → thêm 2 biểu thức:
   - `rememberMe`
   - `this.configService.get('session.refreshTtlRemember')`
3. Login và step (`F10`, `F11`) qua flow — Watch tự re-evaluate sau mỗi bước. Khác với hover
   (xem một lần), Watch bám theo suốt phiên debug.

## 5. Sửa biến runtime — thử "what if" không cần sửa code

1. Vẫn dừng ở đầu `createSession` với login **không tick** Remember me (`rememberMe = false`).
2. Panel Variables → **double-click** giá trị `rememberMe` → gõ `true` → Enter.
3. `F10` qua dòng `resolveRefreshTtlMs` — TTL trả về giờ là TTL 60 ngày của remember-me.

Anh vừa đổi hành vi của một request đang bay mà không đổi một dòng code. Dùng để trả lời
"nếu giá trị này khác thì code có chạy đúng không?" trước khi thật sự sửa.

## 6. Đọc Call Stack async

Đặt breakpoint trong `issueTokens` rồi login: Call Stack có thể chứa các frame `async`
(`await ...`). VSCode nối chuỗi async frame cho anh — vẫn thấy được `createSession` →
`login` → controller dù giữa chúng là `await`. Frame mờ (`<node_internals>`) đã bị ẩn bớt
nhờ `skipFiles` trong launch.json.

## Ghi nhớ

| Kỹ thuật               | Thay cho thói quen                           |
| ---------------------- | -------------------------------------------- |
| Conditional breakpoint | `if (x === y) console.log(...)`              |
| Logpoint               | `console.log` rải khắp nơi rồi quên xóa      |
| Exception breakpoint   | đọc stack trace trong log rồi đoán           |
| Watch                  | log cùng một biến ở 5 chỗ                    |
| Sửa biến runtime       | sửa code + restart chỉ để thử một giả thuyết |
