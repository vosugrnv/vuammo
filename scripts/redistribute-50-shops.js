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

function familyKey(p) {
  const cats = (p.cats || [])
    .map((c) => String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim())
    .filter((c) => c && c !== "tai khoan" && c !== "san pham" && c !== "san pham so");
  if (cats.length) return cats[cats.length - 1];
  const name = String(p.name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
  const brands = [
    "capcut","chatgpt","claude","cursor","netflix","spotify","zoom","canva","midjourney","photoshop","adobe",
    "office","windows","youtube","tiktok","instagram","facebook","grok","perplexity","tradingview","expressvpn",
    "hma","quizlet","freepik","heygen","autodesk","iqiyi","youku","wink","xingtu","grammarly","notion","figma",
    "discord","telegram","gmail","outlook","linkedin","shopee","lazada","proxy","vpn","duolingo","meitu","monica",
    "vbee","elsa","copilot","elevenlabs","nord","runway","gamma","hailou","gemini","veo"
  ];
  for (const b of brands) if (name.includes(b)) return b;
  // first meaningful token from name
  const tok = name.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3)[1] || "other";
  return tok;
}

function token() {
  return crypto.randomBytes(12).toString("hex");
}

function slugify(str) {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Load products
const src = fs.readFileSync("js/products-data.js", "utf8");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + "\n;this.RAW=RAW_PRODUCTS;this.QUICK=QUICK_PICKS_RAW;", ctx);
const products = ctx.RAW;
const quick = ctx.QUICK;

// Pick top 50 sellers by count (exclude blank)
const counts = new Map();
for (const p of products) {
  const s = String(p.seller || "").trim();
  if (!s) continue;
  counts.set(s, (counts.get(s) || 0) + 1);
}
const top50 = [...counts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 50)
  .map(([name]) => name);

if (top50.length < 50) {
  // pad with generated names if needed
  let i = 1;
  while (top50.length < 50) {
    const n = "vuammo-shop-" + i++;
    if (!top50.includes(n)) top50.push(n);
  }
}

const shops = top50.map((name, i) => {
  const loc = CITIES[i % CITIES.length];
  const t = token();
  return {
    id: i + 1,
    name,
    slug: slugify(name),
    token: t,
    city: loc.city,
    district: loc.district,
    rating: Number((4.5 + ((i * 7) % 5) / 10).toFixed(1)),
    joinedYear: 2023 + (i % 3),
    bio:
      name +
      " là gian hàng sản phẩm số trên Vua MMO — giao nhanh, bảo hành rõ ràng, hỗ trợ khách trong giờ làm việc."
  };
});

// Ensure unique slugs
const slugSeen = new Set();
for (const s of shops) {
  let base = s.slug || "shop";
  let slug = base;
  let n = 2;
  while (slugSeen.has(slug)) slug = base + "-" + n++;
  slugSeen.add(slug);
  s.slug = slug;
}

const N = shops.length;
const TARGET_MIN = 70;
const TARGET_MAX = 90;
const total = products.length;
const base = Math.floor(total / N);
const rem = total % N;
// expected sizes: first `rem` shops get base+1
const capacity = shops.map((_, i) => (i < rem ? base + 1 : base));

// State per shop
const shopState = shops.map((s, i) => ({
  shop: s,
  products: [],
  families: new Map(), // family -> count
  capacity: capacity[i]
}));

// Group products by family, shuffle within family for fairness
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

const byFamily = new Map();
for (const p of products) {
  const f = familyKey(p);
  if (!byFamily.has(f)) byFamily.set(f, []);
  byFamily.get(f).push(p);
}

// Process larger families first
const familyOrder = [...byFamily.entries()].sort((a, b) => b[1].length - a[1].length);

function pickShop(family) {
  // Prefer shops without this family, under capacity, fewest products
  let candidates = shopState.filter((st) => st.products.length < st.capacity && !st.families.has(family));
  if (!candidates.length) {
    candidates = shopState.filter((st) => st.products.length < st.capacity);
  }
  if (!candidates.length) {
    // overflow: allow all, pick fewest
    candidates = shopState.slice();
  }
  candidates.sort((a, b) => {
    const fa = a.families.get(family) || 0;
    const fb = b.families.get(family) || 0;
    if (fa !== fb) return fa - fb;
    if (a.products.length !== b.products.length) return a.products.length - b.products.length;
    return a.shop.id - b.shop.id;
  });
  return candidates[0];
}

let assigned = 0;
for (const [family, list] of familyOrder) {
  const ordered = shuffle(list, family.length * 97 + list.length);
  for (const p of ordered) {
    const st = pickShop(family);
    st.products.push(p);
    st.families.set(family, (st.families.get(family) || 0) + 1);
    p.seller = st.shop.name;
    p.sellerToken = st.shop.token;
    p.sellerSlug = st.shop.slug;
    assigned++;
  }
}

if (assigned !== total) throw new Error("assigned mismatch " + assigned + " vs " + total);

// Update quick picks sellers from product map
const byId = new Map(products.map((p) => [p.id, p]));
for (const q of quick) {
  const p = byId.get(q.id);
  if (p) {
    q.seller = p.seller;
  }
}

// Stats
const sizes = shopState.map((st) => st.products.length);
const dupStats = shopState.map((st) => {
  let dups = 0;
  for (const [, n] of st.families) if (n > 1) dups += n - 1;
  return { name: st.shop.name, n: st.products.length, families: st.families.size, extraDupSlots: dups };
});
dupStats.sort((a, b) => b.extraDupSlots - a.extraDupSlots);

console.log(
  JSON.stringify(
    {
      products: total,
      shops: N,
      sizeMin: Math.min(...sizes),
      sizeMax: Math.max(...sizes),
      sizeAvg: Math.round((sizes.reduce((a, b) => a + b, 0) / N) * 10) / 10,
      within70_90: sizes.filter((n) => n >= TARGET_MIN && n <= TARGET_MAX).length,
      worstDupShops: dupStats.slice(0, 5),
      sampleTokens: shops.slice(0, 3).map((s) => ({ name: s.name, token: s.token, slug: s.slug }))
    },
    null,
    2
  )
);

// Rebuild products-data.js: keep head + forEach + rewrite arrays
const headEnd = src.indexOf("const RAW_PRODUCTS = ");
const afterRaw = src.indexOf(";\n\nRAW_PRODUCTS.forEach");
const quickStart = src.indexOf("const QUICK_PICKS_RAW = ");
const afterQuick = src.lastIndexOf("];");
if (headEnd < 0 || afterRaw < 0 || quickStart < 0) throw new Error("parse markers failed");

const head = src.slice(0, headEnd);
const mid = src.slice(afterRaw, quickStart); // ;\n\nRAW_PRODUCTS.forEach... through curated comment
// mid starts with ";\n\nRAW_PRODUCTS.forEach..." — good
const tailAfterQuick = src.slice(afterQuick + 2); // after ];

const rawJson = JSON.stringify(products);
const quickJson = JSON.stringify(quick);

const out =
  head +
  "const RAW_PRODUCTS = " +
  rawJson +
  mid +
  "const QUICK_PICKS_RAW = " +
  quickJson +
  ";" +
  (tailAfterQuick.startsWith("\n") ? tailAfterQuick : "\n" + tailAfterQuick);

fs.writeFileSync("js/products-data.js", out);

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
fs.writeFileSync("data/shops-50.json", JSON.stringify(shops, null, 2));

// Also write assignment summary
fs.writeFileSync(
  "data/shop-assignment-summary.json",
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      products: total,
      shops: N,
      sizeMin: Math.min(...sizes),
      sizeMax: Math.max(...sizes),
      shops: shopState.map((st) => ({
        name: st.shop.name,
        token: st.shop.token,
        slug: st.shop.slug,
        productCount: st.products.length,
        uniqueFamilies: st.families.size
      }))
    },
    null,
    2
  )
);

console.log("Wrote products-data.js, shops-data.js, data/shops-50.json");
