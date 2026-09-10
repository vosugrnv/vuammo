const IMAGE_BY_NAME = {};
RAW_PRODUCTS.forEach(p => { IMAGE_BY_NAME[p.name] = p.image; });
function imageFor(name){ return IMAGE_BY_NAME[name] || RAW_PRODUCTS[0].image; }

function hay(p){ return (p.name + " " + (p.cats || []).join(" ")).toLowerCase(); }
function hasCat(p, re){ return (p.cats || []).some(c => re.test(String(c))); }

const BRAND_RE = /(chatgpt|claude|gemini|grok|midjourney|runway|kling|heygen|perplexity|cursor|copilot|openai|capcut|canva|figma|adobe|netflix|spotify|youtube|duolingo|elsa|busuu|memrise|babbel|grammarly|quillbot|coursera|udemy|skillshare|scribd|blinkist|kindle|vpn|proxy|nord|expressvpn|meitu|monica|vbee|elevenlabs|gamma|hailou|steam|tiktok|instagram|threads|office|jetbrains)/i;

const CAT = {
  ai: p => hasCat(p, /chatgpt|claude|gemini|grok|midjourney|runway|kling|heygen|perplexity|cursor|copilot|openai|monica|elevenlabs|gamma|hailou|google ultra|công cụ ai|\bai\b/i)
    || /chatgpt|claude|gemini|grok|midjourney|runway|kling|heygen|perplexity|cursor|copilot|openai|monica|elevenlabs|gamma|hailou|veo|gpt/i.test(hay(p)),
  giaitri: p => hasCat(p, /netflix|spotify|youtube|vieon|wetv|iqiyi|hbo|prime|fpt play|galaxy play|giải trí/i)
    || /netflix|spotify|youtube|vieon|wetv|iqiyi|hbo|prime|fpt play|galaxy play/i.test(hay(p)),
  ngoaingu: p => hasCat(p, /duolingo|elsa|busuu|memrise|babbel|grammarly|quillbot|ngoại ngữ/i)
    || /duolingo|elsa|busuu|memrise|babbel|grammarly|quillbot|ngoại ngữ/i.test(hay(p)),
  khoahoc: p => hasCat(p, /khoá học|khóa học|coursera|udemy|skillshare|masterclass|datacamp|codecademy/i)
    || /coursera|udemy|skillshare|masterclass|datacamp|codecademy|khoá học|khóa học/i.test(hay(p)),
  docsach: p => hasCat(p, /scribd|blinkist|kindle|đọc sách|wattpad/i)
    || /scribd|blinkist|kindle|đọc sách|wattpad/i.test(hay(p)),
  khac: p => !CAT.ai(p) && !CAT.giaitri(p) && !CAT.ngoaingu(p) && !CAT.khoahoc(p) && !CAT.docsach(p),
};

/** Key dùng để tránh trùng loại (CapCut + CapCut) trong cùng một mục */
function productTypeKey(p){
  const leaf = (p.cats || [])
    .map(c => String(c).trim())
    .filter(c => c && !/^(tài khoản|sản phẩm bán chạy|sản phẩm|uncategorized|chưa phân loại|tài khoản khác)$/i.test(c));
  if(leaf.length) return leaf[leaf.length - 1].toLowerCase();
  const m = String(p.name || "").match(BRAND_RE);
  if(m) return m[1].toLowerCase();
  return (typeof slugify === "function" ? slugify(p.name) : String(p.name || "").toLowerCase())
    .split("-").slice(0, 3).join("-") || String(p.id);
}

function scoreHome(p){
  let s = 0;
  if(p.rating >= 4) s += 40 + p.rating * 8;
  if(typeof p.stock === "number" && p.stock > 0) s += 15;
  if(p.regular > p.price) s += 12;
  if((p.cats || []).some(c => /bán chạy/i.test(c))) s += 25;
  return s;
}

/** Lấy sản phẩm CSV theo mục, ưu tiên điểm cao, mỗi loại chỉ 1 sản phẩm */
function pickDiverse(pool, limit){
  const sorted = [...pool].sort((a, b) => scoreHome(b) - scoreHome(a) || a.price - b.price);
  const out = [];
  const seen = new Set();
  for(const p of sorted){
    const key = productTypeKey(p);
    if(seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if(out.length >= limit) return out;
  }
  for(const p of sorted){
    if(out.includes(p)) continue;
    out.push(p);
    if(out.length >= limit) break;
  }
  return shuffleArray(out);
}

const REVIEWS = [
  {text:"Mua Canva Pro với Office 365 ở Vua MMO 2 lần, giá rẻ hơn ngoài 30%, giao acc nhanh 5p. Dùng ổn không lỗi, hỗ trợ chat rep liền. Giờ recommend bạn bè dùng.", name:"Nguyễn Văn Hùng", role:"Freelancer"},
  {text:"Lấy Grammarly với Netflix, acc xịn dùng mượt. Giá rẻ cho sinh viên, chat trực tiếp hướng dẫn kích hoạt nhanh. Tiết kiệm tiền, sẽ mua tiếp.", name:"Trần Anh Tuấn", role:"SV ĐH Kinh tế Quốc dân"},
  {text:"Dùng VPN + Google One hơn năm, nâng cấp mấy lần không vấn đề. Giá tốt, support kỹ thuật nhiệt tình. Chạy ads FB ngon hơn hẳn.", name:"Lê Đức Minh", role:"Chủ shop Ba Đình"},
  {text:"Dịch vụ uy tín, có bảo hành rõ ràng. Có lỗi là shop xử lý ngay, không vòng vo. Làm ăn đàng hoàng nên mình tin tưởng lâu dài.", name:"Phan Thị Huyền", role:"Chủ shop online"},
  {text:"Bên Vua MMO giao tài khoản nhanh, thanh toán xong 2-3 phút là có. Mình mua nhiều lần rồi, lần nào cũng ok.", name:"Đỗ Văn Nam", role:"Kinh doanh online"},
  {text:"Đã mua Google One và VPN để chạy ads, tốc độ ổn định, không lỗi vặt. Shop hỗ trợ đổi IP, xử lý nhanh khi có vấn đề. Dịch vụ đáng tiền.", name:"Nguyễn Quang Huy", role:"Ads Freelancer"},
  {text:"Lấy combo Netflix + Spotify dùng êm, không bị out acc. Hướng dẫn kích hoạt chi tiết, người không rành cũng làm được. Giá quá hợp lý cho sinh viên.", name:"Hoàng Minh Đức", role:"Sinh viên"},
  {text:"Acc Netflix 4K xem mượt, không bị out giữa chừng. Hướng dẫn chi tiết, mình làm theo là xong.", name:"Trương Hải Yến", role:"Nhân viên văn phòng"},
  {text:"Shop giao acc nhanh, thanh toán xong là nhận liền. Có bảo hành nên yên tâm dùng lâu dài.", name:"Nguyễn Văn Khải", role:"Kinh doanh"},
];

function productIsSelling(p){
  if(!p) return false;
  if(!p.id || !p.slug) return false;
  if(typeof isBlockedProduct === "function" && isBlockedProduct(p)) return false;
  if(p.inStock === false) return false;
  if(typeof p.stock === "number" && p.stock <= 0) return false;
  return true;
}

/** Cùng nguồn với trang Tất cả sản phẩm — chỉ SP đang bán, có đường dẫn SEO. */
function sellingPool(){
  return RAW_PRODUCTS.filter(productIsSelling);
}

const STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7-6.2-3.9-6.2 3.9 1.6-7L2 9.5l7.1-.6z"/></svg>';
function reviewCard(r){
  return `
  <div class="review-item">
    <div class="review-card">
      <div class="review-stars">${STAR_SVG.repeat(5)}</div>
      <p>${r.text}</p>
      <div class="review-who">${r.name}<span>${r.role}</span></div>
    </div>
  </div>`;
}

/* ---------- Hero slider ---------- */
(function initHeroSlider(){
  const root = document.getElementById("heroSlider");
  if(!root) return;
  const slides = [...root.querySelectorAll(".hero-slide")];
  const dotsWrap = document.getElementById("heroDots");
  const prevBtn = document.getElementById("heroPrev");
  const nextBtn = document.getElementById("heroNext");
  if(!slides.length) return;

  let index = 0;
  let timer = null;
  const INTERVAL = 5000;

  dotsWrap.innerHTML = slides.map((_,i)=>`<button type="button" aria-label="Slide ${i+1}" ${i===0?"class=\"active\"":""}></button>`).join("");
  const dots = [...dotsWrap.querySelectorAll("button")];

  function goTo(i){
    index = (i + slides.length) % slides.length;
    slides.forEach((s,n)=>s.classList.toggle("is-active", n===index));
    dots.forEach((d,n)=>d.classList.toggle("active", n===index));
  }
  function next(){ goTo(index+1); }
  function prev(){ goTo(index-1); }
  function start(){ stop(); timer = setInterval(next, INTERVAL); }
  function stop(){ if(timer) clearInterval(timer); timer = null; }

  nextBtn?.addEventListener("click", ()=>{ next(); start(); });
  prevBtn?.addEventListener("click", ()=>{ prev(); start(); });
  dots.forEach((d,i)=>d.addEventListener("click", ()=>{ goTo(i); start(); }));
  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  start();
})();

/* ---------- Render ---------- */
document.documentElement.classList.add("js-ready");
const HOME_QUICK = (() => {
  const pool = sellingPool().filter(p => typeof p.stock === "number" && p.stock > 0);
  return pickDiverse(pool.length ? pool : sellingPool(), 25);
})();

let quickExpanded = false;
function renderQuick(){
  const el = document.getElementById("quickPicks");
  if(!el) return;
  const items = quickExpanded ? HOME_QUICK : HOME_QUICK.slice(0,10);
  el.className = "card-grid";
  el.innerHTML = items.map(productCard).join("");
}
renderQuick();
document.getElementById("seeMoreBtn").textContent = `Xem thêm (${Math.max(0, HOME_QUICK.length-10)})`;
document.getElementById("seeMoreBtn").addEventListener("click", ()=>{
  quickExpanded = true;
  renderQuick();
});
document.getElementById("seeLessBtn").addEventListener("click", ()=>{
  quickExpanded = false;
  renderQuick();
  document.getElementById("quickPicks").scrollIntoView({behavior:"smooth", block:"start"});
});

const aiProducts = pickDiverse(sellingPool().filter(CAT.ai), 10);
document.getElementById("aiGrid").innerHTML = aiProducts.map(productCard).join("");

const bestList = pickDiverse(sellingPool(), 50);
const PAGE_SIZE = 10;
let currentPage = 1;
function renderBest(){
  const start = (currentPage-1)*PAGE_SIZE;
  const items = bestList.slice(start, start+PAGE_SIZE);
  document.getElementById("bestGrid").innerHTML = items.map(productCard).join("");
  renderPagination();
}
function renderPagination(){
  const totalPages = Math.max(1, Math.ceil(bestList.length/PAGE_SIZE));
  const el = document.getElementById("pagination");
  let html = "";
  const maxShown = 6;
  for(let i=1;i<=Math.min(maxShown,totalPages);i++){
    html += `<button class="${i===currentPage?"active":""}" onclick="goPage(${i})">${i}</button>`;
  }
  if(totalPages > maxShown){
    html += `<span>…</span>`;
    for(let i=totalPages-1;i<=totalPages;i++){
      html += `<button class="${i===currentPage?"active":""}" onclick="goPage(${i})">${i}</button>`;
    }
  }
  html += `<button onclick="goPage(${Math.min(currentPage+1,totalPages)})">→</button>`;
  el.innerHTML = html;
}
window.goPage = p => { currentPage = p; renderBest(); document.getElementById("bestseller").scrollIntoView({behavior:"smooth"}); };
renderBest();

function renderLearn(tab){
  const fn = CAT[tab] || CAT.khac;
  const items = pickDiverse(sellingPool().filter(fn), 8);
  document.getElementById("learnGrid").innerHTML = items.map(productCard).join("");
}
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    renderLearn(btn.dataset.tab);
  });
});
renderLearn("ngoaingu");

const reviewTrack = document.getElementById("reviewTrack");
const reviewDots = document.getElementById("reviewDots");
reviewTrack.innerHTML = REVIEWS.map(reviewCard).join("");
let reviewPage = 0;
function reviewItemsPerPage(){
  const w = window.innerWidth;
  if(w <= 699) return 1;
  if(w <= 1023) return 2;
  return 3;
}
function renderReviewDots(){
  const perPage = reviewItemsPerPage();
  const pages = Math.ceil(REVIEWS.length / perPage);
  if(reviewPage > pages-1) reviewPage = 0;
  reviewDots.innerHTML = Array.from({length:pages}, (_,i)=>
    `<button class="dot${i===reviewPage?" active":""}" data-page="${i}"><span></span></button>`
  ).join("");
  reviewTrack.style.transform = `translateX(-${reviewPage*100}%)`;
}
reviewDots.addEventListener("click", (e)=>{
  const btn = e.target.closest(".dot");
  if(!btn) return;
  reviewPage = parseInt(btn.dataset.page, 10);
  renderReviewDots();
});
renderReviewDots();
window.addEventListener("resize", renderReviewDots);
function reviewPageCount(){ return Math.ceil(REVIEWS.length / reviewItemsPerPage()); }
document.getElementById("reviewPrev").addEventListener("click", ()=>{
  const pages = reviewPageCount();
  reviewPage = (reviewPage - 1 + pages) % pages;
  renderReviewDots();
});
document.getElementById("reviewNext").addEventListener("click", ()=>{
  const pages = reviewPageCount();
  reviewPage = (reviewPage + 1) % pages;
  renderReviewDots();
});

/* ---------- Interactions ---------- */
window.toggleWish = (btn) => {
  if (!btn) return;
  const item = {
    id: btn.dataset.wishId || btn.getAttribute("data-wish-id"),
    name: btn.dataset.wishName || "",
    price: Number(btn.dataset.wishPrice || 0),
    regular: btn.dataset.wishRegular ? Number(btn.dataset.wishRegular) : null,
    image: btn.dataset.wishImage || "",
    seller: btn.dataset.wishSeller || "",
    rating: btn.dataset.wishRating ? Number(btn.dataset.wishRating) : 0
  };
  if (!item.id) return;

  if (!window.WishStore) {
    const KEY = "vuammo_wish_v1";
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (!Array.isArray(list)) list = [];
    } catch (_) {
      list = [];
    }
    const id = String(item.id);
    const exists = list.some((x) => String(x.id) === id);
    if (exists) list = list.filter((x) => String(x.id) !== id);
    else {
      list.unshift({
        id,
        name: item.name || "Sản phẩm",
        price: Number(item.price || 0),
        regular: item.regular != null ? Number(item.regular) : null,
        image: item.image || "",
        seller: item.seller || "",
        rating: item.rating || 0
      });
    }
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
    btn.classList.toggle("active", !exists);
    ["wishBadge", "wishBadgeTop"].forEach((idEl) => {
      const badge = document.getElementById(idEl);
      if (badge) badge.textContent = String(list.length);
    });
    showToast(!exists ? "Đã thêm vào wishlist" : "Đã bỏ khỏi wishlist");
    return;
  }

  const on = WishStore.toggle(item);
  btn.classList.toggle("active", on);
  showToast(on ? "Đã thêm vào wishlist" : "Đã bỏ khỏi wishlist");
};

/* addToCart provided by cart-page.js / CartStore when loaded */

let toastTimer;
window.showToast = function showToast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("show"), 2200);
};

/* ---------- Drawer menu ---------- */
const drawer = document.getElementById("drawer");
const backdrop = document.getElementById("drawerBackdrop");
function closeDrawer(){ drawer.classList.remove("open"); backdrop.classList.remove("open"); }
document.getElementById("menuBtn").addEventListener("click", ()=>{
  drawer.classList.add("open");
  backdrop.classList.add("open");
});
backdrop.addEventListener("click", closeDrawer);
drawer.querySelectorAll("a").forEach(a=>a.addEventListener("click", closeDrawer));
document.getElementById("catMenuBtn").addEventListener("click", ()=>{
  drawer.classList.add("open");
  backdrop.classList.add("open");
});
document.getElementById("sideNavToggle")?.addEventListener("click", ()=>{
  drawer.classList.add("open");
  backdrop.classList.add("open");
});

/* ---------- Info block collapse ---------- */
const infoCollapsible = document.getElementById("infoCollapsible");
const infoToggleBtn = document.getElementById("infoToggleBtn");
infoToggleBtn?.addEventListener("click", ()=>{
  const collapsed = infoCollapsible.classList.toggle("collapsed");
  infoToggleBtn.innerHTML = collapsed ? `XEM THÊM <span>↓</span>` : `THU GỌN <span>↑</span>`;
  if(collapsed) infoToggleBtn.scrollIntoView({behavior:"smooth", block:"center"});
});

