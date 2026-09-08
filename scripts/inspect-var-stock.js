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
console.log("stock-related headers:");
header.forEach(h=>{ if(/stock|kho|sold|quantity|status/i.test(h)) console.log(h); });

// variation stocks
let varWithStock=0, varEmpty=0, varSamples=[];
const parentStock = new Map();
for(let i=1;i<rows.length;i++){
  const r=rows[i];
  const type=get(r,"Loại");
  if(!type.includes("variation")) continue;
  const stock = get(r,"Tồn kho");
  const m = get(r,"Cha").match(/(\d+)/);
  if(!m) continue;
  const pid = m[1];
  const n = Number(String(stock).replace(/[^\d.-]/g,"")) || 0;
  if(stock!==""){ varWithStock++; parentStock.set(pid, (parentStock.get(pid)||0)+Math.max(0,n)); }
  else varEmpty++;
  if(varSamples.length<8 && stock!=="") varSamples.push({id:get(r,"ID"),parent:pid,stock,name:get(r,"Tên").slice(0,40)});
}
console.log({varWithStock,varEmpty,parentsWithStock:parentStock.size});
console.log("var samples", varSamples);
console.log("parent stock samples", [...parentStock.entries()].slice(0,10));

// seller_sold as proxy?
let soldFilled=0;
for(let i=1;i<Math.min(rows.length,5000);i++){
  const r=rows[i];
  if(get(r,"Đã xuất bản")!=="1") continue;
  if(get(r,"Meta: seller_sold") || get(r,"Meta: _seller_sold")) soldFilled++;
}
console.log("seller_sold filled among first published checks", soldFilled);

// check stock status columns
const statusKeys = header.filter(h=>/stock|kho|in stock|còn hàng/i.test(h));
console.log("status keys values sample for first published:");
let c=0;
for(let i=1;i<rows.length && c<3;i++){
  const r=rows[i];
  if(get(r,"Đã xuất bản")!=="1") continue;
  const type=get(r,"Loại");
  if(!(type.startsWith("simple")||type==="variable")) continue;
  console.log(get(r,"ID"), Object.fromEntries(statusKeys.map(k=>[k,get(r,k)])));
  c++;
}
