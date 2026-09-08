const fs = require("fs");
const vm = require("vm");
const t = fs.readFileSync("js/products-data.js", "utf8");
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(t + "\n;this.__list = (typeof PRODUCTS!=='undefined'?PRODUCTS:null) || window.PRODUCTS || window.productsData || window.VUAMMO_PRODUCTS || null;", ctx);
let list = ctx.__list;
if (!list) {
  // find largest assignment
  const keys = Object.keys(ctx.window||{});
  console.log("window keys", keys);
  for (const k of keys) if (Array.isArray(ctx.window[k])) list = ctx.window[k];
}
if (!list) {
  // scan global
  for (const k of Object.keys(ctx)) if (Array.isArray(ctx[k]) && ctx[k].length > 100) { list = ctx[k]; break; }
}
const sellers = new Map();
let inStock = 0;
for (const p of list) {
  const s = String(p.seller || "").trim() || "(blank)";
  sellers.set(s, (sellers.get(s)||0)+1);
  if (p.inStock !== false) inStock++;
}
console.log(JSON.stringify({
  products: list.length,
  uniqueIds: new Set(list.map(p => String(p.id))).size,
  shops: [...sellers.keys()].filter(s => s !== "(blank)").length,
  blankSeller: sellers.get("(blank)") || 0,
  inStock,
  outOfStock: list.length - inStock,
  topShops: [...sellers.entries()].filter(([s])=>s!=="(blank)").sort((a,b)=>b[1]-a[1]).slice(0,8)
}, null, 2));
