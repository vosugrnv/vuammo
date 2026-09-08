/**
 * Sync side-nav + drawer "Danh mục" with 3 parent taxonomy categories.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const NEW_SIDE = `<!-- ===== SIDE CATEGORY NAV (desktop only) ===== -->
<aside class="side-nav hide-mobile" id="sideNav">
  <button class="side-nav-toggle" id="sideNavToggle" aria-label="Tất cả danh mục">
    <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
  </button>
  <a href="tat-ca-san-pham.html" class="side-nav-item" title="Tất cả sản phẩm">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  </a>
  <a href="tat-ca-san-pham.html?cat=tai-khoan-cong-cu-ai" class="side-nav-item" title="Tài khoản & Công cụ AI">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>
  </a>
  <a href="tat-ca-san-pham.html?cat=game" class="side-nav-item" title="Game">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6.5 12h11"/><path d="M12 6.5v11"/><rect x="2" y="7" width="20" height="10" rx="4"/><circle cx="16.5" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12.5" r="1" fill="currentColor" stroke="none"/></svg>
  </a>
  <a href="tat-ca-san-pham.html?cat=khoa-hoc" class="side-nav-item" title="Khóa học">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5"/></svg>
  </a>
</aside>`;

const SIDE_RE =
  /<!-- ===== SIDE CATEGORY NAV \(desktop only\) ===== -->\s*<aside class="side-nav hide-mobile" id="sideNav">[\s\S]*?<\/aside>/;

const DRAWER_CAT_RE =
  /<div class="drawer-title">Danh mục<\/div>\s*[\s\S]*?(?=\s*<div class="drawer-title"[^>]*>Menu<\/div>)/;

const NEW_DRAWER_CAT = `<div class="drawer-title">Danh mục</div>
    <a href="tat-ca-san-pham.html">Tất cả sản phẩm</a>
    <a href="tat-ca-san-pham.html?cat=tai-khoan-cong-cu-ai">Tài khoản &amp; Công cụ AI</a>
    <a href="tat-ca-san-pham.html?cat=game">Game</a>
    <a href="tat-ca-san-pham.html?cat=khoa-hoc">Khóa học</a>
    <a href="index.html#bestseller">Bán chạy</a>
    <a href="index.html#reviews">Đánh giá</a>
      `;

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(p, files);
    } else if (name.endsWith(".html")) files.push(p);
  }
  return files;
}

let sideN = 0;
let drawerN = 0;
let linkN = 0;

for (const file of walk(root)) {
  let html = fs.readFileSync(file, "utf8");
  let changed = false;

  if (SIDE_RE.test(html)) {
    html = html.replace(SIDE_RE, NEW_SIDE);
    sideN++;
    changed = true;
  }

  if (DRAWER_CAT_RE.test(html)) {
    html = html.replace(DRAWER_CAT_RE, NEW_DRAWER_CAT);
    drawerN++;
    changed = true;
  }

  // Remap common old category deep-links to new parent listing
  const before = html;
  html = html
    .replace(/category\.html\?cat=cong-cu-ai/g, "tat-ca-san-pham.html?cat=tai-khoan-cong-cu-ai")
    .replace(/category\.html\?cat=lam-viec/g, "tat-ca-san-pham.html?cat=tai-khoan-cong-cu-ai")
    .replace(/category\.html\?cat=giai-tri/g, "tat-ca-san-pham.html?cat=tai-khoan-cong-cu-ai")
    .replace(/category\.html\?cat=hoc-tap/g, "tat-ca-san-pham.html?cat=khoa-hoc")
    .replace(/category\.html\?cat=luu-tru/g, "tat-ca-san-pham.html?cat=tai-khoan-cong-cu-ai")
    .replace(/category\.html\?cat=vpn/g, "tat-ca-san-pham.html?cat=tai-khoan-cong-cu-ai")
    .replace(/category\.html\?cat=anti-virus/g, "tat-ca-san-pham.html?cat=tai-khoan-cong-cu-ai")
    .replace(/category\.html\?cat=ung-dung-phan-mem-khac/g, "tat-ca-san-pham.html?cat=tai-khoan-cong-cu-ai");
  if (html !== before) {
    linkN++;
    changed = true;
  }

  if (changed) fs.writeFileSync(file, html);
}

console.log({ sideN, drawerN, linkN });
