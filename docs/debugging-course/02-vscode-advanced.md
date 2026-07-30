# Bài 02 — VSCode debugger nâng cao (~45 phút)

Mục tiêu: breakpoint có điều kiện, logpoint, exception breakpoint, watch, và sửa biến runtime.
Sân tập vẫn là flow login + `session.service.ts`.

Chuẩn bị: backend đang serve + đã attach (như bài 01), Bruno mở collection `tools/bruno`
với environment `local`. Mọi lần "login" dưới đây là bấm Run một request trong folder
`debug-course`.

> Serve restart (executor `@nx/js:node`) là **đổi PID** — phải attach lại, breakpoint cũ
> vẫn còn nhưng session debug thì mất.

## 1. Conditional breakpoint — chỉ dừng khi đáng dừng

Tình huống thật: hàm được gọi hàng trăm lần, anh chỉ quan tâm một case.

1. Mở `apps/backend/src/api/auth/services/session.service.ts`, tìm hàm `resolveRefreshTtlMs`.
2. **Chuột phải lên số dòng** đầu hàm → **Add Conditional Breakpoint** → nhập:
   `persistence === 'remember'`

   > `resolveRefreshTtlMs` nhận `persistence` (enum `SessionPersistence`), **không** có biến
   > `rememberMe`. Giá trị runtime là chữ **thường** (`'standard' | 'remember' | 'oauth'`) nên
   > so với `'remember'`, không phải `'REMEMBER'`. Cũng đừng so `SessionPersistence.REMEMBER`:
   > trong bundle webpack enum bị đổi tên (`session_persistence_enum_1.SessionPersistence`) nên
   > không resolve trong Debug Console.

3. Run `login-standard` → **không dừng**, Bruno trả 200 ngay. Run `login-remember` → dừng.

Cũng menu đó có **Hit Count** (dừng ở lần gọi thứ N) — hữu ích khi bug chỉ xảy ra ở
iteration cụ thể trong vòng lặp.

## 2. Logpoint — console.log không cần sửa code

1. Chuột phải số dòng cuối hàm `issueTokens` (dòng `return { accessToken, ... }`) →
   **Add Logpoint** → nhập:
   `issued jti={jti} ttlMs={refreshTokenTtlMs}`

   > `jti` và `refreshTokenTtlMs` đều là **tham số** của `issueTokens` nên luôn có trong
   > scope ở dòng cuối — không dính lỗi "not available" như biến khai báo giữa hàm.

2. Run `login-standard` rồi `login-remember` — Debug Console in mỗi lần chạy qua,
   **không dừng** process, **không đổi code**, không có gì để quên xóa trước khi commit.
   `ttlMs` khác nhau rõ: `86400000` (1 ngày) vs `5184000000` (60 ngày).
3. Run tiếp `refresh-token` — logpoint **lại bắn**. Vì `issueTokens` được gọi từ cả
   `createSession` (login) lẫn `rotateSession` (refresh), một logpoint ở đây phủ luôn cái
   luồng mà đặt `console.log` trong controller login không bao giờ thấy.

Kết quả đúng sẽ là **2 dòng**, dòng thứ hai mang badge `2` ở lề:

```text
issued jti=33945ff6…  ttlMs=86400000        ← login-standard
issued jti=45820c3a…  ttlMs=5184000000   2  ← login-remember + refresh-token
```

Debug Console gộp các dòng **giống hệt nhau** thành một dòng kèm số đếm. Nên cái badge `2`
đó chính là bằng chứng: refresh vừa giữ nguyên `jti` (`rotateSession` nhận lại jti cũ, không
sinh session mới), vừa giữ nguyên TTL 60 ngày (`persistence` được đọc ngược ra từ cookie
`sub` chứ không rơi về `standard`). Nếu một trong hai chỗ đó sai, hai dòng sẽ tách ra —
một cái bug TTL im lặng, bắt được chỉ bằng cách nhìn số đếm.

Logpoint hiện hình **kim cương đỏ** thay vì chấm tròn. Đây là kỹ thuật thay thế trực tiếp
thói quen rải `console.log` rồi phải dọn.

## 3. Exception breakpoint — dừng ngay nơi lỗi ném ra

1. Trong panel **Breakpoints** (dưới cùng bên trái), tick **All Exceptions**.
2. Run `login-wrong-password` → debugger dừng ngay tại dòng ném `UnauthorizedException`
   trong `apps/backend/src/api/auth/strategies/local/user.local.strategy.ts`, **trước khi**
   filter của Nest nuốt nó và biến thành response 401.
3. Nhìn Call Stack lúc đó: anh thấy chính xác con đường dẫn tới lỗi — thứ mà đọc log không
   bao giờ cho thấy đủ.
4. `F5` cho chạy tiếp, rồi Run `login-unknown-email`. Debugger dừng ở **đúng dòng throw đó**
   nhưng Variables cho thấy `user` là `undefined` (nhánh `!user`) chứ không phải sai mật
   khẩu. Cùng một chỗ ném, hai nguyên nhân khác nhau — chỉ Variables mới phân biệt được, log
   thì không.

> Lưu ý: app NestJS ném exception "chủ đích" khá nhiều (validation, 401...), nên **All
> Exceptions** ồn — bật khi cần săn, tắt khi xong. **Uncaught Exceptions** thì ít ồn hơn,
> có thể để bật thường trực.
>
> Phần ồn nhất đến từ thư viện: `@nx/js:node` + passport + argon2 ném/bắt exception nội bộ
> liên tục. Vì vậy config `Attach Backend (Nx)` có thêm
> `"${workspaceFolder}/**/node_modules/**"` trong `skipFiles` — js-debug bỏ qua luôn
> exception phát sinh trong code đã skip, nên anh chỉ dừng ở code của mình.

## 4. Watch — theo dõi biểu thức qua từng bước

1. Đặt breakpoint đầu hàm `createSession` (`session.service.ts`).
2. Panel **Watch** → thêm các biểu thức (scope `createSession` có `persistence`, **không** có
   `rememberMe`):
   - `persistence`
   - `this.resolveRefreshTtlMs(persistence)`
   - `this.configService.get('session.refreshTtlRemember')`
3. Run `login-standard` → dừng. Watch phải ra:

   | Biểu thức                                         | Giá trị      |
   | ------------------------------------------------- | ------------ |
   | `persistence`                                     | `'standard'` |
   | `this.resolveRefreshTtlMs(persistence)`           | `86400000`   |
   | `this.configService.get('...refreshTtlRemember')` | `'60d'`      |

   Hai chỗ dễ hiểu nhầm: `resolveRefreshTtlMs` khai `private` nhưng vẫn gọi được, vì
   `private` chỉ tồn tại lúc compile — runtime nó là method bình thường trên prototype.
   Còn `configService.get(...)` trả **chuỗi thô** `'60d'`, phải qua `parseDurationToMs` mới
   thành mili-giây.

4. Step (`F10`, `F11`) qua flow — Watch tự re-evaluate sau mỗi bước. Khác với hover (xem một
   lần), Watch bám theo suốt phiên debug.

## 5. Sửa biến runtime — thử "what if" không cần sửa code

1. Vẫn breakpoint ở đầu `createSession`, Run `login-standard` → dừng với `persistence = 'standard'`.
2. Debug Console: `this.resolveRefreshTtlMs(persistence) / 86_400_000` → **1** (TTL 1 ngày).
3. Panel Variables → **double-click** giá trị `persistence` → gõ `'remember'` (có nháy —
   js-debug evaluate input như biểu thức, gõ trần `remember` sẽ lỗi vì bị coi là biến) → Enter.
4. Gõ lại đúng biểu thức trên → giờ ra **60**. `F5` cho request chạy nốt, rồi mở tab
   **Cookies** của Bruno: cookie `sub` mang `Max-Age=5184000`.

Con số `5184000` đó mới là bằng chứng: đổi giá trị trong Variables không phải chỉ đổi thứ
hiển thị — một request "không tick Remember me" vừa thật sự cấp session 60 ngày, mà anh
không sửa một dòng code nào. Dùng để trả lời "nếu giá trị này khác thì code có chạy đúng
không?" trước khi thật sự sửa.

## 6. Đọc Call Stack async

Đặt breakpoint trong `issueTokens` (dòng `const payload = { id: userId, jti };`) rồi Run
`login-standard`. Call Stack đọc từ trên xuống phải ra:

```text
issueTokens            session.service.ts
createSession          session.service.ts
issueSession           auth.service.ts
login                  auth.service.ts
login                  auth.base.controller.ts
… Express
```

Giữa `issueTokens` và `createSession` là một `await`, giữa `createSession` và `issueSession`
cũng vậy. Không có debugger thì mỗi `await` là một chỗ đứt stack — chỉ thấy được frame hiện
tại. VSCode nối chuỗi async frame lại nên đọc ngược lên tận controller vẫn liền mạch. Frame
mờ (`<node_internals>`, `node_modules`) đã bị ẩn bớt nhờ `skipFiles` trong launch.json.

## Ghi nhớ

| Kỹ thuật               | Thay cho thói quen                           |
| ---------------------- | -------------------------------------------- |
| Conditional breakpoint | `if (x === y) console.log(...)`              |
| Logpoint               | `console.log` rải khắp nơi rồi quên xóa      |
| Exception breakpoint   | đọc stack trace trong log rồi đoán           |
| Watch                  | log cùng một biến ở 5 chỗ                    |
| Sửa biến runtime       | sửa code + restart chỉ để thử một giả thuyết |
