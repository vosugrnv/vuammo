const fs = require("fs");
const crypto = require("crypto");
const vm = require("vm");

const CITIES = [
  { city: "Hà Nội", district: "Cầu Giấy" },
  { city: "Hà Nội", district: "Đống Đa" },
  { city: "Hà Nội", district: "Thanh Xuân" },
  { city: "TP. Hồ Chí Minh", district: "Quận 1" },
  { city: "TP. Hồ Chí Minh", district: "Bình Thạnh" },
  { city: "TP. Hồ Chí Minh", district: "Tân Bình" },
  { city: "Đà Nẵng", district: "Hải Châu" },
  { city: "Hải Phòng", district: "Lê Chân" },
  { city: "Cần Thơ", district: "Ninh Kiều" },
  { city: "Huế", district: "TP. Huế" }
];

const BRANDS = [
  ["chatgpt", "chatgpt"], ["chat gpt", "chatgpt"], ["gpt-4", "chatgpt"], ["gpt4", "chatgpt"],
  ["capcut", "capcut"], ["elsa speak", "elsa"], ["elsa", "elsa"],
  ["claude", "claude"], ["cursor", "cursor"], ["netflix", "netflix"], ["spotify", "spotify"],
  ["zoom", "zoom"], ["canva", "canva"], ["midjourney", "midjourney"], ["photoshop", "photoshop"],
  ["adobe", "adobe"], ["office 365", "office"], ["microsoft office", "office"], ["windows", "windows"],
  ["youtube", "youtube"], ["tiktok", "tiktok"], ["instagram", "instagram"], ["facebook", "facebook"],
  ["grok", "grok"], ["perplexity", "perplexity"], ["tradingview", "tradingview"],
  ["expressvpn", "expressvpn"], ["nord vpn", "nordvpn"], ["nordvpn", "nordvpn"], ["hma", "hma"],
  ["quizlet", "quizlet"], ["freepik", "freepik"], ["heygen", "heygen"], ["autodesk", "autodesk"],
  ["iqiyi", "iqiyi"], ["youku", "youku"], ["wink", "wink"], ["xingtu", "xingtu"],
  ["grammarly", "grammarly"], ["notion", "notion"], ["figma", "figma"], ["discord", "discord"],
  ["telegram", "telegram"], ["gmail", "gmail"], ["outlook", "outlook"], ["linkedin", "linkedin"],
  ["shopee", "shopee"], ["lazada", "lazada"], ["proxy", "proxy"], ["duolingo", "duolingo"],
  ["meitu", "meitu"], ["monica", "monica"], ["vbee", "vbee"], ["copilot", "copilot"],
  ["elevenlabs", "elevenlabs"], ["runway", "runway"], ["gamma", "gamma"], ["hailou", "hailuo"],
  ["hailuo", "hailuo"], ["gemini", "gemini"], ["veo", "veo"], ["sora", "sora"], ["kling", "kling"],
  ["turnitin", "turnitin"], ["envato", "envato"], ["semrush", "semrush"], ["ahrefs", "ahrefs"],
  ["surfshark", "surfshark"], ["jasper", "jasper"], ["vieon", "vieon"], ["fpt play", "fptplay"],
  ["wps", "wps"], ["autocad", "autodesk"], ["premiere", "adobe"], ["after effects", "adobe"]
];

function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ").trim();
}

function familyKey(p) {
  const name = norm(p.name);
  // Brand in NAME first — covers "Khóa học ChatGPT..." etc.
  for (const [needle, key] of BRANDS) {
    if (name.includes(needle)) return key;
  }
  const cats = (p.cats || []).map(norm).filter((c) => c && !["tai khoan", "san pham", "san pham so", "khoa hoc", "game", "ai va cong nghe", "tai khoan & cong cu ai"].includes(c));
  if (cats.length) {
    const leaf = cats[cats.length - 1];
    for (const [needle, key] of BRANDS) {
      if (leaf.includes(needle)) return key;
    }
    return leaf;
  }
  const stop = new Set(["tai","khoan","goi","ban","quyen","chinh","hang","gia","re","dung","rieng","thang","nam","pro","premium","full","vip","plus","ultra","ai","cong","cu","san","pham","cua","khoa","hoc","va","moi","nhat","dinh","cao"]);
  const toks = name.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !stop.has(w));
  if (toks.length >= 2) return toks.slice(0, 2).join("-");
  if (toks.length === 1) return toks[0];
  return "other";
}

function score(p) {
  const rating = Number(p.rating) > 0 ? Number(p.rating) : 4.0;
  const stock = typeof p.stock === "number" ? p.stock : 0;
  return rating * 1000 + stock;
}

function shuffle(arr, seed) {
  const a = arr.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Prefer full original catalog: restore from tar if current is already trimmed
// Use current products-data — but we need FULL set. Check removed file + current merge, or re-read from backup tar.
let src;
const backupTar = process.env.TEMP + "\\vuammo-shops2.tar.gz";
if (fs.existsSync(backupTar)) {
  // extract products-data only via tar
  const { execSync } = require("child_process");
  const tmp = process.env.TEMP + "\\vuammo-pd-restore";
  fs.mkdirSync(tmp, { recursive: true });
  try {
    execSync(`tar -xzf "${backupTar}" -C "${tmp}" js/products-data.js`, { stdio: "pipe" });
    src = fs.readFileSync(tmp + "\\js\\products-data.js", "utf8");
    console.log("restored products-data from shops2 tar");
  } catch (e) {
    src = fs.readFileSync("js/products-data.js", "utf8");
    console.log("fallback current products-data");
  }
} else {
  src = fs.readFileSync("js/products-data.js", "utf8");
}

const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + "\n;this.RAW=RAW_PRODUCTS;this.QUICK=QUICK_PICKS_RAW;", ctx);
let products = ctx.RAW.map((p) => ({ ...p }));
const quick = ctx.QUICK.map((q) => ({ ...q }));
console.log("source products", products.length);

const byFamily = new Map();
for (const p of products) {
  const f = familyKey(p);
  p._family = f;
  if (!byFamily.has(f)) byFamily.set(f, []);
  byFamily.get(f).push(p);
}

let removed = [];
const kept = [];
for (const [f, arr] of byFamily) {
  arr.sort((a, b) => score(b) - score(a));
  if (arr.length > 50) {
    kept.push(...arr.slice(0, 50));
    removed.push(...arr.slice(50).map((p) => ({ id: p.id, name: p.name, family: f })));
  } else kept.push(...arr);
}
products = kept;

const shops = JSON.parse(fs.readFileSync("data/shops-50.json", "utf8"));
const N = 50;
const total = products.length;
const base = Math.floor(total / N);
const rem = total % N;
const capacity = shops.map((_, i) => (i < rem ? base + 1 : base));
const shopState = shops.map((s, i) => ({ shop: s, products: [], families: new Set(), capacity: capacity[i] }));

const familyOrder = [...byFamily.keys()]
  .map((f) => [f, products.filter((p) => p._family === f)])
  .filter(([, list]) => list.length)
  .sort((a, b) => b[1].length - a[1].length);

for (const [family, list] of familyOrder) {
  for (const p of shuffle(list, family.length * 97 + list.length)) {
    let candidates = shopState.filter((st) => st.products.length < st.capacity && !st.families.has(family));
    if (!candidates.length) candidates = shopState.filter((st) => !st.families.has(family));
    if (!candidates.length) throw new Error("Cannot place family " + family + " without dup");
    candidates.sort((a, b) => a.products.length - b.products.length || a.shop.id - b.shop.id);
    const st = candidates[0];
    st.products.push(p);
    st.families.add(family);
    p.seller = st.shop.name;
    p.sellerToken = st.shop.token;
    p.sellerSlug = st.shop.slug;
    delete p._family;
  }
}

// Verify brand-level uniqueness (chatgpt/elsa etc)
function brandOf(p) {
  const name = norm(p.name);
  for (const [needle, key] of BRANDS) if (name.includes(needle)) return key;
  return familyKey(p);
}
let brandDups = 0;
const brandDupSamples = [];
for (const st of shopState) {
  const seen = new Set();
  for (const p of st.products) {
    const b = brandOf(p);
    if (seen.has(b)) {
      brandDups++;
      if (brandDupSamples.length < 8) brandDupSamples.push({ shop: st.shop.name, brand: b, name: p.name });
    }
    seen.add(b);
  }
}

const sizes = shopState.map((st) => st.products.length);
const ngoc = shopState.find((s) => s.shop.name === "ngocdeal");
const ngocBrands = {};
for (const p of ngoc.products) {
  const b = brandOf(p);
  ngocBrands[b] = (ngocBrands[b] || 0) + 1;
}

console.log(JSON.stringify({
  kept: products.length,
  removed: removed.length,
  sizeMin: Math.min(...sizes),
  sizeMax: Math.max(...sizes),
  brandDups,
  brandDupSamples,
  ngocdeal: { n: ngoc.products.length, chatgpt: ngocBrands.chatgpt || 0, elsa: ngocBrands.elsa || 0 }
}, null, 2));

if (brandDups > 0) {
  console.error("FAIL brand dups");
  process.exit(1);
}

const byId = new Map(products.map((p) => [p.id, p]));
const quickNext = quick.filter((q) => byId.has(q.id)).map((q) => ({ ...q, seller: byId.get(q.id).seller }));

const headEnd = src.indexOf("const RAW_PRODUCTS = ");
const afterRaw = src.indexOf(";\n\nRAW_PRODUCTS.forEach");
const quickStart = src.indexOf("const QUICK_PICKS_RAW = ");
const afterQuick = src.lastIndexOf("];");
const out =
  src.slice(0, headEnd) +
  "const RAW_PRODUCTS = " + JSON.stringify(products) +
  src.slice(afterRaw, quickStart) +
  "const QUICK_PICKS_RAW = " + JSON.stringify(quickNext) + ";" +
  src.slice(afterQuick + 2);

fs.writeFileSync("js/products-data.js", out);
fs.writeFileSync(
  "js/shops-data.js",
  "/* 50 gian hàng chuẩn Vua MMO — token riêng từng shop */\n" +
    "const VUAMMO_SHOPS = " + JSON.stringify(shops) + ";\n" +
    "function shopByToken(token){ if(!token) return null; return VUAMMO_SHOPS.find(s => s.token === String(token)) || null; }\n" +
    "function shopBySlug(slug){ if(!slug) return null; return VUAMMO_SHOPS.find(s => s.slug === String(slug)) || null; }\n" +
    "function shopByName(name){ if(!name) return null; const n=String(name).trim().toLowerCase(); return VUAMMO_SHOPS.find(s => s.name.toLowerCase()===n) || null; }\n" +
    "function shopHref(shop){ if(!shop) return 'shop.html'; return 'shop.html?token=' + encodeURIComponent(shop.token); }\n" +
    "function productsOfShop(shop){ if(!shop || typeof RAW_PRODUCTS === 'undefined') return []; return RAW_PRODUCTS.filter(p => p.sellerToken === shop.token || String(p.seller||'') === shop.name); }\n"
);
fs.writeFileSync("data/removed-duplicate-family-products.json", JSON.stringify(removed, null, 2));
fs.writeFileSync("data/shop-assignment-summary.json", JSON.stringify({
  generatedAt: new Date().toISOString(),
  mode: "strict-brand-unique",
  kept: products.length,
  removed: removed.length,
  sizeMin: Math.min(...sizes),
  sizeMax: Math.max(...sizes)
}, null, 2));
console.log("OK");
