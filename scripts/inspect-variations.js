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
console.log("Attr/variation headers:");
header.forEach((h,i)=>{ if(/thuộc|attr|pa_|variation|biến|tên thuộc|giá trị/i.test(h)) console.log(i,h); });

// sample variations for product 369
let n=0;
for(let i=1;i<rows.length && n<8;i++){
  const r=rows[i];
  if(!get(r,"Loại").includes("variation")) continue;
  const m=get(r,"Cha").match(/(\d+)/);
  if(!m || m[1]!=="369") continue;
  const attrs=[];
  header.forEach(h=>{
    if(/Tên thuộc tính|Giá trị thuộc tính/i.test(h) && get(r,h)) attrs.push(h+"="+get(r,h));
  });
  console.log({
    id:get(r,"ID"),
    name:get(r,"Tên").slice(0,80),
    sale:get(r,"Giá khuyến mãi"),
    regular:get(r,"Giá thông thường"),
    stock:get(r,"Tồn kho"),
    attrs
  });
  n++;
}

// count how many attribute name columns
const nameCols = header.filter(h=>/^Tên thuộc tính/i.test(h));
const valCols = header.filter(h=>/^Giá trị thuộc tính/i.test(h));
console.log("nameCols", nameCols);
console.log("valCols", valCols.slice(0,10));
