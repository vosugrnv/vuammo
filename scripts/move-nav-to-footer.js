const fs = require("fs");
const path = require("path");

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "api" || ent.name === "vuammo-api") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const FOOTER_EXTRA = [
  ['faqs.html', 'FAQs'],
  ['tai-lieu-api.html', 'Tài liệu API'],
  ['dmca.html', 'DMCA'],
  ['gdpr.html', 'GDPR']
];

function transform(html) {
  let c = html;
  const before = c;

  // Remove FAQs from desktop nav
  c = c.replace(/\s*<a href="faqs\.html"><span class="nav-ico nav-ico--blue"[\s\S]*?<\/a>/g, "");

  // Remove Công cụ dropdown (API docs only)
  c = c.replace(/\s*<div class="nav-links-dropdown">\s*<button type="button" class="nav-links-drop-btn"[\s\S]*?Công cụ[\s\S]*?<\/div>\s*<\/div>/g, "");

  // Remove Chính sách dropdown
  c = c.replace(/\s*<div class="nav-links-dropdown">\s*<button type="button" class="nav-links-drop-btn"[\s\S]*?Chính sách[\s\S]*?<\/div>\s*<\/div>/g, "");

  // Remove from mobile drawer
  c = c.replace(/\s*<a href="faqs\.html">FAQs<\/a>/g, "");
  c = c.replace(/\s*<a href="tai-lieu-api\.html">Tài liệu API<\/a>/g, "");
  c = c.replace(/\s*<a href="dieu-khoan-dich-vu\.html">Điều khoản sử dụng<\/a>/g, "");
  c = c.replace(/\s*<a href="dmca\.html">DMCA<\/a>/g, "");
  c = c.replace(/\s*<a href="gdpr\.html">GDPR<\/a>/g, "");

  // Ensure footer Giới thiệu has the moved links
  if (c.includes('footer-heading">Giới thiệu') || c.includes("footer-heading\">Giới thiệu")) {
    for (const [href, label] of FOOTER_EXTRA) {
      const re = new RegExp(`href="${href}"[^>]*>\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*<`);
      if (!re.test(c)) {
        // Insert before closing of intro column: after Hướng dẫn mua hàng if present
        if (c.includes('huong-dan-mua-hang.html">Hướng dẫn mua hàng</a>')) {
          c = c.replace(
            'huong-dan-mua-hang.html">Hướng dẫn mua hàng</a>',
            `huong-dan-mua-hang.html">Hướng dẫn mua hàng</a>\n      <a href="${href}">${label}</a>`
          );
        } else if (c.includes("huong-dan-mua-hang.html\">Hướng dẫn mua hàng</a>")) {
          c = c.replace(
            "huong-dan-mua-hang.html\">Hướng dẫn mua hàng</a>",
            `huong-dan-mua-hang.html">Hướng dẫn mua hàng</a>\n      <a href="${href}">${label}</a>`
          );
        }
      }
    }
  }

  return { changed: c !== before, html: c };
}

const root = process.cwd();
const files = walk(root);
let changed = 0;
let failed = 0;
const samples = [];

for (const f of files) {
  const raw = fs.readFileSync(f, "utf8");
  const { changed: ch, html } = transform(raw);
  if (!ch) continue;
  // sanity: if still has Chính sách dropdown button in nav-links
  const stillPolicy = /nav-links-drop-btn[\s\S]{0,400}Chính sách/.test(html);
  const stillFaqsNav = /nav-links[\s\S]{0,2000}<a href="faqs\.html"/.test(html);
  if (stillPolicy || stillFaqsNav) {
    failed++;
    if (samples.length < 5) samples.push("FAIL " + path.relative(root, f));
  }
  fs.writeFileSync(f, html);
  changed++;
}

console.log(JSON.stringify({ total: files.length, changed, failed, samples }, null, 2));

// spot check index
const idx = fs.readFileSync(path.join(root, "index.html"), "utf8");
console.log("index has FAQs nav:", /nav-ico--blue[\s\S]*?FAQs/.test(idx));
console.log("index has Công cụ:", /Công cụ/.test(idx) && /nav-links-dropdown[\s\S]*?Công cụ/.test(idx));
console.log("index has Chính sách dropdown:", /nav-links-drop-btn[\s\S]{0,300}Chính sách/.test(idx));
console.log("index footer FAQs:", /footer-col[\s\S]*?faqs\.html">FAQs/.test(idx));
console.log("index footer API:", /footer-col[\s\S]*?tai-lieu-api\.html">Tài liệu API/.test(idx));
console.log("index footer DMCA:", /footer-col[\s\S]*?dmca\.html">DMCA/.test(idx));
console.log("index footer GDPR:", /footer-col[\s\S]*?gdpr\.html">GDPR/.test(idx));
