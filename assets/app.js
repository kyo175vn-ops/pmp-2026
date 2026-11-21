(function () {
"use strict";

/* ================= tiện ích ================= */
var DOM = {
  people: { name: "People", color: "var(--people)", w: 0.33 },
  process: { name: "Process", color: "var(--process)", w: 0.41 },
  biz: { name: "Business Environment", color: "var(--biz)", w: 0.26 }
};
var AP = { P: "Predictive", A: "Agile", H: "Hybrid", M: "Mọi bối cảnh" };
var L = "ABCDEFG";
var $ = function (id) { return document.getElementById(id); };
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function pill(d) { return '<span class="pill" style="--c:' + DOM[d].color + '">' + DOM[d].name + "</span>"; }
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, r) { r = r || Math.random; var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
var store = {
  get: function (k, d) { try { var v = localStorage.getItem("pmp26_" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem("pmp26_" + k, JSON.stringify(v)); } catch (e) {} },
  del: function (k) { try { localStorage.removeItem("pmp26_" + k); } catch (e) {} }
};

/* gán id ổn định cho câu hỏi */
QB.forEach(function (q) { q.id = hash(q.q); q.multi = Array.isArray(q.a); });
var BYID = {}; QB.forEach(function (q) { BYID[q.id] = q; });

/* thống kê từng câu */
function stats() { return store.get("qs", {}); }
function record(q, ok) {
  var s = stats(); var x = s[q.id] || { n: 0, c: 0, w: false };
  x.n++; if (ok) x.c++; x.w = !ok; s[q.id] = x; store.set("qs", s);
}

/* ================= theme ================= */
(function () {
  var t = store.get("theme", null);
  if (t) document.documentElement.setAttribute("data-theme", t);
  $("themeBtn").addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme");
    var dark = cur ? cur === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    var next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next); store.set("theme", next);
  });
})();

/* ================= routing ================= */
var VIEWS = ["tong-quan", "lo-trinh", "bai-hoc", "tu-duy", "cong-thuc", "the-tu", "luyen-tap", "de-thi"];
function show() {
  var h = location.hash.slice(1); var v = VIEWS.indexOf(h) >= 0 ? h : "tong-quan";
  document.querySelectorAll("section.view").forEach(function (s) { s.classList.toggle("on", s.id === "v-" + v); });
  document.querySelectorAll("nav.tabs a").forEach(function (a) { a.classList.toggle("on", a.dataset.v === v); });
  if (v === "tong-quan") renderHome();
  if (v === "de-thi" && !EX) renderExamHome();
}
window.addEventListener("hashchange", function () { show(); window.scrollTo(0, 0); });

/* ================= biểu đồ ================= */
function svgLine(pts, color, dash) {
  var d = ""; var started = false;
  pts.forEach(function (p) { if (p == null) { started = false; return; } d += (started ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1) + " "; started = true; });
  return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2.2"' + (dash ? ' stroke-dasharray="5 4"' : "") + ' stroke-linejoin="round"/>';
}
function frame(W, H, pad, ymax, ticks, labels) {
  var s = "";
  for (var i = 0; i <= ticks; i++) {
    var v = ymax * i / ticks; var y = H - pad.b - (H - pad.t - pad.b) * i / ticks;
    s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)"/>';
    s += '<text x="' + (pad.l - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + (Math.round(v * 10) / 10) + "</text>";
  }
  var n = labels.length;
  labels.forEach(function (lb, i) { var x = pad.l + (W - pad.l - pad.r) * (n === 1 ? 0.5 : i / (n - 1)); s += '<text x="' + x + '" y="' + (H - pad.b + 16) + '" text-anchor="middle">' + esc(lb) + "</text>"; });
  return s;
}
function legend(items, x, y) {
  return items.map(function (it, i) { var xx = x + i * 120; return '<rect x="' + xx + '" y="' + (y - 9) + '" width="12" height="4" rx="2" fill="' + it[1] + '"/><text x="' + (xx + 17) + '" y="' + (y - 3) + '">' + esc(it[0]) + "</text>"; }).join("");
}
function renderFig(f) {
  if (!f) return "";
  var W = 560, H = 250, pad = { l: 44, r: 14, t: 22, b: 28 };
  var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, body = "";
  function X(i, n) { return pad.l + iw * (n === 1 ? 0.5 : i / (n - 1)); }
  function Y(v, m) { return H - pad.b - ih * v / m; }
  if (f.type === "burndown") {
    var n = f.ideal.length, m = Math.max.apply(null, f.ideal);
    var lb = f.ideal.map(function (_, i) { return "N" + i; });
    body = frame(W, H, pad, m, 4, lb) + svgLine(f.ideal.map(function (v, i) { return [X(i, n), Y(v, m)]; }), "var(--muted)", true) +
      svgLine(f.actual.map(function (v, i) { return v == null ? null : [X(i, n), Y(v, m)]; }), "var(--accent)") +
      legend([["Lý tưởng", "var(--muted)"], ["Thực tế", "var(--accent)"]], pad.l + 6, 14);
  } else if (f.type === "burnup") {
    var n2 = f.labels.length, m2 = Math.max.apply(null, f.scope) * 1.05;
    body = frame(W, H, pad, Math.round(m2), 4, f.labels) + svgLine(f.scope.map(function (v, i) { return [X(i, n2), Y(v, m2)]; }), "var(--bad)", true) +
      svgLine(f.done.map(function (v, i) { return [X(i, n2), Y(v, m2)]; }), "var(--good)") +
      legend([["Tổng phạm vi", "var(--bad)"], ["Đã hoàn thành", "var(--good)"]], pad.l + 6, 14);
  } else if (f.type === "control") {
    var n3 = f.points.length, lo = f.lcl - 5, hi = f.ucl + 5, rg = hi - lo;
    var Yc = function (v) { return H - pad.b - ih * (v - lo) / rg; };
    body = [[f.ucl, "UCL " + f.ucl, "var(--bad)"], [f.mean, "TB " + f.mean, "var(--muted)"], [f.lcl, "LCL " + f.lcl, "var(--bad)"]].map(function (l) {
      return '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Yc(l[0]) + '" y2="' + Yc(l[0]) + '" stroke="' + l[2] + '" stroke-dasharray="5 4"/><text x="' + (pad.l - 6) + '" y="' + (Yc(l[0]) + 4) + '" text-anchor="end">' + l[1] + "</text>";
    }).join("") + svgLine(f.points.map(function (v, i) { return [X(i, n3), Yc(v)]; }), "var(--process)") +
      f.points.map(function (v, i) { return '<circle cx="' + X(i, n3) + '" cy="' + Yc(v) + '" r="3.5" fill="var(--process)"/>'; }).join("") +
      f.points.map(function (_, i) { return i % 2 === 0 ? '<text x="' + X(i, n3) + '" y="' + (H - pad.b + 16) + '" text-anchor="middle">' + (i + 1) + "</text>" : ""; }).join("");
  } else if (f.type === "evm") {
    var n4 = f.months.length, m4 = Math.max.apply(null, f.pv.concat(f.ac)) * 1.05;
    body = frame(W, H, pad, Math.round(m4), 4, f.months) +
      svgLine(f.pv.map(function (v, i) { return [X(i, n4), Y(v, m4)]; }), "var(--muted)", true) +
      svgLine(f.ev.map(function (v, i) { return [X(i, n4), Y(v, m4)]; }), "var(--good)") +
      svgLine(f.ac.map(function (v, i) { return [X(i, n4), Y(v, m4)]; }), "var(--bad)") +
      legend([["PV", "var(--muted)"], ["EV", "var(--good)"], ["AC", "var(--bad)"]], pad.l + 6, 14);
  } else if (f.type === "pareto") {
    var tot = f.values.reduce(function (a, b) { return a + b; }, 0), mx = Math.max.apply(null, f.values), bw = iw / f.values.length, cum = 0, pts = [];
    body = frame(W, H, pad, mx, 4, []);
    f.values.forEach(function (v, i) {
      var x = pad.l + bw * i + bw * 0.15, h = ih * v / mx; cum += v;
      body += '<rect x="' + x + '" y="' + (H - pad.b - h) + '" width="' + (bw * 0.7) + '" height="' + h + '" rx="3" fill="var(--process)" opacity=".85"/>';
      body += '<text x="' + (x + bw * 0.35) + '" y="' + (H - pad.b + 16) + '" text-anchor="middle">' + esc(f.labels[i]) + "</text>";
      pts.push([x + bw * 0.35, H - pad.b - ih * cum / tot]);
    });
    body += svgLine(pts, "var(--accent)") + pts.map(function (p, i) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="var(--accent)"/>'; }).join("") +
      '<text x="' + (W - pad.r) + '" y="' + (pad.t - 6) + '" text-anchor="end">Đường cam: % tích luỹ (đỉnh = 100%)</text>';
  } else if (f.type === "cfd") {
    var n5 = f.series[0].length, totals = [];
    for (var i = 0; i < n5; i++) totals.push(f.series.reduce(function (a, s) { return a + s[i]; }, 0));
    var m5 = Math.max.apply(null, totals) * 1.05, base = new Array(n5).fill(0), cols = ["var(--good)", "var(--bad)", "var(--process)", "var(--muted)"];
    var lbs = []; for (var k = 0; k < n5; k++) lbs.push("N" + (k + 1));
    body = frame(W, H, pad, Math.round(m5), 4, lbs);
    f.series.forEach(function (s, si) {
      var top = s.map(function (v, i) { return base[i] + v; });
      var d = "M" + top.map(function (v, i) { return X(i, n5) + " " + Y(v, m5); }).join(" L") + " L" + base.map(function (v, i) { return X(i, n5) + " " + Y(v, m5); }).reverse().join(" L") + " Z";
      body += '<path d="' + d + '" fill="' + cols[si] + '" opacity=".55"/>'; base = top;
    });
    body += legend(f.labels.map(function (l, i) { return [l, cols[i]]; }), pad.l + 6, 14);
  } else if (f.type === "network") {
    return '<div class="fig"><div class="cap">' + esc(f.title) + '</div><div class="scroll"><table><thead><tr><th>Hoạt động</th><th>Phụ thuộc (FS)</th><th>Thời lượng (ngày)</th></tr></thead><tbody>' +
      f.rows.map(function (r) { return "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + '</td><td class="mono">' + r[2] + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
  }
  return '<div class="fig"><div class="cap">' + esc(f.title) + '</div><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(f.title) + '">' + body + "</svg></div>";
}

/* ================= hiển thị một câu hỏi =================
   perm: thứ tự hiển thị các phương án (chỉ số gốc) */
function correctSet(q) { return Array.isArray(q.a) ? q.a.slice() : [q.a]; }
function isRight(q, chosen) {
  var c = correctSet(q).sort().join(","); var s = (chosen || []).slice().sort().join(","); return c === s;
}
function qHeader(q, label) {
  var h = '<div class="q-meta">' + (label ? "<span>" + label + "</span>" : "") + pill(q.d) + '<span class="tag">' + AP[q.ap] + "</span>" +
    (q.multi ? '<span class="tag">Chọn ' + q.a.length + " đáp án</span>" : "") + (q.fig ? '<span class="tag">Đọc biểu đồ</span>' : "") + (q.cs ? '<span class="tag">Case study</span>' : "") + "</div>";
  if (q.cs && CASES[q.cs]) h += '<div class="case"><b>' + esc(CASES[q.cs].title) + "</b>" + esc(CASES[q.cs].text) + "</div>";
  h += renderFig(q.fig);
  h += '<p class="q-text">' + esc(q.q.replace(/^\[Case \d\]\s*/, "")) + "</p>";
  return h;
}
function optsHtml(q, perm, chosen, reveal) {
  var cs = correctSet(q);
  return '<div class="opts">' + perm.map(function (oi, k) {
    var cls = "opt"; var sel = chosen.indexOf(oi) >= 0;
    if (reveal) { if (cs.indexOf(oi) >= 0) cls += sel ? " right" : " miss"; else if (sel) cls += " wrong"; }
    else if (sel) cls += " sel";
    return '<button type="button" class="' + cls + '" data-o="' + oi + '"' + (reveal ? " disabled" : "") + '><span class="k">' + (q.multi ? (sel ? "☑" : "☐") : L[k]) + "</span><span>" + esc(q.o[oi]) + "</span></button>";
  }).join("") + "</div>";
}
function answerLetters(q, perm) { return correctSet(q).map(function (oi) { return L[perm.indexOf(oi)]; }).sort().join(", "); }

/* ================= tổng quan ================= */
function renderHome() {
  $("bankCount").textContent = QB.length;
  var s = stats(), seen = 0, corr = 0, att = 0, wrong = 0, by = {};
  Object.keys(DOM).forEach(function (k) { by[k] = { n: 0, c: 0 }; });
  Object.keys(s).forEach(function (id) { var q = BYID[id]; if (!q) return; seen++; att += s[id].n; corr += s[id].c; if (s[id].w) wrong++; by[q.d].n += s[id].n; by[q.d].c += s[id].c; });
  var weeks = store.get("weeks", {}), wd = Object.keys(weeks).filter(function (k) { return weeks[k]; }).length, wt = WEEKS.reduce(function (a, w) { return a + w.tasks.length; }, 0);
  var hist = store.get("hist", []);
  var h = "<h3>Tiến độ của bạn</h3>";
  if (!att) {
    h += '<p class="muted" style="margin-top:8px">Bạn chưa làm câu nào. Gợi ý của coach: làm Đề mini 30 câu để biết điểm xuất phát, rồi theo lộ trình tuần 1.</p><div class="controls" style="margin-top:12px"><a class="btn primary" href="#de-thi">Làm đề chẩn đoán</a><a class="btn" href="#lo-trinh">Xem lộ trình</a></div>';
  } else {
    h += '<div class="facts" style="margin-top:12px"><div class="fact"><b>' + seen + "/" + QB.length + '</b><span>câu đã làm</span></div><div class="fact"><b>' + Math.round(corr / att * 100) + '%</b><span>tỷ lệ đúng</span></div><div class="fact"><b>' + wrong + '</b><span>câu cần ôn lại</span></div><div class="fact"><b>' + wd + "/" + wt + '</b><span>việc trong lộ trình</span></div></div>';
    h += '<div class="bars" style="margin-top:16px">' + Object.keys(by).map(function (k) { var p = by[k].n ? Math.round(by[k].c / by[k].n * 100) : 0; return '<div class="barrow"><span>' + DOM[k].name + '</span><div class="track"><div style="width:' + p + "%;background:" + DOM[k].color + '"></div></div><span class="mono">' + (by[k].n ? p + "%" : "–") + "</span></div>"; }).join("") + "</div>";
    if (hist.length) h += '<p class="small muted" style="margin-top:12px">Lần thi gần nhất: ' + esc(hist[0].name) + " · " + hist[0].p + "% · " + esc(hist[0].d) + "</p>";
    h += '<div class="controls" style="margin-top:12px">' + (wrong ? '<button class="btn primary" type="button" id="goWrong">Ôn ' + wrong + " câu đã sai</button>" : "") + '<a class="btn" href="#de-thi">Làm đề thi thử</a></div>';
  }
  $("homeStats").innerHTML = h;
  var gw = $("goWrong"); if (gw) gw.onclick = function () { $("pDomain").value = "all"; $("pType").value = "all"; $("pSet").value = "wrong"; location.hash = "luyen-tap"; startPractice(); };
}

/* ================= lộ trình ================= */
function renderWeeks() {
  var done = store.get("weeks", {}), total = 0, dn = 0;
  $("weeks").innerHTML = WEEKS.map(function (w, i) {
    return '<div class="card week"><div class="num">T' + (i + 1) + "</div><div><h3>" + esc(w.t) + '</h3><div style="margin-top:6px">' + w.tasks.map(function (t, j) {
      var id = "w" + i + "_" + j; total++; if (done[id]) dn++;
      return '<div class="task"><input type="checkbox" id="' + id + '"' + (done[id] ? " checked" : "") + '><label for="' + id + '">' + esc(t) + "</label></div>";
    }).join("") + "</div></div></div>";
  }).join("");
  $("weekProg").style.width = (dn / total * 100) + "%";
  $("weekProgText").textContent = dn + " / " + total + " việc đã xong";
}
$("weeks").addEventListener("change", function (e) {
  if (e.target.type !== "checkbox") return;
  var d = store.get("weeks", {}); d[e.target.id] = e.target.checked; store.set("weeks", d); renderWeeks();
});

/* ================= bài học, tư duy ================= */
$("lessons").innerHTML = LESSONS.map(function (l) {
  return '<div class="card stripe" style="--c:' + DOM[l.d].color + '"><div class="q-meta">' + pill(l.d) + '</div><h3 style="margin-top:8px">' + esc(l.t) + '</h3><ul class="clean">' +
    l.pts.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + '</ul><div class="controls" style="margin-top:10px"><button class="btn" type="button" data-practice="' + l.d + '">Luyện câu ' + DOM[l.d].name + "</button></div></div>";
}).join("");
$("lessons").addEventListener("click", function (e) {
  var b = e.target.closest("[data-practice]"); if (!b) return;
  $("pDomain").value = b.dataset.practice; $("pType").value = "all"; $("pSet").value = "all"; location.hash = "luyen-tap"; startPractice();
});
$("mindset").innerHTML = MINDSET.map(function (m, i) { return '<div class="card"><b>' + (i + 1) + ". " + esc(m[0]) + '</b><span class="muted small">' + esc(m[1]) + "</span></div>"; }).join("");

/* ================= thẻ thuật ngữ ================= */
var FC = { list: [], i: 0, flip: false };
function fcBuild() {
  var known = store.get("known", {}); var mode = $("fMode").value;
  FC.list = TERMS.map(function (t, i) { return i; }).filter(function (i) { return mode === "all" || !known[i]; });
  FC.i = 0; FC.flip = false; fcRender();
}
function fcRender() {
  var known = store.get("known", {}); var n = Object.keys(known).filter(function (k) { return known[k]; }).length;
  $("fStat").textContent = "Đã thuộc " + n + "/" + TERMS.length;
  if (!FC.list.length) { $("flash").innerHTML = '<div><div class="term">Bạn đã thuộc hết thẻ</div><p class="muted" style="margin-top:8px">Chọn "Tất cả thẻ" để ôn lại.</p></div>'; return; }
  var t = TERMS[FC.list[FC.i]];
  $("flash").innerHTML = FC.flip ? '<div><div class="small muted">' + esc(t[0]) + '</div><p class="def" style="margin-top:8px">' + esc(t[1]) + "</p></div>"
    : '<div><div class="term">' + esc(t[0]) + '</div><p class="small muted" style="margin-top:10px">Thẻ ' + (FC.i + 1) + "/" + FC.list.length + " · bấm để xem nghĩa</p></div>";
  $("fKnow").textContent = known[FC.list[FC.i]] ? "Bỏ đánh dấu đã thuộc" : "Đã thuộc";
}
function fcFlip() { FC.flip = !FC.flip; fcRender(); }
$("flash").addEventListener("click", fcFlip);
$("flash").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fcFlip(); } });
$("fNext").onclick = function () { if (!FC.list.length) return; FC.i = (FC.i + 1) % FC.list.length; FC.flip = false; fcRender(); };
$("fPrev").onclick = function () { if (!FC.list.length) return; FC.i = (FC.i - 1 + FC.list.length) % FC.list.length; FC.flip = false; fcRender(); };
$("fKnow").onclick = function () { if (!FC.list.length) return; var k = store.get("known", {}); var id = FC.list[FC.i]; k[id] = !k[id]; store.set("known", k); $("fNext").click(); };
$("fShuffle").onclick = function () { FC.list = shuffle(FC.list); FC.i = 0; FC.flip = false; fcRender(); };
$("fMode").onchange = fcBuild;

/* ================= luyện tập ================= */
var P = null;
function filterQs() {
  var d = $("pDomain").value, t = $("pType").value, set = $("pSet").value, s = stats();
  return QB.filter(function (q) {
    if (d !== "all" && q.d !== d) return false;
    if (t === "multi" && !q.multi) return false;
    if (t === "fig" && !q.fig) return false;
    if (t === "case" && !q.cs) return false;
    if (t === "agile" && !(q.ap === "A" || q.ap === "H")) return false;
    if (t === "pred" && q.ap !== "P") return false;
    if (set === "new" && s[q.id]) return false;
    if (set === "wrong" && !(s[q.id] && s[q.id].w)) return false;
    return true;
  });
}
function startPractice() {
  var list = filterQs();
  if ($("pType").value === "case") list.sort(function (a, b) { return a.cs < b.cs ? -1 : a.cs > b.cs ? 1 : 0; });
  else list = shuffle(list);
  P = { list: list, i: 0, correct: 0, done: false, chosen: [], perm: [] };
  renderPractice();
}
function renderPractice() {
  var box = $("practice");
  if (!P.list.length) { $("pStat").textContent = ""; box.innerHTML = '<div class="card"><p>Không có câu nào khớp bộ lọc. ' + ($("pSet").value === "wrong" ? "Bạn chưa có câu sai nào, tốt lắm." : "Hãy đổi bộ lọc.") + "</p></div>"; return; }
  if (P.i >= P.list.length) {
    var pct = Math.round(P.correct / P.list.length * 100);
    $("pStat").textContent = "";
    box.innerHTML = '<div class="card"><h3>Hoàn thành lượt luyện</h3><p class="score" style="margin-top:8px">' + P.correct + "/" + P.list.length + "</p><p>" + verdict(pct) + '</p><p class="muted" style="margin-top:8px">Coach khuyên: chọn Nguồn "Câu đã sai" để ôn lại đến khi không còn câu sai.</p><div class="controls" style="margin-top:12px"><button class="btn primary" type="button" id="pAgain">Lượt mới</button></div></div>';
    $("pAgain").onclick = startPractice; renderHome(); return;
  }
  var q = P.list[P.i];
  if (!P.perm.length) P.perm = shuffle(q.o.map(function (_, i) { return i; }));
  $("pStat").textContent = "Câu " + (P.i + 1) + "/" + P.list.length + " · Đúng " + P.correct;
  var h = '<div class="card stripe" style="--c:' + DOM[q.d].color + '">' + qHeader(q, "Câu " + (P.i + 1)) + optsHtml(q, P.perm, P.chosen, P.done);
  if (q.multi && !P.done) h += '<div class="controls" style="margin-top:12px"><button class="btn" type="button" id="pCheck"' + (P.chosen.length !== q.a.length ? " disabled" : "") + ">Kiểm tra</button><span class=\"small muted\">Đã chọn " + P.chosen.length + "/" + q.a.length + "</span></div>";
  if (P.done) {
    var ok = isRight(q, P.chosen);
    h += '<div class="explain"><b class="' + (ok ? "ok" : "no") + '">' + (ok ? "Chính xác." : "Chưa đúng. Đáp án: " + answerLetters(q, P.perm) + ".") + "</b> " + esc(q.e) + "</div>";
    h += '<div class="controls" style="margin-top:14px"><button class="btn primary" type="button" id="pNext">Câu tiếp theo</button></div>';
  }
  box.innerHTML = h + "</div>";
  box.querySelectorAll(".opt").forEach(function (b) {
    b.addEventListener("click", function () {
      if (P.done) return; var o = +b.dataset.o;
      if (q.multi) { var ix = P.chosen.indexOf(o); if (ix >= 0) P.chosen.splice(ix, 1); else if (P.chosen.length < q.a.length) P.chosen.push(o); renderPractice(); }
      else { P.chosen = [o]; finishPracticeQ(q); }
    });
  });
  if ($("pCheck")) $("pCheck").onclick = function () { finishPracticeQ(q); };
  if ($("pNext")) { $("pNext").onclick = function () { P.i++; P.done = false; P.chosen = []; P.perm = []; renderPractice(); window.scrollTo(0, $("practice").offsetTop - 60); }; $("pNext").focus({ preventScroll: true }); }
}
function finishPracticeQ(q) { P.done = true; var ok = isRight(q, P.chosen); if (ok) P.correct++; record(q, ok); renderPractice(); }
$("pStart").onclick = startPractice;
function verdict(p) {
  if (p >= 75) return '<span class="verdict v-good">' + p + "% · Above Target</span>";
  if (p >= 65) return '<span class="verdict v-mid">' + p + "% · Target</span>";
  if (p >= 50) return '<span class="verdict v-bad">' + p + "% · Below Target</span>";
  return '<span class="verdict v-bad">' + p + "% · Needs Improvement</span>";
}

/* ================= đề thi ================= */
var EXAMS = [
  { id: "mini", name: "Đề mini chẩn đoán", n: 30, seed: 0, cases: 0, desc: "30 câu, khoảng 39 phút. Câu hỏi khác nhau mỗi lần." },
  { id: "d1", name: "Đề số 1", n: 60, seed: 1101, cases: 1, desc: "60 câu cố định, 78 phút, có 1 case study." },
  { id: "d2", name: "Đề số 2", n: 60, seed: 2202, cases: 1, desc: "60 câu cố định, 78 phút, có 1 case study." },
  { id: "d3", name: "Đề số 3", n: 60, seed: 3303, cases: 1, desc: "60 câu cố định, 78 phút, có 1 case study." },
  { id: "full", name: "Đề mô phỏng đầy đủ", n: 185, seed: 0, cases: 3, desc: "185 câu, 240 phút, 2 lần nghỉ 10 phút như đề thật." }
];
var EX = null, TICK = null;
function buildExam(def) {
  var r = def.seed ? rng(def.seed) : Math.random;
  var caseIds = shuffle(Object.keys(CASES), r).slice(0, def.cases);
  var groups = caseIds.map(function (c) { return QB.filter(function (q) { return q.cs === c; }); });
  var used = []; groups.forEach(function (g) { used = used.concat(g); });
  var left = def.n - used.length, keys = Object.keys(DOM);
  var have = {}; keys.forEach(function (k) { have[k] = used.filter(function (q) { return q.d === k; }).length; });
  var need = {}; var sum = 0;
  keys.forEach(function (k) { need[k] = Math.max(0, Math.round(def.n * DOM[k].w) - have[k]); sum += need[k]; });
  need.process += left - sum;
  var singles = [];
  keys.forEach(function (k) {
    var pool = shuffle(QB.filter(function (q) { return q.d === k && !q.cs; }), r);
    singles = singles.concat(pool.slice(0, need[k]));
    if (pool.length < need[k]) need.process += need[k] - pool.length;
  });
  if (singles.length < left) {
    var rest = shuffle(QB.filter(function (q) { return !q.cs && singles.indexOf(q) < 0; }), r);
    singles = singles.concat(rest.slice(0, left - singles.length));
  }
  singles = shuffle(singles, r).slice(0, left);
  var order = singles.map(function (q) { return [q]; });
  groups.forEach(function (g) { var pos = Math.floor(r() * (order.length + 1)); order.splice(pos, 0, g); });
  var list = []; order.forEach(function (g) { list = list.concat(g); });
  return list.map(function (q) { return { id: q.id, perm: shuffle(q.o.map(function (_, i) { return i; }), r) }; });
}
function startExam(def) {
  var items = buildExam(def);
  EX = { def: def.id, name: def.name, items: items, ans: items.map(function () { return []; }), flag: items.map(function () { return false; }), i: 0,
    secs: Math.round(items.length * 240 * 60 / 185), breaks: def.id === "full" ? [60, 120] : [], onBreak: 0, brk: 0, done: false };
  saveEx(); runExam();
}
function saveEx() { if (EX && !EX.done) store.set("cur", EX); }
function runExam() {
  $("examHome").style.display = "none";
  clearInterval(TICK);
  TICK = setInterval(function () {
    if (!EX || EX.done) return;
    if (EX.onBreak) { EX.brk--; var b = $("brkT"); if (b) b.textContent = fmt(EX.brk); if (EX.brk <= 0) endBreak(); }
    else { EX.secs--; var t = $("mTimer"); if (t) { t.textContent = fmt(EX.secs); t.classList.toggle("low", EX.secs < 300); } if (EX.secs <= 0) finishExam(); }
    if (EX && EX.secs % 15 === 0) saveEx();
  }, 1000);
  renderExam();
}
function fmt(s) { s = Math.max(0, s); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); }
function endBreak() { EX.onBreak = 0; saveEx(); renderExam(); }
function renderExam() {
  if (EX.onBreak) {
    $("examRun").innerHTML = '<div class="card break"><h2>Giờ nghỉ</h2><p class="muted">Bạn đã xong phần ' + EX.onBreak + ". Đồng hồ làm bài đang dừng. Thời gian nghỉ còn lại:</p><p class=\"timer\" id=\"brkT\" style=\"font-size:2rem\">" + fmt(EX.brk) + '</p><p class="small muted">Sau giờ nghỉ, bạn không quay lại được các câu của phần trước, giống đề thật.</p><button class="btn primary" type="button" id="brkEnd">Tiếp tục làm bài</button></div>';
    $("brkEnd").onclick = endBreak; return;
  }
  var it = EX.items[EX.i], q = BYID[it.id], answered = EX.ans.filter(function (a) { return a.length; }).length;
  var lockFrom = 0; EX.breaks.forEach(function (b) { if (EX.passed && EX.passed.indexOf(b) >= 0) lockFrom = b; });
  var secEnd = EX.items.length; EX.breaks.forEach(function (b) { if (b > lockFrom && b < secEnd) secEnd = Math.min(secEnd, b); });
  if (EX.breaks.length) secEnd = EX.breaks.filter(function (b) { return b > lockFrom; }).concat([EX.items.length])[0];
  var nums = ""; for (var k = 0; k < EX.items.length; k++) {
    var locked = k < lockFrom || k >= secEnd;
    if (locked) continue;
    nums += '<button type="button" data-go="' + k + '" class="' + (EX.ans[k].length ? "done " : "") + (k === EX.i ? "cur " : "") + (EX.flag[k] ? "flag" : "") + '" aria-label="Câu ' + (k + 1) + '">' + (k + 1) + "</button>";
  }
  var isLastInSec = EX.i === secEnd - 1, hasBreakAfter = secEnd < EX.items.length;
  var h = '<div class="card"><div class="controls" style="justify-content:space-between"><b>' + esc(EX.name) + '</b><span class="timer" id="mTimer">' + fmt(EX.secs) + '</span></div>' +
    '<p class="small muted" style="margin-top:4px">Đã trả lời ' + answered + "/" + EX.items.length + (EX.breaks.length ? " · Phần " + (EX.breaks.filter(function (b) { return b <= lockFrom; }).length + 1) + "/3 (câu " + (lockFrom + 1) + "–" + secEnd + ")" : "") + "</p>" +
    '<div class="progressline" style="margin-top:8px"><div style="width:' + (answered / EX.items.length * 100) + '%"></div></div><div class="grid-nums" style="margin-top:12px">' + nums + "</div></div>";
  h += '<div class="card stripe" style="--c:var(--line)">' + qHeader(q, "Câu " + (EX.i + 1)).replace(/<span class="pill"[^>]*>[^<]*<\/span>/, "") + optsHtml(q, it.perm, EX.ans[EX.i], false);
  h += '<div class="controls" style="margin-top:14px"><button class="btn" type="button" id="mPrev"' + (EX.i <= lockFrom ? " disabled" : "") + '>Câu trước</button><button class="btn" type="button" id="mFlag">' + (EX.flag[EX.i] ? "Bỏ đánh dấu" : "Đánh dấu xem lại") + "</button>" +
    (isLastInSec && hasBreakAfter ? '<button class="btn primary" type="button" id="mSec">Kết thúc phần này và nghỉ</button>' : '<button class="btn" type="button" id="mNext"' + (isLastInSec ? " disabled" : "") + ">Câu sau</button>") +
    '<button class="btn" type="button" id="mSubmit">Nộp bài</button></div><div id="mConfirm"></div></div>';
  $("examRun").innerHTML = h;
  $("examRun").querySelectorAll(".opt").forEach(function (b) {
    b.addEventListener("click", function () {
      var o = +b.dataset.o, a = EX.ans[EX.i];
      if (q.multi) { var ix = a.indexOf(o); if (ix >= 0) a.splice(ix, 1); else { if (a.length >= q.a.length) a.shift(); a.push(o); } }
      else { EX.ans[EX.i] = [o]; if (EX.i < secEnd - 1) EX.i++; }
      saveEx(); renderExam();
    });
  });
  $("examRun").querySelectorAll("[data-go]").forEach(function (b) { b.addEventListener("click", function () { EX.i = +b.dataset.go; renderExam(); }); });
  $("mPrev").onclick = function () { EX.i--; renderExam(); };
  if ($("mNext")) $("mNext").onclick = function () { EX.i++; renderExam(); };
  $("mFlag").onclick = function () { EX.flag[EX.i] = !EX.flag[EX.i]; saveEx(); renderExam(); };
  if ($("mSec")) $("mSec").onclick = function () {
    var miss = 0; for (var k = lockFrom; k < secEnd; k++) if (!EX.ans[k].length) miss++;
    confirmBox((miss ? "Phần này còn " + miss + " câu chưa trả lời. " : "") + "Kết thúc phần và vào giờ nghỉ? Bạn sẽ không quay lại phần này được.", "Kết thúc phần", function () {
      EX.passed = (EX.passed || []).concat([secEnd]); EX.onBreak = EX.passed.length; EX.brk = 600; EX.i = secEnd; saveEx(); renderExam();
    });
  };
  $("mSubmit").onclick = function () {
    var left = EX.ans.filter(function (a) { return !a.length; }).length;
    confirmBox((left ? "Còn " + left + " câu chưa trả lời. " : "") + "Nộp bài và xem kết quả?", "Nộp bài", finishExam);
  };
}
function confirmBox(msg, label, fn) {
  $("mConfirm").innerHTML = '<div class="explain">' + esc(msg) + '<div class="controls" style="margin-top:8px"><button class="btn primary" type="button" id="cYes">' + esc(label) + '</button><button class="btn" type="button" id="cNo">Làm tiếp</button></div></div>';
  $("cYes").onclick = fn; $("cNo").onclick = function () { $("mConfirm").innerHTML = ""; };
}
function finishExam() {
  if (!EX || EX.done) return; EX.done = true; clearInterval(TICK); store.del("cur");
  var by = {}; Object.keys(DOM).forEach(function (k) { by[k] = { c: 0, t: 0 }; });
  var c = 0;
  EX.items.forEach(function (it, k) { var q = BYID[it.id]; var ok = isRight(q, EX.ans[k]); by[q.d].t++; if (ok) { c++; by[q.d].c++; } if (EX.ans[k].length) record(q, ok); });
  var pct = Math.round(c / EX.items.length * 100);
  var hist = store.get("hist", []); hist.unshift({ id: EX.def, name: EX.name, d: new Date().toLocaleDateString("vi-VN"), n: EX.items.length, p: pct }); store.set("hist", hist.slice(0, 30));
  var ks = Object.keys(by).filter(function (k) { return by[k].t; });
  var weakest = ks.sort(function (a, b) { return by[a].c / by[a].t - by[b].c / by[b].t; })[0];
  var h = '<div class="card"><h2>Kết quả: ' + esc(EX.name) + '</h2><p class="score" style="margin-top:8px">' + c + "/" + EX.items.length + "</p><p>" + verdict(pct) + '</p><div class="bars" style="margin-top:16px">' +
    Object.keys(DOM).filter(function (k) { return by[k].t; }).map(function (k) { var p = Math.round(by[k].c / by[k].t * 100); return '<div class="barrow"><span>' + DOM[k].name + '</span><div class="track"><div style="width:' + p + "%;background:" + DOM[k].color + '"></div></div><span class="mono">' + p + "%</span></div>"; }).join("") +
    '</div><p class="muted" style="margin-top:14px">Coach nhận xét: domain cần ưu tiên là <b>' + DOM[weakest].name + "</b>. " + (pct >= 75 ? "Bạn đang ở vùng an toàn; hãy duy trì bằng các đề đầy đủ." : "Đọc lại module tương ứng, rồi luyện các câu đã sai trong domain này.") +
    '</p><div class="controls" style="margin-top:14px"><button class="btn primary" type="button" id="rWrong">Ôn câu sai</button><button class="btn" type="button" id="rBack">Về danh sách đề</button></div></div>';
  h += '<div class="card"><h3>Xem lại đáp án</h3>' + EX.items.map(function (it, k) {
    var q = BYID[it.id], ok = isRight(q, EX.ans[k]);
    return '<details><summary><span class="' + (ok ? "ok" : "no") + '">' + (ok ? "✓" : "✗") + "</span> Câu " + (k + 1) + ": " + esc(q.q.slice(0, 90)) + (q.q.length > 90 ? "…" : "") + '</summary><div style="margin-top:10px">' + qHeader(q, "") + optsHtml(q, it.perm, EX.ans[k], true) +
      '<div class="explain"><b>Đáp án: ' + answerLetters(q, it.perm) + ".</b> " + esc(q.e) + "</div></div></details>";
  }).join("") + "</div>";
  $("examRun").innerHTML = h; window.scrollTo(0, 0);
  $("rBack").onclick = function () { EX = null; $("examRun").innerHTML = ""; renderExamHome(); };
  $("rWrong").onclick = function () { EX = null; $("examRun").innerHTML = ""; $("pDomain").value = "all"; $("pType").value = "all"; $("pSet").value = "wrong"; location.hash = "luyen-tap"; startPractice(); };
}
function renderExamHome() {
  $("examHome").style.display = "";
  var hist = store.get("hist", []);
  $("examList").innerHTML = EXAMS.map(function (d) {
    var mine = hist.filter(function (h) { return h.id === d.id; }), best = mine.length ? Math.max.apply(null, mine.map(function (h) { return h.p; })) : null;
    return '<div class="exam-card"><h3>' + esc(d.name) + '</h3><p class="small muted">' + esc(d.desc) + '</p><p class="best">' + (best == null ? "Chưa làm" : "Điểm cao nhất: " + best + "% · " + mine.length + " lần") + '</p><button class="btn primary" type="button" data-ex="' + d.id + '">Bắt đầu</button></div>';
  }).join("");
  $("examList").querySelectorAll("[data-ex]").forEach(function (b) { b.onclick = function () { var d = EXAMS.filter(function (x) { return x.id === b.dataset.ex; })[0]; store.del("cur"); startExam(d); }; });
  var cur = store.get("cur", null);
  $("resume").innerHTML = cur && cur.items ? '<div class="card stripe"><h3>Bài đang làm dở: ' + esc(cur.name) + '</h3><p class="small muted" style="margin-top:4px">Đã trả lời ' + cur.ans.filter(function (a) { return a.length; }).length + "/" + cur.items.length + " · còn " + fmt(cur.secs) + '</p><div class="controls" style="margin-top:10px"><button class="btn primary" type="button" id="resY">Làm tiếp</button><button class="btn" type="button" id="resN">Huỷ bài này</button></div></div>' : "";
  if ($("resY")) { $("resY").onclick = function () { EX = cur; runExam(); }; $("resN").onclick = function () { store.del("cur"); renderExamHome(); }; }
  $("examHist").innerHTML = hist.length ? '<h3>Lịch sử thi</h3><div class="scroll"><table style="margin-top:8px"><thead><tr><th>Ngày</th><th>Đề</th><th>Số câu</th><th>Điểm</th></tr></thead><tbody>' + hist.slice(0, 15).map(function (x) { return "<tr><td>" + esc(x.d) + "</td><td>" + esc(x.name) + '</td><td class="mono">' + x.n + '</td><td class="mono">' + x.p + "%</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="muted">Chưa có lần thi nào. Coach gợi ý bắt đầu bằng Đề mini chẩn đoán.</p>';
}

/* ================= khởi tạo ================= */
renderWeeks(); fcBuild(); startPractice(); show();
})();
