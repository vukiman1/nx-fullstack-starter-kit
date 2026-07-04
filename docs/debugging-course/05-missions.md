# Bài 05 — Missions: săn bug thật 🎯

Ba bug đã được cài sẵn vào branch **`learn/debugging-missions`**. Nhiệm vụ: dùng kỹ năng
bài 01–04 truy ra root cause của từng bug. Đây là bài kiểm tra thật — không có hướng dẫn
từng bước nữa.

## Setup

```bash
git checkout learn/debugging-missions
```

Chạy lại backend + frontend serve trên branch này. Học xong quay về: `git checkout dev`
(branch missions không bao giờ được merge — xóa lúc nào cũng được).

## Luật chơi

1. **Cấm đọc diff.** `git diff dev` hay `git log -p` là spoiler toàn bộ — mission trở nên
   vô nghĩa. Danh dự tự giác 🙂.
2. Làm theo trình tự: tái hiện triệu chứng → đặt giả thuyết → dùng debugger kiểm chứng →
   chỉ ra đúng file/dòng/lý do. Tìm ra rồi mới đối chiếu solution.
3. Bí thì mở hints — gợi ý mở dần từng nấc, nằm trong `docs/debugging-course/missions/`
   **trên branch missions**.

## Mission 1 — "Remember me lừa dối" (backend, VSCode)

**Triệu chứng:** Người dùng login **có tick** "Remember me for 60 days" nhưng session hết
hạn rất nhanh. Ngược lại login **không tick** thì session lại sống tận 60 ngày.

**Cách tái hiện:** Login 2 lần (có/không tick) và so `Max-Age` của cookie session trong
Network panel (bài 03 §3), hoặc attach debugger vào flow login (bài 01).

**Kỹ năng chính:** attach + breakpoint + Watch dọc flow login, conditional breakpoint.

**Nộp bài:** file, dòng, và giải thích vì sao TTL bị đảo.

## Mission 2 — "Redirect về nhầm nhà" (frontend, Chrome DevTools)

**Triệu chứng:** Đang logout, mở thẳng một trang cần đăng nhập (ví dụ `/settings`) → bị đưa
về `/login?redirect=...` — đúng. Nhưng login xong lại bị thả về **trang chủ**, không quay
lại trang ban đầu.

**Cách tái hiện:** như trên, để ý URL có query `redirect` khi ở trang login.

**Kỹ năng chính:** Sources breakpoint trong `.tsx` gốc, Scope/Watch, step qua onSubmit.

**Nộp bài:** file, dòng, và giá trị thật của biến điều hướng tại thời điểm navigate.

## Mission 3 — "Test đỏ không nói dối" (Jest, VSCode)

**Triệu chứng:** `pnpm nx test @org/backend` fail một số test trong khu session/user-session.
Code chạy sai thật chứ không phải test sai.

**Kỹ năng chính:** đọc output jest, breakpoint tại `expect` fail, Step Into truy ngược
(bài 04 §Thực hành 3).

**Nộp bài:** root cause trong code (không phải trong spec), và test nào bắt được nó.

## Sau khi xong

Ba mission phủ đúng ba tình huống debug đời thực: _API trả sai_ (truy backend runtime),
_UI hành xử sai_ (truy frontend trong browser), _test fail_ (truy qua debugger test).
Gặp bug thật, câu hỏi đầu tiên luôn là: **nó thuộc loại nào, và điểm đặt breakpoint đầu
tiên ở đâu?**
