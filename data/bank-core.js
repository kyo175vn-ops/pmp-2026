/* Ngân hàng câu hỏi PMP 2026 - lõi dữ liệu
   d: people | process | biz
   ap: P = Predictive, A = Agile, H = Hybrid, M = Mọi bối cảnh
   a: chỉ số đáp án đúng (số) hoặc mảng chỉ số (câu chọn nhiều)
   x: thuộc tính thêm: fig (biểu đồ), cs (mã case study) */
window.QB = [];
window.CASES = {};
function q(d, ap, text, opts, a, e, x) {
  window.QB.push(Object.assign({ d: d, ap: ap, q: text, o: opts, a: a, e: e }, x || {}));
}
