# Khoá luyện thi PMP 2026

Web học và luyện thi PMP bằng tiếng Việt, bám theo đề thi mới của PMI áp dụng từ 9/7/2026 (People 33%, Process 41%, Business Environment 26%).

**Học online:** https://kyo175vn-ops.github.io/pmp-2026/

## Nội dung

- Lộ trình 8 tuần có checklist theo dõi tiến độ
- 8 module bài học theo 3 domain, 12 nguyên tắc tư duy PMI, bảng công thức
- Thẻ thuật ngữ lật
- Hơn 200 câu hỏi tình huống có giải thích: chọn một đáp án, chọn nhiều đáp án, đọc biểu đồ (burndown, burnup, CFD, control chart, S-curve EVM, Pareto, sơ đồ mạng) và case study
- Luyện tập theo domain, dạng câu, câu chưa làm, câu đã sai
- Đề thi thử: đề mini 30 câu, 3 đề cố định 60 câu, đề mô phỏng đầy đủ 185 câu / 240 phút có 2 lần nghỉ

Tiến độ và lịch sử thi được lưu trong trình duyệt (localStorage), không gửi đi đâu.

## Cấu trúc

```
index.html          trang chính
assets/style.css    giao diện
assets/app.js       logic học, luyện tập, thi thử
data/bank-*.js      ngân hàng câu hỏi theo domain và case study
data/content.js     lộ trình, bài học, tư duy, thuật ngữ
```

Thêm câu hỏi: mở file `data/bank-<domain>.js` và thêm một dòng
`q(domain, bốiCảnh, câuHỏi, [phương án], chỉSốĐápÁnĐúng, giảiThích)`.
Câu chọn nhiều đáp án dùng mảng chỉ số, ví dụ `[0,2]`.

Câu hỏi là câu luyện tập tự soạn, không phải câu hỏi đề thật. PMP và PMBOK là nhãn hiệu của Project Management Institute.
