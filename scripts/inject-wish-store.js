const fs = require("fs");
const path = require("path");
function walk(d, o = []) {
  for (const n of fs.readdirSync(d)) {
    if (n === "node_modules" || n === "api" || n === ".git") continue;
    const p = path.join(d, n);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p, o);
    else if (n.endsWith(".html")) o.push(p);
  }
  return o;
}
let c = 0;
const needle = '<script src="js/cart-store.js"></script>';
const insert =
  '<script src="js/cart-store.js"></script>\n<script src="js/wish-store.js"></script>';
for (const f of walk(path.join(__dirname, ".."))) {
  let h = fs.readFileSync(f, "utf8");
  if (!h.includes(needle) || h.includes("js/wish-store.js")) continue;
  fs.writeFileSync(f, h.replace(needle, insert));
  c++;
}
console.log("patched", c);
