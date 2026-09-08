const fs = require("fs");
const t = fs.readFileSync("js/products-data.js", "utf8");
const products = Function("return " + t.match(/=\s*(\[[\s\S]*\]);?\s*$/)?.[0]?.replace(/^[^=]*=\s*/,"").replace(/;?\s*$/,"") || "null")();
// safer: reuse known parse from previous
const m = t.match(/(?:window\.\w+|const\s+\w+|var\s+\w+|let\s+\w+)\s*=\s*(\[[\s\S]*\])/);
let list;
try { list = Function("return (" + (m?m[1]:"null") + ")")(); } catch(e) {
  // try export style
  const idx = t.indexOf("[");
  const last = t.lastIndexOf("]");
  list = Function("return (" + t.slice(idx, last+1) + ")")();
}
const sellers = new Map();
let inStock = 0, out = 0;
for (const p of list) {
  const s = String(p.seller || "").trim() || "(blank)";
  sellers.set(s, (sellers.get(s)||0)+1);
  if (p.inStock === false) out++; else inStock++;
}
console.log(JSON.stringify({
  products: list.length,
  uniqueIds: new Set(list.map(p=>String(p.id))).size,
  shops: sellers.size,
  inStock,
  outOfStock: out,
  topShops: [...sellers.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10)
}, null, 2));
