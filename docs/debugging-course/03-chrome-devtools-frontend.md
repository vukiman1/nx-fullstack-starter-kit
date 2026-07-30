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

### "Vậy source frontend lộ hết à?"

Ở **dev** thì đúng: Vite serve thẳng file `.tsx` chưa bundle, ai mở DevTools cũng đọc được —
nhưng đó là server chạy trên máy anh, không ai ngoài truy cập.

Ở **production** repo này thì không lộ source gốc: `vite.config.mts` không bật
`build.sourcemap` (mặc định `false`) và không có plugin upload sourcemap cho Sentry, nên
`dist/` chỉ có JS đã minify, không kèm file `.map`, không còn tên file nguồn.

Nhưng **minify không phải là giấu**. Tên biến bị rút gọn, còn **chuỗi ký tự thì nguyên vẹn**.
Build thử rồi grep bundle:

```text
{defaultValues:{email:`user@example.com`,password:`Local1234`,rememberMe:!1}
```

Đó là `defaultValues` của `login-form.tsx` nằm trong `dist/assets/index-*.js`, tìm bằng
`Cmd+F` là ra. Code frontend chạy trên máy người dùng nên **luôn** đọc được — quy tắc duy
nhất là đừng bao giờ để secret trong đó. Prefill mật khẩu cho tiện dev chính là ví dụ: tiện
thật, nhưng nó đi thẳng vào bundle production.

## 2. XHR/fetch breakpoint — dừng theo request, không theo dòng code

Kỹ thuật này trả lời **"code nào bắn request này"**, chứ không phải "app có những request
nào". Muốn biết vế sau thì mở **Network** (mục 3) làm hành động cần soi, rồi copy một mẩu
URL đặc trưng từ đó ra. Vào codebase lạ thì thứ tự đúng là **Network trước, XHR breakpoint
sau** — mục 3 của bài này đọc trước mục 2 cũng được.

Nếu app ít traffic, còn một đường tắt: để pattern **rỗng** → Chrome dừng ở **mọi** XHR,
không cần biết URL trước.

1. Sources → panel phải → **XHR/fetch Breakpoints** → **+** → nhập `auth/login` (mẩu URL
   lấy từ Network).
2. Gỡ breakpoint cũ, submit form → Chrome dừng **ngay tại nơi phát request**, Call Stack
   dẫn ngược về `onSubmit`.

Cùng khu đó còn **Event Listener Breakpoints** (thử tick `Control > submit` — dừng ở mọi
submit handler) và **DOM Breakpoints** (chuột phải element trong Elements → Break on >
attribute modifications).

## 3. Network — sự thật nằm ở đây

Tab **Network**, filter `Fetch/XHR`, rồi login lại (tick Remember me):

1. Click request `login` → **Payload**: body JSON gồm `rememberMe: true` — đúng thứ
   backend nhận.
2. **Headers → Response Headers**: hai dòng `Set-Cookie` (access token + session), có
   `HttpOnly` và `Max-Age`. Login có/không Remember me rồi so `Max-Age` của cookie session:

   ```text
   sub=…;          Max-Age=5184000   ← 60 ngày, khi tick Remember me
   sub=…;          Max-Age=86400     ← 1 ngày,  khi không tick
   access_token=…; Max-Age=900       ← 15 phút, cả hai trường hợp
   ```

   Đây đúng là cặp số bài 02 đã thấy từ phía backend (`ttlMs=5184000000` / `86400000`) —
   cùng một sự thật, nhìn từ hai đầu.

   > Frontend gọi thẳng `localhost:3000` (không proxy qua Vite) nên đây là **cross-origin**:
   > mỗi lần login browser gửi thêm một `OPTIONS` preflight. Filter `Fetch/XHR` **ẩn nó đi**
   > vì preflight do browser sinh, không phải do JS gọi — muốn thấy phải chuyển sang **All**.
   > Backend không set `Access-Control-Max-Age` nên Chrome cache preflight ~5 giây; login
   > liên tiếp trong khoảng đó sẽ không thấy `OPTIONS` nữa.

3. Cookie `HttpOnly` nghĩa là JS **không đọc được** (`document.cookie` không thấy) — muốn
   xem cookie hiện tại phải vào tab **Application → Cookies → http://localhost:4200**.
4. Thử login sai password: request đỏ, status 401, tab **Response** cho thấy body lỗi mà
   `ApiError` phía client sẽ parse.

> Debug frontend-backend "ai sai?" luôn bắt đầu ở Network: payload đúng chưa (lỗi client)
> và response đúng chưa (lỗi server). Trả lời được câu đó là khoanh vùng được một nửa bug.

## 4. React DevTools — nhìn thấy state

Cài extension React Developer Tools (nếu chưa), mở lại DevTools:

1. Tab **Components**: cây component thật của app. Tìm `LoginForm` — panel phải hiện
   **hooks** của nó: một chuỗi hook nội bộ của TanStack Form, cộng `State` chứa
   `submitError` và một hook giữ `setUser`.
2. Nhấn nút con trỏ của React DevTools rồi click thẳng vào form trên trang — nhảy tới
   component tương ứng.
3. Login thành công rồi tìm **`SimpleHeader`** — `user` đổi từ `null` sang object ở đó.

   Đừng tìm `user` trong `LoginForm`: nó chỉ đăng ký đúng một lát cắt
   (`useAuthStore((state) => state.setUser)`), nên `user` đổi cũng **không** re-render nó.
   Còn `SimpleHeader` dùng `useAuthStore(selectUser)` nên mới nhận thay đổi. Đây chính là
   lý do store này viết theo kiểu selector — chọn nhầm component để soi là tưởng state
   không cập nhật.

4. Trong tab Components, chọn `LoginForm` rồi qua Console gõ `$r` — chính là instance
   component đang chọn (tương tự `$0` cho DOM element đang chọn ở tab Elements).

> Store là **Zustand**, không phải React state, nên React DevTools chỉ thấy được **giá trị
> mà component đã select**, không thấy toàn bộ store. Muốn nhìn cả store thì dùng **Redux
> DevTools**: `auth-store.ts` bọc `devtools` middleware với `name: 'auth'` và bật ở mọi môi
> trường trừ production, nên mỗi lần login sẽ thấy action `auth/setUser` chạy qua kèm state
> trước/sau.

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
