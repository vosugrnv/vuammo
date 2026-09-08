const vm = require("vm");
const fs = require("fs");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync("js/products-data.js", "utf8") +
    "\nthis.RAW_PRODUCTS = RAW_PRODUCTS;\nthis.slugify = slugify;",
  ctx
);
vm.runInContext(
  fs.readFileSync("js/category-taxonomy.js", "utf8") +
    "\nthis.CATEGORY_TAXONOMY = CATEGORY_TAXONOMY;",
  ctx
);

const GENERIC =
  /^(tài khoản|sản phẩm bán chạy|sản phẩm|uncategorized|chưa phân loại)$/i;

function norm(t) {
  return String(t)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

const leaves = [];
for (const p of ctx.CATEGORY_TAXONOMY.parents) {
  for (const c of p.children) {
    if (/^khác$/i.test(c.title) || /^tài khoản khác$/i.test(c.title)) continue;
    leaves.push(c.title);
  }
}

const aliases = {
  tiktok: ["tik tok", "tiktokshop", "tiktok shop"],
  telegram: ["tele "],
  chatgpt: ["chat gpt", "openai"],
  claude: ["anthropic"],
  midjourney: ["mid journey"],
  youtube: ["youtub"],
  instagram: ["insta"],
  "manus ai": ["manus"],
  "poe premium": ["poe"],
  expressvpn: ["express vpn"],
  "nord vpn": ["nordvpn"],
  capcut: ["cap cut"],
  heygen: ["hey gen"],
  elevenlabs: ["eleven labs"],
  "google drive": ["gg drive"],
  chatgpt: ["chat gpt"],
};

const hints = [];
for (const title of leaves) {
  const n = norm(title);
  const keys = new Set([n, n.replace(/\s+/g, "")]);
  for (const a of aliases[n] || []) keys.add(norm(a));
  hints.push({
    title,
    keys: [...keys].filter((k) => k.length >= 3),
  });
}
hints.sort(
  (a, b) =>
    Math.max(...b.keys.map((k) => k.length)) -
    Math.max(...a.keys.map((k) => k.length))
);

function infer(name) {
  const hay = norm(name);
  for (const h of hints) {
    for (const k of h.keys) {
      if (hay.includes(k)) return h.title;
    }
  }
  return null;
}

const onlyParent = ctx.RAW_PRODUCTS.filter((p) => {
  const cats = (p.cats || []).map((c) => String(c).trim()).filter(Boolean);
  const nong = cats.filter((c) => !GENERIC.test(c));
  return cats.length && nong.length === 0;
});

const mapped = new Map();
let unmapped = 0;
const samples = {};
for (const p of onlyParent) {
  const t = infer(p.name);
  if (!t) {
    unmapped++;
    continue;
  }
  mapped.set(t, (mapped.get(t) || 0) + 1);
  if (!samples[t]) samples[t] = p.name.slice(0, 60);
}

console.log(
  JSON.stringify(
    {
      onlyParent: onlyParent.length,
      inferred: onlyParent.length - unmapped,
      stillOther: unmapped,
      top: [...mapped.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([t, c]) => ({ t, c, e: samples[t] })),
    },
    null,
    2
  )
);
