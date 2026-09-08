const fs = require("fs");
const vm = require("vm");
const t = fs.readFileSync("js/products-data.js", "utf8");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(t + "\n;this.RAW=RAW_PRODUCTS;", ctx);
const list = ctx.RAW;

function familyKey(p) {
  const cats = (p.cats || [])
    .map((c) => String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim())
    .filter((c) => c && c !== "tai khoan" && c !== "san pham" && c !== "san pham so");
  if (cats.length) return cats[cats.length - 1];
  const name = String(p.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  const brands = ["capcut","chatgpt","claude","cursor","netflix","spotify","zoom","canva","midjourney","photoshop","adobe","office","windows","youtube","tiktok","instagram","facebook","grok","perplexity","tradingview","expressvpn","hma","quizlet","freepik","heygen","autodesk","iqiyi","youku","wink","xingtu","grammarly","notion","figma","discord","telegram","gmail","outlook","linkedin","shopee","lazada","proxy","vpn","duolingo","meitu","monica","vbee","elsa","copilot","elevenlabs","nord","runway","gamma","hailou","gemini","veo"];
  for (const b of brands) if (name.includes(b)) return b;
  return "other";
}

const fam = new Map();
for (const p of list) {
  const k = familyKey(p);
  if (!fam.has(k)) fam.set(k, []);
  fam.get(k).push(p);
}
let excess = 0;
const over = [];
for (const [k, arr] of fam) {
  if (arr.length > 50) {
    excess += arr.length - 50;
    over.push([k, arr.length, arr.length - 50]);
  }
}
over.sort((a,b)=>b[2]-a[2]);
console.log(JSON.stringify({
  products: list.length,
  families: fam.size,
  excessIfCap50: excess,
  keepIfCap50: list.length - excess,
  perShopIfKeep: ((list.length - excess) / 50).toFixed(1),
  topOver: over.slice(0, 15)
}, null, 2));
