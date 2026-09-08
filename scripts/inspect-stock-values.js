const fs = require("fs");
const p = "C:/Users/Admin/Downloads/wc-product-export-5-9-2026-1788613389088.csv";
const text = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
function parseCSV(text){
  const rows = [];
  let row = [], cell = "", i = 0, inQ = false;
  while(i < text.length){
    const c = text[i];
    if(inQ){
      if(c === '"'){ if(text[i+1] === '"'){ cell += '"'; i += 2; continue; } inQ = false; i++; continue; }
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
const rows = parseCSV(text);
const header = rows[0];
const idx = Object.fromEntries(header.map((h,i)=>[h,i]));
const get = (r,k)=> idx[k]!=null ? (r[idx[k]]||"") : "";
let empty=0, filled=0, samples=[];
const dist={};
for(let i=1;i<rows.length;i++){
  const r=rows[i];
  if(get(r,"Đã xuất bản")!=="1") continue;
  const type=get(r,"Loại");
  if(!(type.startsWith("simple")||type==="variable")) continue;
  const stock=get(r,"Tồn kho");
  if(!stock) empty++; else { filled++; dist[stock]=(dist[stock]||0)+1; if(samples.length<15) samples.push({id:get(r,"ID"),name:get(r,"Tên").slice(0,40),stock,seller:get(r,"Meta: seller_name")||get(r,"Meta: g2g_seller")||get(r,"Meta: _g2g_seller_name")}); }
}
console.log({empty,filled,uniqueStocks:Object.keys(dist).length});
console.log("top stocks", Object.entries(dist).sort((a,b)=>b[1]-a[1]).slice(0,20));
console.log("samples", samples);
