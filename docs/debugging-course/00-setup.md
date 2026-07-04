# Bài 00 — Setup & làm quen địa hình (~10 phút)

Course này dạy debug bằng **VSCode debugger** (backend NestJS + Jest) và **Chrome DevTools**
(frontend React), thực hành trực tiếp trên flow auth/session của repo. Học tuần tự 00 → 05.

## Chuẩn bị

1. Backend chạy được như khi anh dev bình thường (Postgres + Redis đã bật).
2. Có một tài khoản user đã đăng ký + verify email để login.
3. Chrome cài extension **React Developer Tools** (dùng ở bài 03).

## Hiểu 4 cấu hình trong `.vscode/launch.json`

Mở panel **Run and Debug** (`Cmd+Shift+D`) — dropdown trên cùng có 4 config:

| Config                      | Loại   | Khi nào dùng                                                                                                                                                                                                                                |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Debug Backend (Direct)`    | launch | Build backend rồi chạy thẳng `dist/main.js` dưới debugger. Không có watch — sửa code phải chạy lại.                                                                                                                                         |
| `Launch Backend (Nx)`       | launch | Chạy `nx serve` dưới debugger — có watch/rebuild. Chậm khởi động hơn Direct.                                                                                                                                                                |
| `Attach Backend (Nx)`       | attach | **Dùng nhiều nhất.** Backend đã chạy sẵn bằng `pnpm nx serve @org/backend` (mở port inspector 9229 — chính là dòng `Debugger listening on ws://localhost:9229` anh từng thấy). Config này "gắn" debugger vào process đó, không cần restart. |
| `Debug Jest (current file)` | launch | Chạy file test đang mở dưới debugger (bài 04).                                                                                                                                                                                              |

> **launch vs attach**: `launch` = debugger tự khởi động process. `attach` = process đã chạy
> từ trước, debugger chỉ kết nối vào. Với dev server có watch, attach tiện hơn nhiều.

## Vì sao breakpoint trong file `.ts` lại hoạt động?

Backend chạy bundle webpack (`dist/main.js`), không chạy file `.ts` trực tiếp. Debugger map
được vị trí trong bundle về file nguồn nhờ **source map** (`sourceMaps: true` +
`sourceMapPathOverrides` trong launch.json). Frontend cũng vậy — Vite serve source map nên
Chrome hiện đúng file `.tsx`. Nếu breakpoint hiện **vòng tròn rỗng/xám** nghĩa là source map
chưa khớp (thường do chưa rebuild hoặc attach nhầm process).

## Phím tắt phải thuộc (macOS)

| Phím           | Hành động                                              |
| -------------- | ------------------------------------------------------ |
| `F9`           | Bật/tắt breakpoint tại dòng con trỏ                    |
| `F5`           | Start / **Continue** (chạy tiếp tới breakpoint kế)     |
| `F10`          | **Step Over** — chạy hết dòng hiện tại, dừng ở dòng kế |
| `F11`          | **Step Into** — đi vào bên trong hàm đang được gọi     |
| `Shift+F11`    | **Step Out** — chạy nốt hàm hiện tại, quay về nơi gọi  |
| `Cmd+Shift+F5` | Restart phiên debug                                    |
| `Shift+F5`     | Stop / Disconnect                                      |

## Checklist trước khi qua bài 01

- [ ] `pnpm nx serve @org/backend` chạy, log có dòng `Debugger listening on ws://localhost:9229`.
- [ ] Chọn `Attach Backend (Nx)` → `F5` → thanh trạng thái VSCode chuyển màu cam (đã attach).
- [ ] `Shift+F5` để disconnect — backend vẫn chạy bình thường (attach không giết process).
