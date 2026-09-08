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
const bad = [];
for (const f of walk(".")) {
  const t = fs.readFileSync(f, "utf8");
  const m = t.match(/<nav class="nav-links">([\s\S]*?)<\/nav>/);
  if (m && (m[1].includes("footer-col") || m[1].includes("footer-heading"))) bad.push(f);
  // missing lien-he in nav but has nav-links and Chia sẻ
  if (m && m[1].includes("Chia sẻ") && !m[1].includes("lien-he.html") && !m[1].includes("Liên hệ")) bad.push(f + " missing-contact");
}
console.log("bad", bad.length);
console.log(bad.slice(0, 40).join("\n"));
// check index nav snippet
const idx = fs.readFileSync("index.html","utf8");
const nm = idx.match(/<nav class="nav-links">([\s\S]*?)<\/nav>/);
console.log("--- index nav ---");
console.log(nm[1].replace(/\s+/g," ").trim().slice(0,500));
