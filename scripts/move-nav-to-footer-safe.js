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

/** Remove one balanced element starting at index (must point at '<') */
function removeBalancedDiv(html, start) {
  if (html.slice(start, start + 4) !== "<div") return null;
  let i = start;
  let depth = 0;
  while (i < html.length) {
    const nextOpen = html.indexOf("<div", i);
    const nextClose = html.indexOf("</div>", i);
    if (nextClose < 0) return null;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      i = nextClose + 6;
      if (depth === 0) {
        // also trim leading whitespace/newlines before start
        let from = start;
        while (from > 0 && (html[from - 1] === " " || html[from - 1] === "\t" || html[from - 1] === "\n" || html[from - 1] === "\r")) from--;
        return html.slice(0, from) + html.slice(i);
      }
    }
  }
  return null;
}

function removeDropdownsByLabel(html, label) {
  let guard = 0;
  while (guard++ < 20) {
    const marker = html.indexOf(`class="nav-links-dropdown"`);
    if (marker < 0) break;
    // find all dropdown starts
    let found = false;
    let searchFrom = 0;
    while (true) {
      const idx = html.indexOf(`class="nav-links-dropdown"`, searchFrom);
      if (idx < 0) break;
      const divStart = html.lastIndexOf("<div", idx);
      // peek content of this dropdown (up to 1200 chars) for label
      const peek = html.slice(divStart, divStart + 1200);
      if (peek.includes(label) && peek.includes("nav-links-drop-btn")) {
        const next = removeBalancedDiv(html, divStart);
        if (!next) throw new Error("failed balanced remove for " + label);
        html = next;
        found = true;
        break;
      }
      searchFrom = idx + 10;
    }
    if (!found) break;
  }
  return html;
}

function transform(html) {
  let c = html;

  // FAQs in desktop nav only (icon blue)
  c = c.replace(/\s*<a href="faqs\.html"><span class="nav-ico nav-ico--blue"[\s\S]*?<\/a>/g, "");

  c = removeDropdownsByLabel(c, "Công cụ");
  c = removeDropdownsByLabel(c, "Chính sách");

  // Drawer menu items (exact lines)
  c = c.replace(/\s*<a href="faqs\.html">FAQs<\/a>/g, "");
  c = c.replace(/\s*<a href="tai-lieu-api\.html">Tài liệu API<\/a>/g, "");
  c = c.replace(/\s*<a href="dieu-khoan-dich-vu\.html">Điều khoản sử dụng<\/a>/g, "");
  c = c.replace(/\s*<a href="dmca\.html">DMCA<\/a>/g, "");
  c = c.replace(/\s*<a href="gdpr\.html">GDPR<\/a>/g, "");

  // Footer extras under Giới thiệu
  const extras = [
    ["faqs.html", "FAQs"],
    ["tai-lieu-api.html", "Tài liệu API"],
    ["dmca.html", "DMCA"],
    ["gdpr.html", "GDPR"]
  ];
  if (c.includes('footer-heading">Giới thiệu') || c.includes("footer-heading\">Giới thiệu")) {
    for (const [href, label] of extras) {
      const already = new RegExp(`href="${href}"[^>]*>\\s*${label}\\s*<`);
      if (already.test(c)) continue;
      if (c.includes('huong-dan-mua-hang.html">Hướng dẫn mua hàng</a>')) {
        c = c.replace(
          'huong-dan-mua-hang.html">Hướng dẫn mua hàng</a>',
          `huong-dan-mua-hang.html">Hướng dẫn mua hàng</a>\n      <a href="${href}">${label}</a>`
        );
      }
    }
  }

  return c;
}

function validate(html, file) {
  const m = html.match(/<nav class="nav-links">([\s\S]*?)<\/nav>/);
  if (!m) return "no-nav";
  const nav = m[1];
  if (nav.includes("footer-col") || nav.includes("hero-slider")) return "nav-corrupted";
  if (!/lien-he\.html/.test(nav)) return "missing-lien-he";
  if (!/nap-tien\.html/.test(nav)) return "missing-nap-tien";
  if (/nav-ico--blue[\s\S]{0,200}FAQs/.test(nav)) return "faqs-still-in-nav";
  if (/Công cụ/.test(nav) && /nav-links-dropdown/.test(nav)) return "cong-cu-still";
  if (/Chính sách/.test(nav) && /nav-links-drop-btn/.test(nav)) return "chinh-sach-still";
  if (!/footer-heading">Giới thiệu[\s\S]*?faqs\.html">FAQs/.test(html)) return "footer-missing-faqs";
  if (!/footer-heading">Giới thiệu[\s\S]*?tai-lieu-api\.html">Tài liệu API/.test(html)) return "footer-missing-api";
  return null;
}

const files = walk(".");
let ok = 0, fail = 0;
const fails = [];
for (const f of files) {
  const raw = fs.readFileSync(f, "utf8");
  let out;
  try {
    out = transform(raw);
  } catch (e) {
    fail++;
    fails.push(f + " EX " + e.message);
    continue;
  }
  const err = validate(out, f);
  if (err) {
    fail++;
    if (fails.length < 25) fails.push(f + " " + err);
    // still write if only footer issue? No - only write if valid
    continue;
  }
  fs.writeFileSync(f, out);
  ok++;
}
console.log(JSON.stringify({ total: files.length, ok, fail, fails }, null, 2));
