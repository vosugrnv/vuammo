const fs=require("fs");
const t=fs.readFileSync("index.html","utf8");
const m=t.match(/<nav class="nav-links">([\s\S]*?)<\/nav>/);
console.log(m ? m[1].replace(/\s+/g," ").trim().slice(0,700) : "NO NAV");
console.log({
  FAQs: /FAQs/.test(m && m[1]),
  lienHe: /lien-he/.test(m && m[1]),
  chinhSach: /Chính sách/.test(m && m[1]),
  congCu: /Công cụ/.test(m && m[1]),
  api: /tai-lieu-api/.test(m && m[1]),
  heroBroken: /hero-slider/.test(m && m[1])
});
