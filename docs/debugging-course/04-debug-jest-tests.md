# Bài 04 — Debug Jest test trong VSCode (~30 phút)

Mục tiêu: chạy một file test dưới debugger, dừng được cả trong test lẫn trong code được
test, và debug một test fail đến nơi đến chốn.

## Config `Debug Jest (current file)`

Đã có sẵn trong `.vscode/launch.json`. Cách hoạt động:

- `--runTestsByPath ${file}` — chỉ chạy đúng file test **đang mở**.
- `cwd: ${fileDirname}` — Jest tự dò lên trên tìm `jest.config.cts` gần nhất, nên cùng một
  config dùng được cho cả test backend lẫn frontend.
- `--runInBand` — chạy test trong một process duy nhất. **Bắt buộc khi debug**: mặc định
  Jest fork nhiều worker, breakpoint sẽ không dính vào worker.

## Thực hành 1 — dừng trong test và trong code được test

1. Mở `apps/backend/src/api/auth/services/session.service.spec.ts`.
2. Đặt breakpoint trong một test bất kỳ (dòng gọi `createSession` chẳng hạn), và một cái
   nữa **trong** `session.service.ts` ở hàm `createSession`.
3. Chọn config **Debug Jest (current file)** → `F5`.
4. Debugger dừng ở test → `F5` tiếp → dừng trong service. Mọi kỹ năng bài 01–02 dùng được
   y nguyên: Variables, Watch, Debug Console, conditional breakpoint...
5. Khi dừng trong service, thử Debug Console:

   ```js
   redisService.set.mock.calls; // mock được gọi mấy lần, với tham số gì
   redisService.set.mock.calls[0];
   ```

   Soi `mock.calls` trực tiếp thường nhanh hơn đọc lỗi `expect(...).toHaveBeenCalledWith`.

## Thực hành 2 — chỉ chạy một test

File nhiều test mà anh chỉ quan tâm một cái: đổi tạm `it(...)` thành `it.only(...)` rồi
`F5`. Jest bỏ qua các test còn lại. **Nhớ bỏ `.only` trước khi commit** — lint của repo sẽ
chặn giúp nếu quên.

## Thực hành 3 — quy trình khi test fail

Giả lập: trong `session.service.ts`, hàm `resolveRefreshTtlMs`, đảo tạm hai config key
(`REFRESH_TTL_CONFIG_KEY` ↔ `REFRESH_TTL_REMEMBER_CONFIG_KEY`), lưu file.

1. Chạy test bình thường trước: `pnpm nx test @org/backend` — thấy các test TTL fail.
   Đọc kỹ output: expected vs received cho anh **triệu chứng**.
2. Mở file spec fail, đặt breakpoint ngay trên dòng `expect` đỏ → `F5` với config Jest.
3. Khi dừng, evaluate hai vế của expect trong Debug Console — thấy giá trị thật sự.
4. Step Into vào hàm được test, quan sát chỗ nó rẽ sai.
5. **Hoàn tác thay đổi** (`Cmd+Z`), chạy lại test — xanh.

Đây chính là loop anh sẽ dùng ở Mission 3 bài 05, và trong TDD hằng ngày: test fail →
breakpoint tại expect → truy ngược về root cause — không sửa mò.

## Ghi nhớ

- Debug test = debug backend, chỉ khác entry point. Kỹ năng cũ dùng lại 100%.
- `--runInBand` là lý do breakpoint dính; thiếu nó là "breakpoint không hoạt động".
- `it.only` + breakpoint tại dòng `expect` fail là combo vào việc nhanh nhất.
