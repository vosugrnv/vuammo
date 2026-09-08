/**
 * Generate SEO article pages at vi/chia-se/{slug}.html
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const dataCode = fs.readFileSync(path.join(root, "js", "chia-se-data.js"), "utf8");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(dataCode + "\nthis.SHARE_POSTS = SHARE_POSTS;", sandbox);
const posts = sandbox.SHARE_POSTS;

const outDir = path.join(root, "vi", "chia-se");
fs.mkdirSync(outDir, { recursive: true });

function esc(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

let template = fs.readFileSync(path.join(root, "chia-se-bai.html"), "utf8");
if(!/<base\s/i.test(template)){
  template = template.replace("<head>", '<head>\n<base href="../../">');
} else {
  template = template.replace(/<base[^>]*>/i, '<base href="../../">');
}

let count = 0;
for(const p of posts){
  const seoPath = `/vi/chia-se/${p.slug}`;
  const title = `${p.title} | Chia sẻ Vua MMO`;
  const jsonLd = {
    "@context":"https://schema.org",
    "@type":"BlogPosting",
    headline: p.title,
    description: p.excerpt,
    image: [p.image],
    datePublished: p.date,
    dateModified: p.date,
    author: {"@type":"Organization", name:"Vua MMO"},
    publisher: {"@type":"Organization", name:"Vua MMO"},
    mainEntityOfPage: seoPath
  };

  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(p.excerpt)}">`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${seoPath}">`)
    .replace(
      /<script type="application\/ld\+json" id="articleJsonLd">[\s\S]*?<\/script>/,
      `<script type="application/ld+json" id="articleJsonLd">${JSON.stringify(jsonLd)}</script>`
    )
    .replace(/<h1 id="articleTitle"><\/h1>/, `<h1 id="articleTitle">${esc(p.title)}</h1>`);

  fs.writeFileSync(path.join(outDir, `${p.slug}.html`), html, "utf8");
  count++;
}

console.log(`Generated ${count} share articles in vi/chia-se/`);
