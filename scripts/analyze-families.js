const fs = require("fs");
const vm = require("vm");
const t = fs.readFileSync("js/products-data.js", "utf8");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(t + "\n;this.RAW = RAW_PRODUCTS;", ctx);
const list = ctx.RAW;
function familyKey(p) {
  const cats = (p.cats || []).map(c => String(c).toLowerCase().trim()).filter(c => c && c !== "tài khoản" && c !== "san pham");
  if (cats.length) return cats[cats.length - 1]; // leaf cat
  const name = String(p.name || "").toLowerCase();
  const brands = ["capcut","chatgpt","claude","cursor","netflix","spotify","zoom","canva","midjourney","photoshop","adobe","office","windows","youtube","tiktok","instagram","facebook","grok","perplexity","tradingview","expressvpn","hma","quizlet","freepik","heygen","autodesk","iqiyi","youku","wink","xingtu","grammarly","notion","figma","discord","telegram","gmail","outlook","linkedin","shopee","lazada","kiem tien","proxy","vpn"];
  for (const b of brands) if (name.includes(b)) return b;
  return "other";
}
const fam = new Map();
for (const p of list) {
  const k = familyKey(p);
  fam.set(k, (fam.get(k)||0)+1);
}
const sorted = [...fam.entries()].sort((a,b)=>b[1]-a[1]);
console.log("families", fam.size);
console.log("top 30", sorted.slice(0,30));
console.log("families >50", sorted.filter(([,n])=>n>50).length, sorted.filter(([,n])=>n>50).slice(0,15));
const sellers = new Map();
for (const p of list) {
  const s = String(p.seller||"").trim() || "(blank)";
  sellers.set(s, (sellers.get(s)||0)+1);
}
console.log("top sellers", [...sellers.entries()].sort((a,b)=>b[1]-a[1]).slice(0,55));
