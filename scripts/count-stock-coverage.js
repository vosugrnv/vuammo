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
function num(v){ if(v==null||v==="") return null; const n=Number(String(v).replace(/[^\d.-]/g,"")); return Number.isFinite(n)?n:null; }
const rows = parseCSV(text);
const header = rows[0];
const idx = Object.fromEntries(header.map((h,i)=>[h,i]));
const get = (r,k)=> idx[k]!=null ? (r[idx[k]]||"") : "";
const varStock = new Map();
const varHas = new Map();
for(let i=1;i<rows.length;i++){
  const r=rows[i];
  if(!get(r,"Loại").includes("variation")) continue;
  const m=get(r,"Cha").match(/(\d+)/); if(!m) continue;
  const pid=m[1];
  const n=num(get(r,"Tồn kho"));
  if(n==null) continue;
  varHas.set(pid,true);
  varStock.set(pid,(varStock.get(pid)||0)+Math.max(0,n));
}
let withStock=0, inStockNoQty=0, out=0, published=0;
for(let i=1;i<rows.length;i++){
  const r=rows[i];
  if(get(r,"Đã xuất bản")!=="1") continue;
  const type=get(r,"Loại");
  if(!(type.startsWith("simple")||type==="variable")) continue;
  published++;
  const id=get(r,"ID");
  let stock = num(get(r,"Tồn kho"));
  if(stock==null && varHas.get(id)) stock = varStock.get(id)||0;
  const avail = get(r,"Còn hàng?")==="1";
  if(stock!=null && stock>0) withStock++;
  else if(avail) inStockNoQty++;
  else out++;
}
console.log({published,withStock,inStockNoQty,out});
