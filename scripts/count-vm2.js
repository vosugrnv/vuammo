const fs = require("fs");
const vm = require("vm");
const t = fs.readFileSync("js/products-data.js", "utf8");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(t + "\n;this.RAW = RAW_PRODUCTS;", ctx);
const list = ctx.RAW;
const sellers = new Map();
let inStock = 0;
for (const p of list) {
  const s = String(p.seller || "").trim() || "(blank)";
  sellers.set(s, (sellers.get(s)||0)+1);
  if (p.inStock !== false) inStock++;
}
const shopNames = [...sellers.keys()].filter(s => s !== "(blank)");
console.log(JSON.stringify({
  products: list.length,
  uniqueIds: new Set(list.map(p => String(p.id))).size,
  shops: shopNames.length,
  blankSeller: sellers.get("(blank)") || 0,
  inStock,
  outOfStock: list.length - inStock
}, null, 2));
