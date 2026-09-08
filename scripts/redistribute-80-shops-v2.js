const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");

const N = 80;
const CITIES = [
  { city: "Hà Nội", district: "Cầu Giấy" },
  { city: "Hà Nội", district: "Đống Đa" },
  { city: "Hà Nội", district: "Thanh Xuân" },
  { city: "Hà Nội", district: "Hoàng Mai" },
  { city: "TP. Hồ Chí Minh", district: "Quận 1" },
  { city: "TP. Hồ Chí Minh", district: "Bình Thạnh" },
  { city: "TP. Hồ Chí Minh", district: "Tân Bình" },
  { city: "TP. Hồ Chí Minh", district: "Quận 7" },
  { city: "Đà Nẵng", district: "Hải Châu" },
  { city: "Hải Phòng", district: "Lê Chân" },
  { city: "Cần Thơ", district: "Ninh Kiều" },
  { city: "Huế", district: "TP. Huế" },
  { city: "Nha Trang", district: "Lộc Thọ" },
  { city: "Biên Hòa", district: "An Bình" }
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
  for (const [needle, key] of BRANDS) if (name.includes(needle)) return key;
  const cats = (p.cats || []).map(norm).filter((c) => c && !["tai khoan", "san pham", "san pham so", "khoa hoc", "game", "ai va cong nghe", "tai khoan & cong cu ai"].includes(c));
  if (cats.length) {
    const leaf = cats[cats.length - 1];
    for (const [needle, key] of BRANDS) if (leaf.includes(needle)) return key;
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
function token() { return crypto.randomBytes(12).toString("hex"); }
function slugify(str) {
  return norm(str).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "shop";
}

// Original catalog + sellers
const origSrc = fs.readFileSync(process.env.TEMP + "/vuammo-orig-sellers/js/products-data.js", "utf8");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(origSrc + "\n;this.RAW=RAW_PRODUCTS;this.QUICK=QUICK_PICKS_RAW;", ctx);
let products = ctx.RAW.map((p) => ({ ...p }));
const quick = ctx.QUICK.map((q) => ({ ...q }));

const sellerCount = new Map();
for (const p of products) {
  const s = String(p.seller || "").trim();
  if (!s) continue;
  sellerCount.set(s, (sellerCount.get(s) || 0) + 1);
}
const top80Names = [...sellerCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, N).map(([n]) => n);

// Preserve tokens from previous shops file when name matches
const prev = JSON.parse(fs.readFileSync("data/shops-80.json", "utf8"));
const tokenByName = new Map(prev.map((s) => [s.name.toLowerCase(), s]));

const shops = top80Names.map((name, i) => {
  const loc = CITIES[i % CITIES.length];
  const old = tokenByName.get(name.toLowerCase());
  return {
    id: i + 1,
    name,
    slug: slugify(name),
    token: old && old.token ? old.token : token(),
    city: loc.city,
    district: loc.district,
    rating: Number((4.5 + ((i * 7) % 5) / 10).toFixed(1)),
    joinedYear: 2023 + (i % 3),
    bio: name + " là gian hàng sản phẩm số trên Vua MMO — giao nhanh, bảo hành rõ ràng, hỗ trợ khách trong giờ làm việc."
  };
});
const slugSeen = new Set();
for (const s of shops) {
  let base = s.slug || "shop";
  let slug = base;
  let n = 2;
  while (slugSeen.has(slug)) slug = base + "-" + n++;
  slugSeen.add(slug);
  s.slug = slug;
}

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
  if (arr.length > N) {
    kept.push(...arr.slice(0, N));
    removed.push(...arr.slice(N).map((p) => ({ id: p.id, name: p.name, family: f })));
  } else kept.push(...arr);
}
products = kept;

const total = products.length;
const baseQty = Math.floor(total / N);
const rem = total % N;
const capacity = shops.map((_, i) => (i < rem ? baseQty + 1 : baseQty));
const shopState = shops.map((s, i) => ({ shop: s, products: [], families: new Set(), capacity: capacity[i] }));

const familyOrder = [...byFamily.keys()]
  .map((f) => [f, products.filter((p) => p._family === f)])
  .filter(([, list]) => list.length)
  .sort((a, b) => b[1].length - a[1].length);

for (const [family, list] of familyOrder) {
  for (const p of shuffle(list, family.length * 97 + list.length)) {
    let candidates = shopState.filter((st) => st.products.length < st.capacity && !st.families.has(family));
    if (!candidates.length) candidates = shopState.filter((st) => !st.families.has(family));
    if (!candidates.length) throw new Error("Cannot place without dup: " + family);
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

function brandOf(p) {
  const name = norm(p.name);
  for (const [needle, key] of BRANDS) if (name.includes(needle)) return key;
  return familyKey(p);
}
let brandDups = 0;
for (const st of shopState) {
  const seen = new Set();
  for (const p of st.products) {
    const b = brandOf(p);
    if (seen.has(b)) brandDups++;
    seen.add(b);
  }
}
const sizes = shopState.map((st) => st.products.length);
console.log(JSON.stringify({
  shops: shops.length,
  kept: products.length,
  removed: removed.length,
  sizeMin: Math.min(...sizes),
  sizeMax: Math.max(...sizes),
  sizeAvg: Math.round((sizes.reduce((a,b)=>a+b,0)/N)*10)/10,
  brandDups,
  sampleShops: shops.slice(48, 55).map((s) => s.name),
  ngocdeal: (() => {
    const st = shopState.find((s) => s.shop.name === "ngocdeal");
    if (!st) return null;
    const c = {};
    for (const p of st.products) {
      const b = brandOf(p);
      c[b] = (c[b] || 0) + 1;
    }
    return { n: st.products.length, chatgpt: c.chatgpt || 0, elsa: c.elsa || 0, capcut: c.capcut || 0 };
  })()
}, null, 2));
if (brandDups > 0) process.exit(1);

const byId = new Map(products.map((p) => [p.id, p]));
const quickNext = quick.filter((q) => byId.has(q.id)).map((q) => ({ ...q, seller: byId.get(q.id).seller }));

const headEnd = origSrc.indexOf("const RAW_PRODUCTS = ");
const afterRaw = origSrc.indexOf(";\n\nRAW_PRODUCTS.forEach");
const quickStart = origSrc.indexOf("const QUICK_PICKS_RAW = ");
const afterQuick = origSrc.lastIndexOf("];");
fs.writeFileSync(
  "js/products-data.js",
  origSrc.slice(0, headEnd) +
    "const RAW_PRODUCTS = " + JSON.stringify(products) +
    origSrc.slice(afterRaw, quickStart) +
    "const QUICK_PICKS_RAW = " + JSON.stringify(quickNext) + ";" +
    origSrc.slice(afterQuick + 2)
);

fs.writeFileSync("data/shops-80.json", JSON.stringify(shops, null, 2));
fs.writeFileSync("data/shops-50.json", JSON.stringify(shops, null, 2));
fs.writeFileSync(
  "js/shops-data.js",
  "/* 80 gian hàng chuẩn Vua MMO — token riêng từng shop */\n" +
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
  mode: "strict-brand-unique-80",
  shops: N,
  kept: products.length,
  removed: removed.length,
  sizeMin: Math.min(...sizes),
  sizeMax: Math.max(...sizes),
  shopsDetail: shopState.map((st) => ({ name: st.shop.name, token: st.shop.token, slug: st.shop.slug, n: st.products.length }))
}, null, 2));

fs.mkdirSync("gian-hang", { recursive: true });
for (const f of fs.readdirSync("gian-hang")) if (f.endsWith(".html")) fs.unlinkSync(path.join("gian-hang", f));
for (const s of shops) {
  fs.writeFileSync(path.join("gian-hang", s.slug + ".html"), `<!DOCTYPE html>
<html lang="vi"><head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0;url=../shop.html?token=${encodeURIComponent(s.token)}">
<title>${s.name} | Gian hàng Vua MMO</title>
<script>location.replace("../shop.html?token=${encodeURIComponent(s.token)}");</script>
</head><body><p><a href="../shop.html?token=${encodeURIComponent(s.token)}">${s.name}</a></p></body></html>`);
}
console.log("OK 80 real shops");
