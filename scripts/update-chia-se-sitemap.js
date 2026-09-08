const vm = require("vm");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const s = {};
vm.createContext(s);
vm.runInContext(fs.readFileSync(path.join(root, "js", "chia-se-data.js"), "utf8") + "\nthis.SHARE_POSTS=SHARE_POSTS;", s);

const staticUrls = [
  ["https://vuammo.com/", "daily", "1.0"],
  ["https://vuammo.com/tat-ca-san-pham.html", "daily", "0.9"],
  ["https://vuammo.com/vi/chia-se", "daily", "0.9"],
  ["https://vuammo.com/gioi-thieu.html", "monthly", "0.6"],
  ["https://vuammo.com/faqs.html", "monthly", "0.6"],
  ["https://vuammo.com/lien-he.html", "monthly", "0.5"],
  ["https://vuammo.com/huong-dan-mua-hang.html", "monthly", "0.5"]
];

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
for (const [loc, freq, pri] of staticUrls) {
  xml += `  <url><loc>${loc}</loc><changefreq>${freq}</changefreq><priority>${pri}</priority></url>\n`;
}
for (const p of s.SHARE_POSTS) {
  xml += `  <url><loc>https://vuammo.com/vi/chia-se/${p.slug}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
}
xml += `</urlset>\n`;
fs.writeFileSync(path.join(root, "sitemap.xml"), xml);
console.log("sitemap entries", staticUrls.length + s.SHARE_POSTS.length);
const sample = s.SHARE_POSTS[0];
console.log("sample figures", (sample.body.match(/<figure/g) || []).length, "body chars", sample.body.length);
