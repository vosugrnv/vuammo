const fs=require("fs");const path=require("path");
function walk(dir,out=[]){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(["node_modules",".git","api","vuammo-api"].includes(ent.name))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p,out);else if(ent.name.endsWith(".html"))out.push(p);}return out;}
let missingContact=0, missingNap=0, missingHeader=0, hasFooterFaqs=0, stillPolicyDrop=0;
const samples=[];
for(const f of walk(".")){
  const t=fs.readFileSync(f,"utf8");
  if(!t.includes('class="nav-links"')) continue;
  const m=t.match(/<nav class="nav-links">([\s\S]*?)<\/nav>/);
  if(!m){ missingHeader++; continue; }
  const nav=m[1];
  if(!/lien-he\.html/.test(nav)){ missingContact++; if(samples.length<8) samples.push("no-contact "+f); }
  if(!/nap-tien\.html/.test(nav)){ missingNap++; }
  if(/nav-links-drop-btn[\s\S]{0,400}Chính sách/.test(nav)) stillPolicyDrop++;
  if(/faqs\.html">FAQs/.test(t) && /footer-heading">Giới thiệu/.test(t)) hasFooterFaqs++;
}
console.log({missingContact, missingNap, missingHeader, stillPolicyDrop, hasFooterFaqs, samples});
