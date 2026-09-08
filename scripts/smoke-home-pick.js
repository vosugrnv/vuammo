const vm = require("vm");
const fs = require("fs");
const s = {};
vm.createContext(s);
vm.runInContext(fs.readFileSync("js/products-data.js", "utf8") + "\nthis.RAW=RAW_PRODUCTS;", s);

function hay(p){ return (p.name + " " + (p.cats || []).join(" ")).toLowerCase(); }
function hasCat(p, re){ return (p.cats || []).some(c => re.test(String(c))); }
const CAT = {
  ai: p => hasCat(p, /chatgpt|claude|gemini|grok|midjourney|runway|kling|heygen|perplexity|cursor|copilot|openai|monica|elevenlabs|gamma|hailou|google ultra|công cụ ai/i)
    || /chatgpt|claude|gemini|grok|midjourney|runway|kling|heygen|perplexity|cursor|copilot|openai|monica|elevenlabs|gamma|hailou|veo|gpt/i.test(hay(p)),
  ngoaingu: p => hasCat(p, /duolingo|elsa|busuu|memrise|babbel|grammarly|quillbot|ngoại ngữ/i)
    || /duolingo|elsa|busuu|memrise|babbel|grammarly|quillbot|ngoại ngữ/i.test(hay(p)),
  khoahoc: p => hasCat(p, /khoá học|khóa học|coursera|udemy|skillshare|masterclass|datacamp|codecademy/i)
    || /coursera|udemy|skillshare|masterclass|datacamp|codecademy|khoá học|khóa học/i.test(hay(p)),
};
function productTypeKey(p){
  const leaf = (p.cats || []).map(c => String(c).trim())
    .filter(c => c && !/^(tài khoản|sản phẩm bán chạy|sản phẩm|uncategorized|chưa phân loại|tài khoản khác)$/i.test(c));
  if(leaf.length) return leaf[leaf.length - 1].toLowerCase();
  return String(p.id);
}
function pickDiverse(pool, limit){
  const out = [], seen = new Set();
  for(const p of pool){
    const key = productTypeKey(p);
    if(seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if(out.length >= limit) break;
  }
  return out;
}
function selling(p){ return p.inStock !== false && !(typeof p.stock === "number" && p.stock <= 0); }
const sell = s.RAW.filter(selling);
const ai = pickDiverse(sell.filter(CAT.ai), 10);
const lang = pickDiverse(sell.filter(CAT.ngoaingu), 8);
const course = pickDiverse(sell.filter(CAT.khoahoc), 8);
console.log("AI types:\n" + ai.map(p => productTypeKey(p) + " | " + p.name.slice(0,42)).join("\n"));
console.log("\nNgoai ngu:\n" + lang.map(p => productTypeKey(p) + " | " + p.name.slice(0,42)).join("\n"));
console.log("\nKhoa hoc:\n" + course.map(p => productTypeKey(p) + " | " + p.name.slice(0,42)).join("\n"));
console.log("\ncounts", {ai: ai.length, lang: lang.length, course: course.length});
