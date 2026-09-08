const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const shops = JSON.parse(fs.readFileSync("data/shops-80.json", "utf8"));
const dir = path.join("images", "shops");
fs.mkdirSync(dir, { recursive: true });

const palettes = [
  ["#0f172a", "#38bdf8", "#e0f2fe"],
  ["#14532d", "#4ade80", "#dcfce7"],
  ["#7c2d12", "#fb923c", "#ffedd5"],
  ["#1e3a8a", "#60a5fa", "#dbeafe"],
  ["#831843", "#f472b6", "#fce7f3"],
  ["#134e4a", "#2dd4bf", "#ccfbf1"],
  ["#3b0764", "#c084fc", "#f3e8ff"],
  ["#422006", "#fbbf24", "#fef3c7"],
  ["#111827", "#f87171", "#fee2e2"],
  ["#164e63", "#22d3ee", "#cffafe"],
  ["#365314", "#a3e635", "#ecfccb"],
  ["#4c0519", "#fb7185", "#ffe4e6"]
];

function initials(name) {
  const parts = String(name || "SH").trim().split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || "SH").slice(0, 2).toUpperCase();
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return h;
}

for (const shop of shops) {
  const h = hash(shop.token || shop.name);
  const [bg, accent, soft] = palettes[h % palettes.length];
  const shape = h % 4; // 0 circle pattern, 1 diamond, 2 bars, 3 rings
  const ini = initials(shop.name);
  let decor = "";
  if (shape === 0) {
    decor = `<circle cx="18" cy="22" r="10" fill="${accent}" opacity=".35"/><circle cx="78" cy="70" r="16" fill="${soft}" opacity=".55"/>`;
  } else if (shape === 1) {
    decor = `<rect x="58" y="12" width="26" height="26" rx="6" transform="rotate(25 71 25)" fill="${accent}" opacity=".4"/><rect x="8" y="58" width="22" height="22" rx="5" fill="${soft}" opacity=".5"/>`;
  } else if (shape === 2) {
    decor = `<rect x="12" y="64" width="10" height="22" rx="3" fill="${accent}" opacity=".45"/><rect x="28" y="52" width="10" height="34" rx="3" fill="${soft}" opacity=".55"/><rect x="72" y="18" width="12" height="28" rx="3" fill="${accent}" opacity=".35"/>`;
  } else {
    decor = `<circle cx="72" cy="28" r="14" fill="none" stroke="${accent}" stroke-width="4" opacity=".45"/><circle cx="24" cy="72" r="10" fill="none" stroke="${soft}" stroke-width="3" opacity=".7"/>`;
  }
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 96 96" role="img" aria-label="${shop.name}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity=".55"/>
    </linearGradient>
  </defs>
  <rect width="96" height="96" rx="48" fill="url(#g)"/>
  ${decor}
  <circle cx="48" cy="48" r="28" fill="${bg}" opacity=".55"/>
  <text x="48" y="54" text-anchor="middle" font-family="Segoe UI, Be Vietnam Pro, Arial, sans-serif" font-size="26" font-weight="800" fill="#fff">${ini}</text>
</svg>`;
  const file = path.join(dir, shop.slug + ".svg");
  fs.writeFileSync(file, svg);
  shop.avatar = "images/shops/" + shop.slug + ".svg";
  shop.chatRoomId = "shop_" + (shop.token || shop.slug);
}

fs.writeFileSync("data/shops-80.json", JSON.stringify(shops, null, 2));
fs.writeFileSync("data/shops-50.json", JSON.stringify(shops, null, 2));
fs.writeFileSync(
  "js/shops-data.js",
  "/* 80 gian hàng chuẩn Vua MMO — avatar + phòng chat riêng; token không public trên UI */\n" +
    "const VUAMMO_SHOPS = " + JSON.stringify(shops) + ";\n" +
    "function shopByToken(token){ if(!token) return null; return VUAMMO_SHOPS.find(s => s.token === String(token)) || null; }\n" +
    "function shopBySlug(slug){ if(!slug) return null; return VUAMMO_SHOPS.find(s => s.slug === String(slug)) || null; }\n" +
    "function shopByName(name){ if(!name) return null; const n=String(name).trim().toLowerCase(); return VUAMMO_SHOPS.find(s => s.name.toLowerCase()===n) || null; }\n" +
    "function shopHref(shop){ if(!shop) return 'shop.html'; return 'shop.html?token=' + encodeURIComponent(shop.token); }\n" +
    "function shopAvatarUrl(shop){ if(!shop) return 'images/logo-vuammo.png'; return shop.avatar || ('images/shops/' + shop.slug + '.svg'); }\n" +
    "function productsOfShop(shop){ if(!shop || typeof RAW_PRODUCTS === 'undefined') return []; return RAW_PRODUCTS.filter(p => p.sellerToken === shop.token || String(p.seller||'') === shop.name); }\n"
);
console.log("avatars", shops.length, "sample", shops[0].avatar, shops[1].avatar);
