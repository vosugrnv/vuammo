/**
 * Sync footer "Danh mục chính" with CATEGORY_TAXONOMY parents.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const OLD = `<p class="footer-heading">Danh mục chính</p>
      <a href="category.html?cat=cong-cu-ai">Công cụ AI</a>
      <a href="category.html?cat=lam-viec">Tài khoản Làm việc</a>
      <a href="category.html?cat=giai-tri">Tài khoản Giải trí</a>
      <a href="category.html?cat=hoc-tap">Tài khoản Học tập</a>
      <a href="category.html?cat=luu-tru">Tài khoản Lưu trữ</a>
      <a href="category.html?cat=vpn">Tài khoản VPN</a>
      <a href="category.html?cat=anti-virus">Anti Virus</a>
      <a href="category.html?cat=ung-dung-phan-mem-khac">Ứng dụng &amp; Phần mềm khác</a>`;

const NEW = `<p class="footer-heading">Danh mục chính</p>
      <a href="tat-ca-san-pham.html">Tất cả sản phẩm</a>
      <a href="tat-ca-san-pham.html?cat=tai-khoan-cong-cu-ai">Tài khoản &amp; Công cụ AI</a>
      <a href="tat-ca-san-pham.html?cat=game">Game</a>
      <a href="tat-ca-san-pham.html?cat=khoa-hoc">Khóa học</a>`;

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

let n = 0;
let missed = 0;
for (const file of walk(root)) {
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes('footer-heading">Danh mục chính')) continue;
  if (!html.includes(OLD)) {
    // try flexible match
    const re =
      /<p class="footer-heading">Danh mục chính<\/p>\s*(?:<a href="category\.html\?cat=[^"]+">[^<]+<\/a>\s*)+/;
    if (re.test(html)) {
      html = html.replace(re, NEW + "\n    ");
      fs.writeFileSync(file, html);
      n++;
    } else {
      missed++;
      if (missed <= 5) console.log("miss", path.relative(root, file));
    }
    continue;
  }
  fs.writeFileSync(file, html.replace(OLD, NEW));
  n++;
}
console.log("Updated", n, "files; missed patterns", missed);
