# Bài 03 — Chrome DevTools cho frontend React (~60 phút)

Mục tiêu: debug code React/TypeScript gốc trong tab Sources, soi request/cookie trong
Network, và đọc state component bằng React DevTools.

Chuẩn bị: `pnpm nx serve @org/frontend` (Vite, http://localhost:4200) + backend đang chạy.
Mở DevTools bằng `Cmd+Option+I`.

## 1. Sources — breakpoint trong file .tsx gốc

1. Mở trang `/login`. Trong DevTools, tab **Sources**, nhấn `Cmd+P` gõ `login-form` →
   mở được `login-form.tsx` **nguyên bản TypeScript** — đó là source map của Vite làm việc.
2. Đặt breakpoint (click số dòng) trong `onSubmit` — dòng
   `const result = await authService.login(value)`.
3. Submit form → dừng. Các panel bên phải tương ứng VSCode: **Scope** (= Variables),
   **Call Stack**, **Watch**. Phím tắt: `F8` = Continue, `F10` = Step Over, `F11` = Step Into.
4. Đang dừng, hover lên `value` — thấy `email`, `password`, `rememberMe` người dùng nhập.
5. `F11` vào `authService.login` → anh đang ở `auth-service.ts`, rồi vào tiếp
   `http-request` nếu tò mò tầng gọi API.

> Tab **Console** trong lúc đang dừng cũng evaluate theo scope đang dừng — gõ `value.email`
> ra ngay giá trị, giống Debug Console của VSCode.

## 2. XHR/fetch breakpoint — dừng theo request, không theo dòng code

Khi không biết code nào bắn request:

1. Sources → panel phải → **XHR/fetch Breakpoints** → **+** → nhập `auth/login`.
2. Gỡ breakpoint cũ, submit form → Chrome dừng **ngay tại nơi phát request**, Call Stack
   dẫn ngược về `onSubmit`. Kỹ thuật này cực hữu ích khi vào codebase lạ.

Cùng khu đó còn **Event Listener Breakpoints** (thử tick `Control > submit` — dừng ở mọi
submit handler) và **DOM Breakpoints** (chuột phải element trong Elements → Break on >
attribute modifications).

## 3. Network — sự thật nằm ở đây

Tab **Network**, filter `Fetch/XHR`, rồi login lại (tick Remember me):

1. Click request `login` → **Payload**: body JSON gồm `rememberMe: true` — đúng thứ
   backend nhận.
2. **Headers → Response Headers**: hai dòng `Set-Cookie` (access token + session), có
   `HttpOnly` và `Max-Age`. Login có/không Remember me rồi so `Max-Age` của cookie session —
   anh sẽ thấy 60 ngày vs ngắn hơn hẳn.
3. Cookie `HttpOnly` nghĩa là JS **không đọc được** (`document.cookie` không thấy) — muốn
   xem cookie hiện tại phải vào tab **Application → Cookies → http://localhost:4200**.
4. Thử login sai password: request đỏ, status 401, tab **Response** cho thấy body lỗi mà
   `ApiError` phía client sẽ parse.

> Debug frontend-backend "ai sai?" luôn bắt đầu ở Network: payload đúng chưa (lỗi client)
> và response đúng chưa (lỗi server). Trả lời được câu đó là khoanh vùng được một nửa bug.

## 4. React DevTools — nhìn thấy state

Cài extension React Developer Tools (nếu chưa), mở lại DevTools:

1. Tab **Components**: cây component thật của app. Tìm `LoginForm` — panel phải hiện
   **hooks** của nó (useForm state, useState `submitError`...).
2. Nhấn nút con trỏ của React DevTools rồi click thẳng vào form trên trang — nhảy tới
   component tương ứng.
3. Login rồi xem component dùng `useAuthStore` — thấy `user` trong store đổi từ `null`
   sang object sau khi login thành công.
4. Trong tab Components, chọn `LoginForm` rồi qua Console gõ `$r` — chính là instance
   component đang chọn (tương tự `$0` cho DOM element đang chọn ở tab Elements).

## 5. Túi đồ nghề Console

Chọn checkbox "Remember me" trong tab Elements rồi qua Console:

```js
$0; // element đang chọn trong Elements
$0.checked; // đọc property trực tiếp
monitorEvents($0, 'change'); // in mọi event 'change' của nó (unmonitorEvents($0) để tắt)
copy(someObject); // copy object vào clipboard dạng JSON
```

Và trong code, từ khóa `debugger;` đặt tạm vào bất kỳ đâu sẽ dừng DevTools đúng chỗ đó —
nhớ xóa trước khi commit (ESLint thường cũng sẽ nhắc).

## Ghi nhớ

- `Cmd+P` trong Sources = mở file nguồn gốc qua source map — debug `.tsx` thật, không phải
  bundle.
- Không biết code nào gọi API → XHR/fetch breakpoint, Call Stack chỉ đường.
- Nghi ngờ dữ liệu → Network (payload/response/cookie). Nghi ngờ state → React DevTools.
