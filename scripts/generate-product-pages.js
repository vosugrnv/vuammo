/**
 * Generate static SEO product pages at:
 *   /vi/tat-ca-san-pham/{slug}-{id}.html
 * Each page has unique title/description/canonical/JSON-LD in HTML
 * and loads the shared product UI scripts.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const dataCode = fs.readFileSync(path.join(root, "js", "products-data.js"), "utf8");
const sandbox = { console, RAW_PRODUCTS: null };
vm.createContext(sandbox);
vm.runInContext(dataCode + "\nthis.RAW_PRODUCTS = RAW_PRODUCTS;", sandbox);
const products = sandbox.RAW_PRODUCTS;

const outDir = path.join(root, "vi", "tat-ca-san-pham");
fs.mkdirSync(outDir, { recursive: true });

function esc(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

const template = fs.readFileSync(path.join(root, "product.html"), "utf8");

let count = 0;
for(const p of products){
  const seoPath = `/vi/tat-ca-san-pham/${p.slug}-${p.id}`;
  const fileName = `${p.slug}-${p.id}.html`;
  const title = `${p.name} | Mua giá rẻ tại Vua MMO`;
  const desc = `Mua ${p.name} chính chủ tại Vua MMO. Giá từ ${p.price.toLocaleString("vi-VN")}₫, giao tài khoản 5–15 phút, bảo hành 1 đổi 1.`;
  const jsonLd = {
    "@context":"https://schema.org",
    "@type":"Product",
    name: p.name,
    image: [p.image],
    description: desc,
    sku: String(p.id),
    brand: {"@type":"Brand", name:"Vua MMO"},
    offers: {
      "@type":"Offer",
      url: seoPath,
      priceCurrency:"VND",
      price: p.price,
      availability:"https://schema.org/InStock"
    }
  };

  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${esc(desc)}">`
    )
    .replace(
      /<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${seoPath}">`
    );

  /* Nested folder: resolve css/js/images from site root */
  if(!/<base\s/i.test(html)){
    html = html.replace("<head>", '<head>\n<base href="../../">');
  } else {
    html = html.replace(/<base[^>]*>/i, '<base href="../../">');
  }

  if(!/<script type="application\/ld\+json" id="productJsonLd">/.test(html)){
    html = html.replace(
      "</head>",
      `<script type="application/ld+json" id="productJsonLd">${JSON.stringify(jsonLd)}</script>\n</head>`
    );
  }

  /* Ensure H1 has crawlable text before JS runs */
  html = html.replace(
    /<h1 id="prodTitle"><\/h1>/,
    `<h1 id="prodTitle">${esc(p.name)}</h1>`
  );
  html = html.replace(
    /<img id="prodImage" src="" alt="">/,
    `<img id="prodImage" src="${esc(p.image)}" alt="${esc(p.name)}">`
  );

  fs.writeFileSync(path.join(outDir, fileName), html, "utf8");
  count++;
}

/* Listing alias */
const listingSrc = path.join(root, "tat-ca-san-pham.html");
if(fs.existsSync(listingSrc)){
  fs.copyFileSync(listingSrc, path.join(outDir, "index.html"));
}

console.log(`Generated ${count} product pages in vi/tat-ca-san-pham/`);
