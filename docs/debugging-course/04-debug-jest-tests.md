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
5. Debug Console, và **tên gọi đổi theo chỗ đang dừng** — đây là chỗ hay gõ sai:

   ```js
   // đang dừng TRONG spec: mock nằm ở biến local `redis`
   redis.set.mock.calls;
   redis.set.mock.calls[0][0].expired;

   // đang dừng TRONG session.service.ts: cùng object đó, nhưng truy cập qua `this`
   this.redisService.set.mock.calls;
   ```

   Cùng một mock, hai đường gọi, vì scope khác nhau. Soi `mock.calls` trực tiếp thường
   nhanh hơn đọc lỗi `expect(...).toHaveBeenCalledWith`.

## Thực hành 2 — chỉ chạy một test

File nhiều test mà anh chỉ quan tâm một cái: đổi tạm `it(...)` thành `it.only(...)` rồi
`F5`. Jest bỏ qua các test còn lại.

> **Nhớ bỏ `.only` trước khi commit — không có gì chặn giúp anh.** Repo này chưa cài
> `eslint-plugin-jest` nên rule `jest/no-focused-tests` không tồn tại. `.only` lọt vào CI
> thì test suite vẫn **xanh** mà chỉ chạy đúng một test — kiểu hỏng im lặng tệ nhất.

## Thực hành 3 — quy trình khi test fail

Giả lập bug: mở `session.service.ts`, đảo hai dòng đầu của `REFRESH_TTL_CONFIG_KEYS` cho
nhau, lưu file:

```ts
const REFRESH_TTL_CONFIG_KEYS: Record<SessionPersistence, string> = {
  [SessionPersistence.STANDARD]: 'session.refreshTtlRemember', // ← đảo
  [SessionPersistence.REMEMBER]: 'session.refreshTtl', // ← đảo
  [SessionPersistence.OAUTH]: 'session.refreshTtlOauth',
};
```

1. Chạy test trước đã: `pnpm nx test @org/backend --testPathPatterns=session.service.spec`.
   Đúng **2 test fail / 33 total**, và output đã nói gần hết câu chuyện:

   ```text
   ● createSession › stores the access token hashed and the refresh token whole
       Expected: ObjectContaining {"expired": 86400, "value": "refresh-jwt"}
       Received: {"expired": 5184000, …}

   ● createSession › uses the longer "remember me" lifetime when requested
       Expected: 5184000000
       Received: 86400000
   ```

   Hai con số **đổi chỗ nhau** — triệu chứng hình chữ X như vậy gần như luôn là một cặp
   mapping bị đảo, không phải lỗi tính toán.

2. Mở spec, đặt breakpoint ngay dòng `expect` đỏ → `F5` với config Jest.
3. Khi dừng, evaluate hai vế của expect trong Debug Console — thấy giá trị thật.
4. Step Into `createSession` → `resolveRefreshTtlMs`, xem `key` resolve ra chuỗi config nào.
   Đó là dòng chứa bug.
5. **Hoàn tác** (`Cmd+Z` hoặc `git checkout` file đó), chạy lại — 33 xanh.

Đây chính là loop anh sẽ dùng ở Mission 3 bài 05, và trong TDD hằng ngày: test fail →
breakpoint tại expect → truy ngược về root cause — không sửa mò.

## Ghi nhớ

- Debug test = debug backend, chỉ khác entry point. Kỹ năng cũ dùng lại 100%.
- `--runInBand` là lý do breakpoint dính; thiếu nó là "breakpoint không hoạt động".
- `it.only` + breakpoint tại dòng `expect` fail là combo vào việc nhanh nhất.
