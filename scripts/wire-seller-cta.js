const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const needle = 'href="lien-he.html" class="header-phone hide-mobile"';
const repl = 'href="dang-ky-nguoi-ban.html" class="header-phone hide-mobile"';

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === "node_modules" || f.name === ".git") continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (f.name.endsWith(".html")) out.push(p);
  }
  return out;
}

let n = 0;
for (const p of walk(root)) {
  let h = fs.readFileSync(p, "utf8");
  if (!h.includes(needle)) continue;
  fs.writeFileSync(p, h.split(needle).join(repl));
  n++;
  console.log(path.relative(root, p));
}
console.log("updated", n);
