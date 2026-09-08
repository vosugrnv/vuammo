const fs = require("fs");
const p = process.argv[2] || "C:/Users/Admin/Downloads/wc-product-export-5-9-2026-1788613389088.csv";
const text = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
function parseCSV(text){
  const rows = [];
  let row = [], cell = "", i = 0, inQ = false;
  while(i < text.length){
    const c = text[i];
    if(inQ){
      if(c === '"'){
        if(text[i+1] === '"'){ cell += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
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
console.log("HEADERS matching stock/seller/qty:");
header.forEach((h,i)=>{
  if(/kho|stock|invent|seller|shop|vendor|quantity|số lượng|tồn|in_stock|stock_status|stock_quantity/i.test(h)){
    console.log(i, h);
  }
});
console.log("\nAll Meta headers (first 60):");
header.filter(h=>/^Meta:/i.test(h)).slice(0,60).forEach(h=>console.log(h));

const idx = Object.fromEntries(header.map((h,i)=>[h,i]));
const get = (r,k)=> idx[k]!=null ? (r[idx[k]]||"") : "";
let shown = 0;
for(let i=1;i<rows.length && shown<5;i++){
  const r = rows[i];
  if(get(r,"Đã xuất bản")!=="1") continue;
  const type = get(r,"Loại");
  if(!(type.startsWith("simple")||type==="variable")) continue;
  console.log("\nSample product", get(r,"ID"), get(r,"Tên").slice(0,50));
  ["Số lượng trong kho","Stock","In stock?","Meta: _stock","Meta: _stock_status","Meta: _manage_stock","Meta: seller_name","Meta: _seller_name","Meta: store_name","Meta: _wcfm_product_author"].forEach(k=>{
    if(idx[k]!=null) console.log(" ", k, "=", get(r,k));
  });
  // dump any header with stock in name values
  header.forEach(h=>{
    if(/stock|kho|seller|vendor|shop/i.test(h) && get(r,h)) console.log(" ", h, "=", String(get(r,h)).slice(0,80));
  });
  shown++;
}
