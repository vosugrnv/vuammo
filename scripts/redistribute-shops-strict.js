const fs = require("fs");
const path = require("path");
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
  "capcut","chatgpt","chat gpt","claude","cursor","netflix","spotify","zoom","canva","midjourney",
  "photoshop","adobe","office 365","microsoft office","windows","youtube","tiktok","instagram",
  "facebook","grok","perplexity","tradingview","expressvpn","hma","quizlet","freepik","heygen",
  "autodesk","iqiyi","youku","wink","xingtu","grammarly","notion","figma","discord","telegram",
  "gmail","outlook","linkedin","shopee","lazada","proxy","nordvpn","nord vpn","duolingo","meitu",
  "monica","vbee","elsa speak","elsa","copilot","elevenlabs","runway","gamma","hailou","hailuo",
  "gemini","veo","sora","kling","turnitin","quizlet","envato","semrush","ahrefs","surfshark",
  "pia vpn","cyberghost","lastpass","1password","notion ai","jasper","writesonic","copy ai"
];

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function familyKey(p) {
  const cats = (p.cats || [])
    .map((c) => norm(c))
    .filter((c) => c && c !== "tai khoan" && c !== "san pham" && c !== "san pham so" && c !== "tai khoan & cong cu ai");
  // Prefer last cat if it looks like a brand/product line
  if (cats.length) {
    const leaf = cats[cats.length - 1];
    // normalize leaf aliases
    if (leaf.includes("chatgpt") || leaf.includes("chat gpt") || leaf === "gpt") return "chatgpt";
    if (leaf.includes("elsa")) return "elsa";
    if (leaf.includes("capcut")) return "capcut";
    if (leaf.includes("nord")) return "nordvpn";
    return leaf;
  }
  const name = norm(p.name);
  for (const b of BRANDS) {
    if (name.includes(b)) {
      if (b.includes("chat")) return "chatgpt";
      if (b.includes("elsa")) return "elsa";
      if (b.includes("nord")) return "nordvpn";
      if (b.includes("hailo")) return "hailuo";
      if (b.includes("office")) return "office";
      return b.replace(/\s+/g, "");
    }
  }
  // finer other: take 2 significant tokens from name
  const stop = new Set(["tai","khoan","goi","ban","quyen","chinh","hang","gia","re","dung","rieng","thang","nam","pro","premium","full","vip","plus","ultra","ai","cong","cu","san","pham","cua","hang","tot","nhat","khong","gioi","han"]);
  const toks = name.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !stop.has(w));
  if (toks.length >= 2) return toks.slice(0, 2).join("-");
  if (toks.length === 1) return toks[0];
  return "other";
}

function score(p) {
  const rating = Number(p.rating) > 0 ? Number(p.rating) : 4.0;
  const stock = typeof p.stock === "number" ? p.stock : 0;
  const price = Number(p.price) || 0;
  return rating * 1000 + stock + Math.min(price / 1000, 50);
}

function token() {
  return crypto.randomBytes(12).toString("hex");
}

function slugify(str) {
  return norm(str).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "shop";
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

// Prefer original catalog if backup exists from first redistribute - use current file
const src = fs.readFileSync("js/products-data.js", "utf8");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + "\n;this.RAW=RAW_PRODUCTS;this.QUICK=QUICK_PICKS_RAW;", ctx);
let products = ctx.RAW.map((p) => ({ ...p }));
const quick = ctx.QUICK.map((q) => ({ ...q }));

// Group + cap at 50 per family (keep best)
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
  } else {
    kept.push(...arr);
  }
}
products = kept;

// Load existing 50 shops tokens if present (preserve tokens)
let shops;
const shopsPath = "data/shops-50.json";
if (fs.existsSync(shopsPath)) {
  shops = JSON.parse(fs.readFileSync(shopsPath, "utf8"));
  if (shops.length !== 50) throw new Error("shops-50.json size != 50");
} else {
  throw new Error("shops-50.json missing");
}

const N = 50;
const total = products.length;
const base = Math.floor(total / N);
const rem = total % N;
const capacity = shops.map((_, i) => (i < rem ? base + 1 : base));

const shopState = shops.map((s, i) => ({
  shop: s,
  products: [],
  families: new Set(),
  capacity: capacity[i]
}));

// Strict: never assign 2nd product of same family to a shop
const familyOrder = [...byFamily.entries()]
  .map(([f, arr]) => [f, arr.filter((p) => products.includes(p) || products.some((x) => x.id === p.id))])
  .map(([f]) => {
    const list = products.filter((p) => p._family === f);
    return [f, list];
  })
  .filter(([, list]) => list.length)
  .sort((a, b) => b[1].length - a[1].length);

const unplaced = [];

for (const [family, list] of familyOrder) {
  const ordered = shuffle(list, family.length * 97 + list.length);
  for (const p of ordered) {
    // shops without this family, under capacity
    let candidates = shopState.filter((st) => st.products.length < st.capacity && !st.families.has(family));
    if (!candidates.length) {
      // try any shop without family even if over soft capacity? No — strict uniqueness first
      candidates = shopState.filter((st) => !st.families.has(family));
      // if still need capacity balance, pick fewest products
    }
    if (!candidates.length) {
      unplaced.push(p);
      continue;
    }
    candidates.sort((a, b) => {
      if (a.products.length !== b.products.length) return a.products.length - b.products.length;
      return a.shop.id - b.shop.id;
    });
    const st = candidates[0];
    st.products.push(p);
    st.families.add(family);
    p.seller = st.shop.name;
    p.sellerToken = st.shop.token;
    p.sellerSlug = st.shop.slug;
    delete p._family;
  }
}

if (unplaced.length) {
  // Should be 0 if we capped at 50 — sanity
  console.warn("UNPLACED", unplaced.length);
  // last resort: still assign WITHOUT breaking uniqueness by expanding - shouldn't happen
  for (const p of unplaced) {
    const f = familyKey(p);
    const st = shopState.filter((s) => !s.families.has(f)).sort((a, b) => a.products.length - b.products.length)[0]
      || shopState.sort((a, b) => a.products.length - b.products.length)[0];
    st.products.push(p);
    st.families.add(f);
    p.seller = st.shop.name;
    p.sellerToken = st.shop.token;
    p.sellerSlug = st.shop.slug;
    delete p._family;
  }
}

// Verify uniqueness
let dupShops = 0;
for (const st of shopState) {
  const seen = new Set();
  for (const p of st.products) {
    const f = familyKey(p);
    if (seen.has(f)) dupShops++;
    seen.add(f);
  }
}

const byId = new Map(products.map((p) => [p.id, p]));
const quickNext = [];
for (const q of quick) {
  const p = byId.get(q.id);
  if (p) {
    q.seller = p.seller;
    quickNext.push(q);
  }
}

const sizes = shopState.map((st) => st.products.length);
console.log(JSON.stringify({
  kept: products.length,
  removed: removed.length,
  shops: N,
  sizeMin: Math.min(...sizes),
  sizeMax: Math.max(...sizes),
  sizeAvg: Math.round((sizes.reduce((a,b)=>a+b,0)/N)*10)/10,
  dupFamilyAssignments: dupShops,
  sampleRemoved: removed.slice(0, 5),
  ngocdeal: (() => {
    const st = shopState.find(s => s.shop.name === "ngocdeal");
    const fams = st.products.map(familyKey);
    const chat = fams.filter(f => f === "chatgpt").length;
    const elsa = fams.filter(f => f === "elsa" || f.includes("elsa")).length;
    return { n: st.products.length, chatgpt: chat, elsa, uniqueFamilies: new Set(fams).size };
  })()
}, null, 2));

if (dupShops > 0) throw new Error("Still have duplicates: " + dupShops);

// Rewrite products-data.js
const headEnd = src.indexOf("const RAW_PRODUCTS = ");
const afterRaw = src.indexOf(";\n\nRAW_PRODUCTS.forEach");
const quickStart = src.indexOf("const QUICK_PICKS_RAW = ");
const afterQuick = src.lastIndexOf("];");
const head = src.slice(0, headEnd);
const mid = src.slice(afterRaw, quickStart);
const tailAfterQuick = src.slice(afterQuick + 2);

const out =
  head +
  "const RAW_PRODUCTS = " +
  JSON.stringify(products) +
  mid +
  "const QUICK_PICKS_RAW = " +
  JSON.stringify(quickNext) +
  ";" +
  (tailAfterQuick.startsWith("\n") ? tailAfterQuick : "\n" + tailAfterQuick);

fs.writeFileSync("js/products-data.js", out);

// Update shops-data.js (same shops)
const shopsJs =
  "/* 50 gian hàng chuẩn Vua MMO — token riêng từng shop */\n" +
  "const VUAMMO_SHOPS = " +
  JSON.stringify(shops, null, 0) +
  ";\n" +
  "function shopByToken(token){ if(!token) return null; return VUAMMO_SHOPS.find(s => s.token === String(token)) || null; }\n" +
  "function shopBySlug(slug){ if(!slug) return null; return VUAMMO_SHOPS.find(s => s.slug === String(slug)) || null; }\n" +
  "function shopByName(name){ if(!name) return null; const n=String(name).trim().toLowerCase(); return VUAMMO_SHOPS.find(s => s.name.toLowerCase()===n) || null; }\n" +
  "function shopHref(shop){\n" +
  "  if(!shop) return 'shop.html';\n" +
  "  return 'shop.html?token=' + encodeURIComponent(shop.token);\n" +
  "}\n" +
  "function productsOfShop(shop){\n" +
  "  if(!shop || typeof RAW_PRODUCTS === 'undefined') return [];\n" +
  "  return RAW_PRODUCTS.filter(p => p.sellerToken === shop.token || String(p.seller||'') === shop.name);\n" +
  "}\n";
fs.writeFileSync("js/shops-data.js", shopsJs);

fs.writeFileSync(
  "data/shop-assignment-summary.json",
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mode: "strict-unique-family",
      kept: products.length,
      removed: removed.length,
      removedSample: removed.slice(0, 30),
      shops: shopState.map((st) => ({
        name: st.shop.name,
        token: st.shop.token,
        productCount: st.products.length,
        uniqueFamilies: st.families.size
      }))
    },
    null,
    2
  )
);
fs.writeFileSync("data/removed-duplicate-family-products.json", JSON.stringify(removed, null, 2));
console.log("OK wrote catalog, removed", removed.length);
