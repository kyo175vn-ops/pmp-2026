/* Đồng bộ tiến độ giữa các thiết bị qua một GitHub Gist riêng tư của người học.
   Token chỉ lưu trong trình duyệt của thiết bị đó và chỉ gửi tới api.github.com. */
(function () {
"use strict";
var API = "https://api.github.com";
var FILE = "pmp-2026-progress.json";
var DESC = "PMP 2026 - tiến độ học (đồng bộ tự động)";
var KEYS = ["qs", "weeks", "known", "hist"];
var $ = function (id) { return document.getElementById(id); };

function lsGet(k, d) { try { var v = localStorage.getItem("pmp26_" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem("pmp26_" + k, JSON.stringify(v)); } catch (e) {} }
function lsDel(k) { try { localStorage.removeItem("pmp26_" + k); } catch (e) {} }

var cfg = lsGet("sync", null); /* {token, gist, login, last} */
var timer = null, busy = false, again = false;

/* ---------- gộp dữ liệu ---------- */
function norm(x) { if (x === true || x === false) return { v: x, t: 0 }; return x || { v: false, t: 0 }; }
function mergeFlags(a, b) {
  var out = {}; [a || {}, b || {}].forEach(function (src) {
    Object.keys(src).forEach(function (k) { var v = norm(src[k]); if (!out[k] || v.t > out[k].t) out[k] = v; });
  }); return out;
}
function mergeQs(a, b) {
  var out = {}; [a || {}, b || {}].forEach(function (src) {
    Object.keys(src).forEach(function (k) {
      var v = src[k], o = out[k];
      if (!o || v.n > o.n || (v.n === o.n && (v.t || 0) > (o.t || 0))) out[k] = v;
    });
  }); return out;
}
function mergeHist(a, b) {
  var seen = {}, out = [];
  (a || []).concat(b || []).forEach(function (h) {
    var key = h.ts ? "t" + h.ts : [h.d, h.name, h.p, h.n].join("|");
    if (!seen[key]) { seen[key] = 1; out.push(h); }
  });
  out.sort(function (x, y) { return (y.ts || 0) - (x.ts || 0); });
  return out.slice(0, 50);
}
function localData() { var d = {}; KEYS.forEach(function (k) { d[k] = lsGet(k, k === "hist" ? [] : {}); }); return d; }
function merge(a, b) {
  return { qs: mergeQs(a.qs, b.qs), weeks: mergeFlags(a.weeks, b.weeks), known: mergeFlags(a.known, b.known), hist: mergeHist(a.hist, b.hist) };
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

/* ---------- gọi GitHub ---------- */
function gh(path, opt) {
  opt = opt || {};
  return fetch(API + path, {
    method: opt.method || "GET",
    headers: { "Authorization": "Bearer " + cfg.token, "Accept": "application/vnd.github+json", "Content-Type": "application/json" },
    body: opt.body ? JSON.stringify(opt.body) : undefined,
    cache: "no-store"
  }).then(function (r) {
    if (r.status === 401) throw new Error("Mã truy cập không hợp lệ hoặc đã hết hạn. Hãy tạo mã mới và kết nối lại.");
    if (r.status === 403 || r.status === 404) throw new Error("Mã truy cập chưa có quyền gist. Khi tạo mã, hãy tick ô \"gist\".");
    if (!r.ok) throw new Error("GitHub trả về lỗi " + r.status + ". Thử lại sau ít phút.");
    return r.json();
  });
}
function readRemote() {
  return gh("/gists/" + cfg.gist).then(function (g) {
    var f = g.files && g.files[FILE];
    if (!f) return {};
    if (f.truncated && f.raw_url) return fetch(f.raw_url, { cache: "no-store" }).then(function (r) { return r.json(); });
    try { return JSON.parse(f.content || "{}"); } catch (e) { return {}; }
  });
}
function writeRemote(data) {
  var files = {}; files[FILE] = { content: JSON.stringify({ v: 1, updated: new Date().toISOString(), data: data }) };
  return gh("/gists/" + cfg.gist, { method: "PATCH", body: { files: files } });
}

/* ---------- đồng bộ ---------- */
function sync() {
  if (!cfg || !cfg.gist) return Promise.resolve();
  if (busy) { again = true; return Promise.resolve(); }
  busy = true; status("Đang đồng bộ…");
  var local = localData();
  return readRemote().then(function (remote) {
    var rdata = (remote && remote.data) || {};
    var merged = merge(local, rdata);
    var changedLocal = !same(merged, local);
    if (changedLocal) { KEYS.forEach(function (k) { lsSet(k, merged[k]); }); if (window.PMP_REFRESH) window.PMP_REFRESH(); }
    return (same(merged, merge(rdata, {})) ? Promise.resolve() : writeRemote(merged));
  }).then(function () {
    cfg.last = Date.now(); lsSet("sync", cfg); status(); render();
  }).catch(function (e) {
    status(e.message, true);
  }).then(function () {
    busy = false; if (again) { again = false; sync(); }
  });
}
function schedule() { if (!cfg || !cfg.gist) return; clearTimeout(timer); status("Có thay đổi, sẽ đồng bộ…"); timer = setTimeout(sync, 2500); }
window.addEventListener("pmp-change", schedule);
document.addEventListener("visibilitychange", function () {
  if (!cfg || !cfg.gist) return;
  if (document.visibilityState === "visible") sync();
  else if (timer) { clearTimeout(timer); timer = null; sync(); }
});
window.addEventListener("online", function () { if (cfg && cfg.gist) sync(); });

function connect(token) {
  cfg = { token: token.trim() };
  status("Đang kết nối…");
  return gh("/user").then(function (u) {
    cfg.login = u.login;
    return gh("/gists?per_page=100");
  }).then(function (list) {
    var found = (list || []).filter(function (g) { return g.files && g.files[FILE]; })[0];
    if (found) { cfg.gist = found.id; return; }
    var files = {}; files[FILE] = { content: JSON.stringify({ v: 1, updated: new Date().toISOString(), data: localData() }) };
    return gh("/gists", { method: "POST", body: { description: DESC, public: false, files: files } }).then(function (g) { cfg.gist = g.id; });
  }).then(function () {
    lsSet("sync", cfg); render(); return sync();
  }).catch(function (e) {
    cfg = null; lsDel("sync"); render(); status(e.message, true);
  });
}
function disconnect() { clearTimeout(timer); cfg = null; lsDel("sync"); render(); status("Đã ngắt kết nối trên thiết bị này. Tiến độ vẫn còn trên máy và trong Gist."); }

/* ---------- giao diện ---------- */
function fmtTime(t) { if (!t) return "chưa"; var d = new Date(t); return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " " + d.toLocaleDateString("vi-VN"); }
function status(msg, err) {
  var el = $("syncStatus"), badge = $("syncBadge");
  var text = msg || (cfg && cfg.gist ? "Đã đồng bộ lúc " + fmtTime(cfg.last) : "Chưa bật đồng bộ");
  if (el) { el.textContent = text; el.className = "small " + (err ? "no" : "muted"); }
  if (badge) { badge.textContent = cfg && cfg.gist ? (err ? "Lỗi đồng bộ" : "Đã đồng bộ") : "Đồng bộ"; badge.classList.toggle("synced", !!(cfg && cfg.gist) && !err); badge.classList.toggle("sync-err", !!err); }
}
function render() {
  var box = $("syncBox"); if (!box) return;
  if (cfg && cfg.gist) {
    box.innerHTML = '<p>Đang đồng bộ với tài khoản GitHub <b>' + (cfg.login || "") + '</b>. Tiến độ tự đồng bộ sau mỗi lần bạn làm bài, và khi bạn mở lại trang.</p>' +
      '<div class="controls" style="margin-top:12px"><button class="btn primary" type="button" id="syncNow">Đồng bộ ngay</button><button class="btn" type="button" id="syncOff">Ngắt kết nối trên thiết bị này</button></div>' +
      '<p class="small muted" style="margin-top:10px">Dữ liệu nằm trong một Gist riêng tư tên "' + FILE + '" trên tài khoản của bạn: <a href="https://gist.github.com/' + cfg.gist + '" target="_blank" rel="noopener">xem Gist</a>.</p>';
    $("syncNow").onclick = sync; $("syncOff").onclick = disconnect;
  } else {
    box.innerHTML = '<ol class="clean">' +
      '<li>Mở trang <a href="https://github.com/settings/tokens/new?scopes=gist&description=PMP%202026%20sync" target="_blank" rel="noopener">tạo mã truy cập GitHub</a> (đã chọn sẵn quyền <b>gist</b>). Chọn thời hạn, ví dụ 1 năm, rồi bấm <b>Generate token</b>.</li>' +
      '<li>Sao chép mã (bắt đầu bằng <code>ghp_</code>) và dán vào ô dưới, bấm <b>Kết nối</b>.</li>' +
      '<li>Trên điện thoại, mở web này và dán <b>cùng mã đó</b>. Lưu mã vào trình quản lý mật khẩu hoặc ghi chú riêng tư để dùng lại.</li></ol>' +
      '<form id="syncForm" class="controls" style="margin-top:12px"><label for="syncToken" class="small muted">Mã truy cập</label>' +
      '<input id="syncToken" type="password" autocomplete="off" spellcheck="false" placeholder="ghp_…" style="flex:1;min-width:200px;padding:9px 10px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:inherit">' +
      '<button class="btn primary" type="submit">Kết nối</button></form>' +
      '<p class="small muted" style="margin-top:10px">Mã chỉ được lưu trong trình duyệt của thiết bị này và chỉ gửi tới GitHub. Mã chỉ có quyền gist nên không đọc hay sửa được repo của bạn. Bạn có thể thu hồi mã bất cứ lúc nào trong cài đặt GitHub.</p>';
    $("syncForm").addEventListener("submit", function (e) { e.preventDefault(); var t = $("syncToken").value; if (t.trim().length < 20) { status("Mã truy cập có vẻ chưa đúng. Hãy dán đầy đủ mã.", true); return; } connect(t); });
  }
  status();
}

render();
if (cfg && cfg.gist) sync();
window.PMP_SYNC = { merge: merge, sync: sync };
})();
