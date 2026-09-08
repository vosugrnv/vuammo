const fs = require("fs");
const path = require("path");
const candidates = [
  "js/products-data.js",
  "data/products.json",
  "products.json"
];
for (const f of candidates) {
  if (!fs.existsSync(f)) { console.log("missing", f); continue; }
  const st = fs.statSync(f);
  console.log("file", f, "bytes", st.size);
}
const t = fs.readFileSync("js/products-data.js", "utf8");
// try eval-ish extract
let products = null;
try {
  const m = t.match(/window\.(PRODUCTS|productsData|VUAMMO_PRODUCTS)\s*=\s*(\[[\s\S]*\]);?\s*$/m);
  if (m) products = Function("return " + m[2])();
} catch (e) { console.log("parse window assign fail", e.message); }
if (!products) {
  try {
    const m = t.match(/(?:const|var|let)\s+\w+\s*=\s*(\[[\s\S]*\]);?\s*(?:window\.|$)/);
    if (m) products = Function("return " + m[1])();
  } catch (e) { console.log("parse const fail", e.message.slice(0,200)); }
}
if (!Array.isArray(products)) {
  // fallback counts
  const ids = [...t.matchAll(/\bid\s*:\s*["']?([^,"'\s}]+)/g)].map(x=>x[1]);
  const sellers = [...t.matchAll(/seller(?:Name|Slug|Id)?\s*:\s*["']([^"']+)/g)].map(x=>x[1]);
  console.log({ fallbackIds: new Set(ids).size, sellerMatches: sellers.length, uniqueSellers: new Set(sellers).size, sampleSellers: [...new Set(sellers)].slice(0,10) });
  console.log("head", t.slice(0,400));
} else {
  const sellers = new Set();
  for (const p of products) {
    const s = p.seller || p.sellerName || p.seller_id || p.shop || p.vendor;
    if (s) sellers.add(String(s));
  }
  console.log({ products: products.length, shops: sellers.size, sampleKeys: Object.keys(products[0]||{}), sampleSellers: [...sellers].slice(0,15) });
}
// also count product html pages
function walk(dir, out=[]) {
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    if (["node_modules",".git","api"].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p,out);
    else if (ent.name.endsWith(".html") && dir.includes("tat-ca-san-pham")) out.push(p);
  }
  return out;
}
const pages = walk("vi");
console.log({ productHtmlPages: pages.length });
