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

// find product with 2 attrs
let found=0;
for(let i=1;i<rows.length && found<3;i++){
  const r=rows[i];
  if(!get(r,"Loại").includes("variation")) continue;
  if(get(r,"Tên thuộc tính 2") && get(r,"Giá trị thuộc tính 2")){
    console.log({
      parent:get(r,"Cha"),
      id:get(r,"ID"),
      a1:get(r,"Tên thuộc tính 1")+"="+get(r,"Giá trị thuộc tính 1"),
      a2:get(r,"Tên thuộc tính 2")+"="+get(r,"Giá trị thuộc tính 2"),
      price:get(r,"Giá khuyến mãi")||get(r,"Giá thông thường"),
      name:get(r,"Tên").slice(0,100)
    });
    found++;
  }
}

// attr name distribution on parents for published variables
const attrNames = {};
let vars=0;
for(let i=1;i<rows.length;i++){
  const r=rows[i];
  if(!get(r,"Loại").includes("variation")) continue;
  vars++;
  const n1=get(r,"Tên thuộc tính 1")||"(none)";
  attrNames[n1]=(attrNames[n1]||0)+1;
}
console.log("vars",vars,"attr1 names",attrNames);

// parent attribute defaults for 369
for(let i=1;i<rows.length;i++){
  const r=rows[i];
  if(get(r,"ID")==="369"){
    console.log("parent 369 attrs", {
      n1:get(r,"Tên thuộc tính 1"), v1:get(r,"Giá trị thuộc tính 1").slice(0,120),
      n2:get(r,"Tên thuộc tính 2"), v2:get(r,"Giá trị thuộc tính 2").slice(0,80)
    });
    break;
  }
}
