const fs = require("fs");
const path = require("path");
function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "api", "vuammo-api"].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const FOOTER_LINKS = [
  ['faqs.html', 'FAQs'],
  ['tai-lieu-api.html', 'Tài liệu API'],
  ['dmca.html', 'DMCA'],
  ['gdpr.html', 'GDPR']
];

function ensureFooterLinks(html) {
  const heading = html.indexOf('footer-heading">Giới thiệu');
  if (heading < 0) return { html, changed: false, err: "no-intro" };
  // Find the footer-col that contains this heading
  const colStart = html.lastIndexOf('<div class="footer-col">', heading);
  const colEnd = html.indexOf('</div>', html.indexOf('huong-dan-mua-hang.html', heading));
  // Better: slice from heading to next footer-col or end of row
  const nextCol = html.indexOf('<div class="footer-col">', heading + 10);
  const nextBottom = html.indexOf('footer-bottom', heading);
  let end = nextCol > 0 ? nextCol : nextBottom;
  if (end < 0) end = html.length;
  let block = html.slice(heading, end);
  let changed = false;
  for (const [href, label] of FOOTER_LINKS) {
    if (block.includes(`href="${href}"`)) continue;
    // insert before end of block - after last </a> in block
    const insert = `\n      <a href="${href}">${label}</a>`;
    const lastA = block.lastIndexOf("</a>");
    if (lastA < 0) continue;
    block = block.slice(0, lastA + 4) + insert + block.slice(lastA + 4);
    changed = true;
  }
  if (!changed) return { html, changed: false };
  return { html: html.slice(0, heading) + block + html.slice(end), changed: true };
}

function removeNavItems(html) {
  let c = html;
  c = c.replace(/\s*<a href="faqs\.html"><span class="nav-ico nav-ico--blue"[\s\S]*?<\/a>/g, "");
  // balanced dropdown remove
  function removeBalancedDiv(html, start) {
    let i = start, depth = 0;
    while (i < html.length) {
      const nextOpen = html.indexOf("<div", i);
      const nextClose = html.indexOf("</div>", i);
      if (nextClose < 0) return null;
      if (nextOpen >= 0 && nextOpen < nextClose) { depth++; i = nextOpen + 4; }
      else { depth--; i = nextClose + 6; if (depth === 0) {
        let from = start;
        while (from > 0 && /\s/.test(html[from - 1])) from--;
        return html.slice(0, from) + html.slice(i);
      }}
    }
    return null;
  }
  function removeDropdown(html, label) {
    let searchFrom = 0, guard = 0;
    while (guard++ < 10) {
      const idx = html.indexOf('class="nav-links-dropdown"', searchFrom);
      if (idx < 0) break;
      const divStart = html.lastIndexOf("<div", idx);
      const peek = html.slice(divStart, divStart + 1200);
      if (peek.includes(label) && peek.includes("nav-links-drop-btn")) {
        const next = removeBalancedDiv(html, divStart);
        if (!next) throw new Error("bal");
        return next;
      }
      searchFrom = idx + 10;
    }
    return html;
  }
  c = removeDropdown(c, "Công cụ");
  c = removeDropdown(c, "Chính sách");
  c = c.replace(/\s*<a href="faqs\.html">FAQs<\/a>/g, "");
  c = c.replace(/\s*<a href="tai-lieu-api\.html">Tài liệu API<\/a>/g, "");
  c = c.replace(/\s*<a href="dieu-khoan-dich-vu\.html">Điều khoản sử dụng<\/a>/g, "");
  c = c.replace(/\s*<a href="dmca\.html">DMCA<\/a>/g, "");
  c = c.replace(/\s*<a href="gdpr\.html">GDPR<\/a>/g, "");
  return c;
}

const targets = ["nap-tien.html", "dieu-khoan-dich-vu.html", "hinh-thuc-thanh-toan.html"];
for (const f of targets) {
  let t = fs.readFileSync(f, "utf8");
  t = removeNavItems(t);
  const r = ensureFooterLinks(t);
  t = r.html;
  const m = t.match(/<nav class="nav-links">([\s\S]*?)<\/nav>/);
  const navOk = m && /lien-he/.test(m[1]) && /nap-tien/.test(m[1]) && !/FAQs/.test(m[1]) && !/Chính sách/.test(m[1]);
  const footOk = /footer-heading">Giới thiệu[\s\S]*?faqs\.html">FAQs[\s\S]*?footer-col/.test(t) || /footer-heading">Giới thiệu[\s\S]{0,800}faqs\.html/.test(t);
  fs.writeFileSync(f, t);
  console.log(f, { navOk, footOk, footerChanged: r.changed });
}

// Audit wrong injection: FAQs link appearing in topup-guide or content before footer
let wrong = 0;
for (const f of walk(".")) {
  const t = fs.readFileSync(f, "utf8");
  const footerIdx = t.indexOf('footer-heading">Giới thiệu');
  if (footerIdx < 0) continue;
  const before = t.slice(0, footerIdx);
  if (/<a href="faqs\.html">FAQs<\/a>/.test(before) && !/<a href="faqs\.html"><span class="nav-ico/.test(before)) {
    // FAQs plain link before footer - might be wrong injection in content
    if (before.includes("topup-guide") || before.includes("Hướng dẫn mua hàng</a>\n      <a href=\"faqs.html\"")) {
      wrong++;
      if (wrong <= 5) console.log("wrong inject", f);
    }
  }
}
console.log("wrongInjectApprox", wrong);

// Final site audit
let ok = 0, bad = 0;
const bads = [];
for (const f of walk(".")) {
  const t = fs.readFileSync(f, "utf8");
  if (!t.includes('class="nav-links"')) continue;
  const m = t.match(/<nav class="nav-links">([\s\S]*?)<\/nav>/);
  if (!m) { bad++; bads.push(f+" no-nav"); continue; }
  const nav = m[1];
  if (nav.includes("hero-slider") || nav.includes("footer-col")) { bad++; bads.push(f+" corrupt"); continue; }
  if (!/lien-he\.html/.test(nav) || !/nap-tien\.html/.test(nav)) { bad++; bads.push(f+" missing-links"); continue; }
  if (/nav-ico--blue/.test(nav) || (/Công cụ/.test(nav) && /dropdown/.test(nav)) || (/Chính sách/.test(nav) && /drop-btn/.test(nav))) {
    bad++; bads.push(f+" still-menu"); continue;
  }
  const fi = t.indexOf('footer-heading">Giới thiệu');
  const block = t.slice(fi, fi + 900);
  if (!block.includes("faqs.html") || !block.includes("tai-lieu-api.html") || !block.includes("dmca.html") || !block.includes("gdpr.html")) {
    bad++; bads.push(f+" footer-incomplete"); continue;
  }
  ok++;
}
console.log({ ok, bad, bads: bads.slice(0, 20) });
