/**
 * Import WooCommerce CSV → js/products-data.js (replaces old catalog).
 * Usage: node scripts/import-wc-csv.js [path-to-csv]
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const csvPath = process.argv[2] || "C:/Users/Admin/Downloads/wc-product-export-5-9-2026-1788613389088.csv";
const outPath = path.join(root, "js", "products-data.js");

function parseCSV(text){
  const rows = [];
  let row = [], cell = "", i = 0, inQ = false;
  while(i < text.length){
    const c = text[i];
    if(inQ){
      if(c === '"'){
        if(text[i+1] === '"'){ cell += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      cell += c; i++; continue;
    }
    if(c === '"'){ inQ = true; i++; continue; }
    if(c === ","){ row.push(cell); cell = ""; i++; continue; }
    if(c === "\r"){ i++; continue; }
    if(c === "\n"){ row.push(cell); rows.push(row); row = []; cell = ""; i++; continue; }
    cell += c; i++;
  }
  if(cell.length || row.length){ row.push(cell); rows.push(row); }
  return rows;
}

function num(v){
  if(v == null || v === "") return 0;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function cleanName(s){
  return String(s || "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCats(raw){
  if(!raw) return [];
  const parts = String(raw).split(",").map(s => s.trim()).filter(Boolean);
  const out = [];
  const seen = new Set();
  for(const part of parts){
    const segs = part.split(">").map(s => s.trim()).filter(Boolean);
    for(const seg of segs){
      if(!seen.has(seg)){
        seen.add(seg);
        out.push(seg);
      }
    }
  }
  return out;
}

function firstImage(raw){
  if(!raw) return "";
  return String(raw).split(",")[0].trim();
}

function ratingOf(r, get){
  const keys = [
    "Meta: average_rating",
    "Meta: _wc_average_rating",
    "Meta: seller_rating",
    "Meta: _seller_rating",
    "Meta: _wc_rating_count"
  ];
  for(const k of keys){
    const v = num(get(r, k));
    if(v > 0 && v <= 5) return Math.round(v * 100) / 100;
  }
  return 0;
}

function sellerOf(r, get){
  return (
    get(r, "Meta: seller_name") ||
    get(r, "Meta: _seller_name") ||
    get(r, "Meta: _g2g_seller_name") ||
    get(r, "Meta: g2g_seller") ||
    ""
  ).trim();
}

console.log("Reading CSV…", csvPath);
const text = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
const rows = parseCSV(text);
const header = rows[0];
const idx = Object.fromEntries(header.map((h, i) => [h, i]));
const get = (r, k) => (idx[k] != null ? (r[idx[k]] || "") : "");

const varPrices = new Map();
const varStockSum = new Map();
const varStockTracked = new Set();
const variantsByParent = new Map();

function bump(pid, sale, reg){
  let o = varPrices.get(pid) || { minSale: 0, minReg: 0, minAny: 0 };
  const s = num(sale), g = num(reg);
  const any = s || g;
  if(s && (!o.minSale || s < o.minSale)) o.minSale = s;
  if(g && (!o.minReg || g < o.minReg)) o.minReg = g;
  if(any && (!o.minAny || any < o.minAny)) o.minAny = any;
  varPrices.set(pid, o);
}

function isPaAttr(name){
  return /^pa[_-]/i.test(String(name || "").trim());
}

function variantLabelOf(r){
  const parts = [];
  for(let n = 1; n <= 2; n++){
    const attrName = get(r, `Tên thuộc tính ${n}`).trim();
    const attrVal = get(r, `Giá trị thuộc tính ${n}`).trim();
    if(!attrVal) continue;
    if(isPaAttr(attrName) || isPaAttr(attrVal)) continue;
    parts.push(attrVal);
  }
  if(parts.length) return parts.join(" · ");
  const full = cleanName(get(r, "Tên"));
  const dash = full.lastIndexOf(" - ");
  if(dash > 0) return full.slice(dash + 3).trim() || full;
  return full || "Gói";
}

function variantGroupLabelOf(r){
  for(let n = 1; n <= 2; n++){
    const attrName = get(r, `Tên thuộc tính ${n}`).trim();
    if(attrName && !isPaAttr(attrName)) return attrName;
  }
  return "Gói";
}

for(let i = 1; i < rows.length; i++){
  const r = rows[i];
  const type = get(r, "Loại");
  if(!type.includes("variation")) continue;
  const m = get(r, "Cha").match(/(\d+)/);
  if(!m) continue;
  const pid = m[1];
  const sale = get(r, "Giá khuyến mãi");
  const regular = get(r, "Giá thông thường");
  bump(pid, sale, regular);

  const rawStock = get(r, "Tồn kho");
  if(rawStock !== ""){
    varStockTracked.add(pid);
    const qty = Math.max(0, num(rawStock));
    varStockSum.set(pid, (varStockSum.get(pid) || 0) + qty);
  }

  const price = num(sale) || num(regular);
  if(!price || price < 1000) continue;

  const vid = Number(get(r, "ID"));
  if(!vid) continue;
  const regPrice = num(regular) || price;
  const variant = {
    id: vid,
    label: variantLabelOf(r),
    price: Math.round(price),
    regular: Math.round(regPrice < price ? price : regPrice)
  };
  if(rawStock !== "") variant.stock = Math.max(0, num(rawStock));

  if(!variantsByParent.has(pid)){
    variantsByParent.set(pid, { group: variantGroupLabelOf(r), items: [] });
  }
  variantsByParent.get(pid).items.push(variant);
}

const PLACEHOLDER = "https://via.placeholder.com/400x400.png?text=Vua+MMO";
const products = [];
let skippedNoPrice = 0;

for(let i = 1; i < rows.length; i++){
  const r = rows[i];
  const type = get(r, "Loại");
  if(get(r, "Đã xuất bản") !== "1") continue;
  if(!(type.startsWith("simple") || type === "variable")) continue;

  const id = Number(get(r, "ID"));
  const name = cleanName(get(r, "Tên"));
  if(!name || !id) continue;

  let sale = num(get(r, "Giá khuyến mãi"));
  let regular = num(get(r, "Giá thông thường"));
  let price = sale || regular;

  if(type === "variable"){
    const vp = varPrices.get(String(id));
    if(vp && vp.minAny){
      price = vp.minSale || vp.minAny;
      regular = vp.minReg || vp.minAny;
    } else {
      const metaSale = num(get(r, "Meta: _min_variation_sale_price"));
      const metaReg = num(get(r, "Meta: _min_variation_regular_price"));
      const metaAny = num(get(r, "Meta: _min_variation_price"));
      price = metaSale || metaAny || metaReg || price;
      regular = metaReg || metaAny || regular || price;
    }
  }

  if(!price || price < 1000){
    skippedNoPrice++;
    continue;
  }
  if(!regular || regular < price) regular = price;

  const image = firstImage(get(r, "Hình ảnh")) || PLACEHOLDER;
  const cats = parseCats(get(r, "Danh mục"));
  const seller = sellerOf(r, get);
  const rating = ratingOf(r, get);
  const inStock = get(r, "Còn hàng?") !== "0";

  let stock = null;
  const parentStockRaw = get(r, "Tồn kho");
  if(parentStockRaw !== ""){
    stock = Math.max(0, num(parentStockRaw));
  } else if(varStockTracked.has(String(id))){
    stock = varStockSum.get(String(id)) || 0;
  }

  const item = {
    id,
    name,
    price: Math.round(price),
    regular: Math.round(regular),
    image,
    rating,
    cats,
    inStock
  };
  if(seller) item.seller = seller;
  if(stock != null) item.stock = stock;

  const packed = variantsByParent.get(String(id));
  if(packed && packed.items.length){
    packed.items.sort((a, b) => a.price - b.price || a.label.localeCompare(b.label, "vi"));
    item.variantGroup = packed.group || "Gói";
    item.variants = packed.items;
  } else {
    item.variantGroup = "Gói";
    item.variants = [{
      id,
      label: "Gói tiêu chuẩn",
      price: Math.round(price),
      regular: Math.round(regular),
      ...(stock != null ? { stock } : {})
    }];
  }
  products.push(item);
}

products.sort((a, b) => a.id - b.id);

/* Quick picks: prefer rated + bán chạy, else cheapest popular names */
function scorePick(p){
  let s = 0;
  if(p.rating >= 4) s += 50 + p.rating * 10;
  if((p.cats || []).some(c => /bán chạy|hot|best/i.test(c))) s += 40;
  if(/chatgpt|capcut|spotify|netflix|canva|youtube|proxy|cursor|claude|gemini/i.test(p.name)) s += 30;
  if(p.regular > p.price) s += 15;
  s += Math.min(20, Math.floor(p.price / 50000));
  return s;
}

function isSelling(p){
  if(p.inStock === false) return false;
  if(typeof p.stock === "number" && p.stock <= 0) return false;
  return true;
}

const picks = [...products]
  .filter(p => isSelling(p) && typeof p.stock === "number" && p.stock > 0)
  .sort((a, b) => scorePick(b) - scorePick(a))
  .slice(0, 25)
  .map((p, i) => {
    const seed = p.id * 17 + i * 31;
    const stock = p.stock;
    const stockMax = Math.max(stock, Math.ceil(stock / 0.85));
    const soldN = 500 + (seed % 12000);
    const sold = soldN >= 1000
      ? (soldN / 1000).toFixed(1).replace(".", ",") + "k"
      : String(soldN);
    const tag = i % 5 === 2 ? "hot" : "sale";
    const row = {
      id: p.id,
      tag,
      name: p.name,
      seller: p.seller || "",
      rating: p.rating > 0 ? p.rating : 4.5 + ((seed % 5) / 10),
      sold,
      price: p.price,
      stock,
      stockMax
    };
    if(p.regular > p.price * 1.15) row.old = p.regular;
    return row;
  });

const helpers = `/* Product catalog data — imported from WooCommerce CSV. */
function slugify(str){
  return str.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/đ/gi,"d")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}
function productBySlug(slug){
  if(!slug) return null;
  return RAW_PRODUCTS.find(p => p.slug === slug || slugify(p.name) === slug) || null;
}
function productById(id){
  const n = Number(id);
  return RAW_PRODUCTS.find(p => p.id === n) || null;
}
/** SEO path (canonical): /vi/tat-ca-san-pham/ten-san-pham-12345 */
function productSeoPath(p){
  return \`/vi/tat-ca-san-pham/\${p.slug}-\${p.id}\`;
}
/** Clickable href — always root-absolute (needed with <base href> on SEO pages) */
function productHref(p){
  if(!p) return "/tat-ca-san-pham.html";
  return "/vi/tat-ca-san-pham/" + p.slug + "-" + p.id + ".html";
}
/** Resolve product from clean URL or ?slug= / ?id= */
function resolveProductFromLocation(){
  const params = new URLSearchParams(location.search);
  if(params.get("id")) return productById(params.get("id"));
  if(params.get("slug")) return productBySlug(params.get("slug"));
  const m = location.pathname.match(/\\/vi\\/tat-ca-san-pham\\/([^/]+?)(?:\\.html)?\\/?$/i);
  if(m){
    const raw = decodeURIComponent(m[1]);
    const idMatch = raw.match(/-(\\d+)$/);
    if(idMatch){
      const byId = productById(idMatch[1]);
      if(byId) return byId;
    }
    const slugOnly = raw.replace(/-\\d+$/,"");
    return productBySlug(slugOnly);
  }
  return null;
}
`;

const footer = `
RAW_PRODUCTS.forEach((p) => {
  if(!p.slug) p.slug = slugify(p.name);
});

/* Curated "quick pick" flash-sale list as shown on the homepage's first section. */
const QUICK_PICKS_RAW = ${JSON.stringify(picks)};
`;

const body = helpers +
  "const RAW_PRODUCTS = " + JSON.stringify(products) + ";\n" +
  footer;

fs.writeFileSync(outPath, body, "utf8");
const sizeMb = (Buffer.byteLength(body) / 1024 / 1024).toFixed(2);
console.log(`Wrote ${products.length} products → ${outPath} (${sizeMb} MB)`);
console.log(`Skipped no/low price: ${skippedNoPrice}; quick picks: ${picks.length}`);
const withVars = products.filter(p => (p.variants || []).length > 1).length;
console.log(`Products with multi variants: ${withVars}`);
console.log("Sample:", products[0]);
console.log("Sample variants:", (products[0].variants || []).slice(0, 4));
