/* Tất cả sản phẩm — 3 danh mục cha + toàn bộ danh mục con (leaf CSV) */
/* productTypeLabels / GENERIC_CAT: js/category-labels.js */

const SHARED_INTRO_HTML = `
  <h2>Tài khoản AI là gì?</h2>
  <p>Tài khoản AI là các gói truy cập phần mềm hoặc dịch vụ trí tuệ nhân tạo (ChatGPT, Claude, Gemini, Midjourney, CapCut…), thường được giao dưới dạng đăng nhập, nâng cấp chính chủ hoặc chia sẻ theo cam kết của từng gian hàng. Bạn dùng để viết content, thiết kế, chỉnh video, nghiên cứu hoặc hỗ trợ công việc mà không cần đăng ký gói gốc với giá cao.</p>
  <h2>Tại sao nên mua hàng trên Vua MMO</h2>
  <p>Vua MMO là sàn kết nối nhiều người bán sản phẩm số: so sánh giá nhanh, thanh toán trên hệ thống, giao nhận qua đơn hàng và theo dõi trạng thái rõ ràng. Mọi trao đổi bảo hành nên thực hiện trên đơn để được hỗ trợ đúng quy trình.</p>
  <p>Mỗi gian hàng có giá và chính sách bảo hành riêng. Đọc mô tả trước khi đặt đơn; yêu cầu bảo hành trên sàn để được bảo vệ.</p>
`;

const SHARED_FAQS = [
  {
    q: "Cách đặt hàng trên Vua MMO như thế nào?",
    a: "Chọn sản phẩm → chọn gói phù hợp → nhấn mua/thanh toán trên trang. Sau khi thanh toán thành công, theo dõi đơn hàng và nhận thông tin bàn giao theo hướng dẫn của shop (thường qua email hoặc tin nhắn trên đơn)."
  },
  {
    q: "Sau khi thanh toán bao lâu thì nhận được tài khoản?",
    a: "Phần lớn đơn được giao trong vài phút đến vài giờ tùy shop và loại gói. Thời gian cụ thể ghi trong mô tả sản phẩm; nếu quá hạn cam kết, hãy nhắn shop trên đơn hàng."
  },
  {
    q: "Đơn hàng có vấn đề thì phải làm sao?",
    a: "Liên hệ trực tiếp shop trên đơn hàng để được hỗ trợ bảo hành hoặc đổi/cấp lại theo chính sách đã công bố. Ưu tiên xử lý trên sàn, không chuyển giao dịch ra ngoài để tránh mất bảo vệ."
  },
  {
    q: "Bảo hành được tính thế nào?",
    a: "Mỗi gian hàng tự quy định thời hạn và điều kiện bảo hành trên trang sản phẩm. Đọc kỹ trước khi mua; khi lỗi phát sinh trong hạn, mở yêu cầu bảo hành trên đơn và cung cấp bằng chứng theo hướng dẫn shop."
  },
  {
    q: "Làm sao gửi đánh giá sau khi mua?",
    a: "Vào mục đơn hàng đã hoàn tất, chọn sản phẩm và gửi đánh giá theo số sao kèm nhận xét. Đánh giá trung thực giúp người mua khác tham khảo và giúp shop cải thiện dịch vụ."
  },
  {
    q: "Có thể hủy đơn hoặc hoàn tiền không?",
    a: "Tùy trạng thái đơn và chính sách shop. Nếu chưa nhận hàng hoặc hàng không đúng mô tả, liên hệ shop trên đơn ngay; trường hợp không thống nhất được, dùng kênh hỗ trợ/khiếu nại trên sàn theo quy trình Vua MMO."
  }
];

function leafIntro(title){
  return `
      <h2>Tài khoản AI là gì?</h2>
      <p>Tài khoản AI / sản phẩm số thuộc nhóm <strong>${title}</strong> là các gói truy cập phần mềm hoặc dịch vụ số do gian hàng cung cấp trên Vua MMO — giao nhận theo cam kết trên trang sản phẩm (đăng nhập, nâng cấp chính chủ, key kích hoạt…).</p>
      <h2>Tại sao nên mua hàng trên Vua MMO</h2>
      <p>Mua ${title} trên Vua MMO giúp bạn so sánh nhiều shop, thanh toán an toàn trên sàn và yêu cầu hỗ trợ ngay trên đơn hàng khi cần.</p>
      <p>Mỗi gian hàng có giá và chính sách bảo hành riêng. Đọc mô tả trước khi đặt đơn; yêu cầu bảo hành trên sàn để được bảo vệ.</p>
    `;
}

function parentIntro(title, note){
  return `
      <h2>${title}</h2>
      <p>${note || `Danh mục ${title} trên Vua MMO gom các sản phẩm số liên quan để bạn lọc nhanh theo nhu cầu.`}</p>
      <p>Chọn danh mục con bên trái (CapCut, ChatGPT, Netflix…) hoặc xem toàn bộ sản phẩm trong nhóm này. So sánh giá nhiều shop, thanh toán trên sàn và yêu cầu bảo hành trên đơn hàng.</p>
      <h2>Tại sao nên mua hàng trên Vua MMO</h2>
      <p>Vua MMO kết nối nhiều người bán: giá rõ, giao nhận theo cam kết từng gian hàng, hỗ trợ trên đơn để được bảo vệ.</p>
    `;
}

function buildLeafCounts(){
  const counts = new Map();
  for(const p of RAW_PRODUCTS){
    const seen = new Set();
    for(const label of productTypeLabels(p)){
      const key = label.toLowerCase();
      if(seen.has(key)) continue;
      seen.add(key);
      const cur = counts.get(key) || { title: label, count: 0 };
      cur.count += 1;
      if(label.length < cur.title.length) cur.title = label;
      counts.set(key, cur);
    }
  }
  return counts;
}

function buildCatalog(){
  const counts = buildLeafCounts();
  const tax = (typeof CATEGORY_TAXONOMY !== "undefined" && CATEGORY_TAXONOMY.parents) || [];
  const catalogBySlug = new Map();
  const navTree = [];
  const claimedKeys = new Set();

  const all = {
    slug: "all",
    kind: "all",
    title: "Tất cả sản phẩm",
    match: () => true,
    count: RAW_PRODUCTS.length,
    introHtml: SHARED_INTRO_HTML,
    faqs: SHARED_FAQS
  };
  catalogBySlug.set("all", all);

  // Tránh trùng slug cha/con (game, khoa-hoc…)
  const CHILD_SLUG_ALIASES = {
    "game::game": "tai-khoan-game",
    "khoa-hoc::khoa-hoc": "khoa-hoc-tong-hop"
  };

  const parentDrafts = tax.map(parent => {
    const childEntries = [];
    const childKeys = new Set();

    for(const child of parent.children){
      const key = child.title.toLowerCase();
      const info = counts.get(key);
      const title = info ? info.title : child.title;
      let slug = child.slug || slugify(title) || key.replace(/\s+/g, "-");
      const alias = CHILD_SLUG_ALIASES[`${parent.slug}::${slug}`];
      if(alias) slug = alias;
      if(slug === parent.slug) slug = `${slug}-con`;

      claimedKeys.add(key);
      childKeys.add(key);

      const count = info ? info.count : 0;
      const entry = {
        slug,
        kind: "child",
        parentSlug: parent.slug,
        parentTitle: parent.title,
        title,
        count,
        match: p => productTypeLabels(p).some(l => l.toLowerCase() === key),
        introHtml: leafIntro(title),
        faqs: SHARED_FAQS
      };
      childEntries.push(entry);
    }

    return { parent, childEntries, childKeys };
  });

  // Leaf CSV chưa nằm trong taxonomy → bổ sung vào cha Tài khoản & Công cụ AI
  const aiDraft = parentDrafts.find(d => d.parent.slug === "tai-khoan-cong-cu-ai");
  if(aiDraft){
    for(const [key, info] of counts.entries()){
      if(claimedKeys.has(key)) continue;
      claimedKeys.add(key);
      aiDraft.childKeys.add(key);
      let slug = slugify(info.title) || key.replace(/\s+/g, "-");
      if(slug === aiDraft.parent.slug) slug = `${slug}-con`;
      aiDraft.childEntries.push({
        slug,
        kind: "child",
        parentSlug: aiDraft.parent.slug,
        parentTitle: aiDraft.parent.title,
        title: info.title,
        count: info.count,
        match: p => productTypeLabels(p).some(l => l.toLowerCase() === key),
        introHtml: leafIntro(info.title),
        faqs: SHARED_FAQS
      });
    }
  }

  for(const draft of parentDrafts){
    const { parent, childEntries, childKeys } = draft;
    childEntries.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "vi"));

    for(const entry of childEntries){
      if(entry.count <= 0) continue;
      if(!catalogBySlug.has(entry.slug)) catalogBySlug.set(entry.slug, entry);
    }

    const parentEntry = {
      slug: parent.slug,
      kind: "parent",
      title: parent.title,
      seoTitle: parent.seoTitle,
      count: RAW_PRODUCTS.filter(p =>
        productTypeLabels(p).some(l => childKeys.has(l.toLowerCase()))
      ).length,
      match: p => productTypeLabels(p).some(l => childKeys.has(l.toLowerCase())),
      introHtml: parentIntro(parent.title, parent.note),
      faqs: SHARED_FAQS
    };
    catalogBySlug.set(parent.slug, parentEntry);

    navTree.push({
      parent: parentEntry,
      children: childEntries.filter(c => c.count > 0)
    });
  }

  return {
    all,
    bySlug: catalogBySlug,
    navTree,
    find(slug){ return catalogBySlug.get(slug) || all; }
  };
}

const CATALOG = buildCatalog();

const REVIEW_NAMES = [
  "Nguyễn Minh Anh","Trần Hoàng Long","Lê Thu Hà","Phạm Đức Huy","Hoàng Nhật Nam",
  "Vũ Thanh Trúc","Đỗ Quang Vinh","Bùi Mỹ Linh","Ngô Hải Đăng","Phan Khánh Vy",
  "Đặng Gia Bảo","Lý Thuỳ Dương","Mai Anh Tuấn","Tô Bảo Ngọc","Chu Minh Khang"
];
const REVIEW_TEXTS = [
  "Đặt hàng xong vài phút là nhận tài khoản, shop hướng dẫn rõ ràng.",
  "Thanh toán trên sàn yên tâm hơn mua ngoài. Acc dùng ổn định.",
  "Có lỗi giữa kỳ, nhắn shop trên đơn là được đổi nhanh theo bảo hành.",
  "Giá tốt, mô tả đúng. Nên đọc kỹ gói trước khi chọn.",
  "Gửi đánh giá sau khi dùng 2 ngày — chất lượng ổn, sẽ mua lại.",
  "Hỗ trợ chat trên đơn nhiệt tình, kích hoạt không khó.",
  "Lần đầu mua hơi chờ nhưng cuối cùng nhận đủ đúng cam kết.",
  "So với đăng ký gốc thì tiết kiệm nhiều, dùng cho công việc ổn.",
  "Shop phản hồi bảo hành trong ngày, mình hài lòng.",
  "Quy trình đặt hàng đơn giản: chọn gói → thanh toán → nhận bàn giao."
];

function buildReviewsPool(){
  const list = [];
  for(let i = 0; i < 48; i++){
    const stars = i < 22 ? 5 : i < 34 ? 4 : i < 42 ? 3 : i < 46 ? 2 : 1;
    const day = 1 + (i % 28);
    const month = String(8 - Math.floor(i / 16)).padStart(2, "0");
    list.push({
      name: REVIEW_NAMES[i % REVIEW_NAMES.length],
      stars,
      date: `${String(day).padStart(2,"0")}-${month}-2026`,
      text: REVIEW_TEXTS[i % REVIEW_TEXTS.length]
    });
  }
  return list.sort((a, b) => b.stars - a.stars || b.date.localeCompare(a.date));
}

const ALL_LISTING_REVIEWS = buildReviewsPool();
const REVIEW_PAGE_SIZE = 5;
let reviewStarFilter = 0;
let reviewPage = 1;

const PAGE_SIZE = 15;
const params = new URLSearchParams(location.search);
let activeSlug = params.get("cat") || "all";
if(activeSlug === "khac") activeSlug = "tai-khoan-khac";
const searchQuery = (params.get("q") || "").trim();
if(!searchQuery && !CATALOG.bySlug.has(activeSlug)) activeSlug = "all";
if(searchQuery) activeSlug = "all";
let page = 1;
let sortMode = "popular";

function catalog(){ return CATALOG.find(activeSlug); }

function catHref(slug){
  return slug === "all" ? "tat-ca-san-pham.html" : `tat-ca-san-pham.html?cat=${slug}`;
}

function matchesSearch(p, q){
  if(!q) return true;
  const needle = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const hay = (p.name + " " + (p.cats || []).join(" ") + " " + (p.seller || ""))
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  return hay.includes(needle) || (typeof slugify === "function" && slugify(p.name).includes(slugify(q)));
}

function filteredProducts(){
  let list = RAW_PRODUCTS.filter(catalog().match);
  if(searchQuery) list = list.filter(p => matchesSearch(p, searchQuery));
  if(sortMode==="price-asc") list = [...list].sort((a,b)=>a.price-b.price);
  else if(sortMode==="price-desc") list = [...list].sort((a,b)=>b.price-a.price);
  else if(sortMode==="rating") list = [...list].sort((a,b)=>(b.rating||0)-(a.rating||0));
  else list = [...list].sort((a,b)=>(b.rating||0)-(a.rating||0) || a.price-b.price);
  return list;
}

function starsHtml(n){
  const full = Math.round(n);
  return "★".repeat(Math.min(5, Math.max(0, full))) + "☆".repeat(Math.max(0, 5 - full));
}

function filteredListingReviews(){
  if(!reviewStarFilter) return ALL_LISTING_REVIEWS.slice();
  return ALL_LISTING_REVIEWS.filter(r => r.stars === reviewStarFilter);
}

function renderFilters(){
  const el = document.getElementById("filterList");
  const active = catalog();
  const openParents = new Set();
  if(active.kind === "parent") openParents.add(active.slug);
  if(active.kind === "child" && active.parentSlug) openParents.add(active.parentSlug);
  if(active.kind === "all" || searchQuery){
    CATALOG.navTree.forEach(g => openParents.add(g.parent.slug));
  }

  let html = `
    <a href="${catHref("all")}"
       class="listing-filter-item listing-filter-all${activeSlug==="all" && !searchQuery?" is-active":""}">
      <span>Tất cả sản phẩm</span>
      <span class="listing-filter-arrow">›</span>
    </a>`;

  for(const group of CATALOG.navTree){
    const p = group.parent;
    const isOpen = openParents.has(p.slug);
    const parentActive = activeSlug === p.slug;
    html += `
      <div class="listing-filter-group${isOpen?" is-open":""}${parentActive?" is-parent-active":""}">
        <div class="listing-filter-parent-row">
          <a href="${catHref(p.slug)}"
             class="listing-filter-item listing-filter-parent${parentActive?" is-active":""}">
            <span>${p.title} <small>(${p.count})</small></span>
          </a>
          <button type="button" class="listing-filter-toggle" data-parent="${p.slug}"
                  aria-expanded="${isOpen?"true":"false"}" aria-label="Mở ${p.title}">
            <span class="listing-filter-chevron" aria-hidden="true"></span>
          </button>
        </div>
        <div class="listing-filter-children"${isOpen?"":' hidden'}>
          ${group.children.map(c => `
            <a href="${catHref(c.slug)}"
               class="listing-filter-item listing-filter-child${c.slug===activeSlug?" is-active":""}">
              <span>${c.title} <small>(${c.count})</small></span>
              <span class="listing-filter-arrow">›</span>
            </a>`).join("")}
        </div>
      </div>`;
  }

  el.innerHTML = html;
  el.querySelectorAll(".listing-filter-toggle").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const group = btn.closest(".listing-filter-group");
      if(!group) return;
      const open = group.classList.toggle("is-open");
      const kids = group.querySelector(".listing-filter-children");
      if(kids) kids.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
}

function renderProducts(){
  const items = filteredProducts();
  const totalPages = Math.max(1, Math.ceil(items.length/PAGE_SIZE));
  if(page > totalPages) page = totalPages;
  const slice = items.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const grid = document.getElementById("productGrid");
  grid.className = "card-grid listing-card-grid";
  grid.innerHTML = slice.length
    ? slice.map(productCard).join("")
    : `<div class="category-empty">Không có sản phẩm trong bộ lọc này.</div>`;
  document.getElementById("resultCount").textContent = `${items.length} sản phẩm`;

  const pag = document.getElementById("pagination");
  let html = "";
  if(totalPages > 1){
    html += `<button type="button" ${page<=1?"disabled":""} data-page="${page-1}">‹</button>`;
    const maxShown = 7;
    let start = Math.max(1, page - Math.floor(maxShown/2));
    let end = Math.min(totalPages, start + maxShown - 1);
    start = Math.max(1, end - maxShown + 1);
    for(let i=start;i<=end;i++){
      html += `<button type="button" class="${i===page?"active":""}" data-page="${i}">${i}</button>`;
    }
    if(end < totalPages) html += `<span>…</span><button type="button" data-page="${totalPages}">${totalPages}</button>`;
    html += `<button type="button" ${page>=totalPages?"disabled":""} data-page="${page+1}">›</button>`;
  }
  pag.innerHTML = html;
  pag.querySelectorAll("button[data-page]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const p = parseInt(btn.dataset.page,10);
      if(!p || p===page) return;
      page = p;
      renderProducts();
      document.querySelector(".listing-main")?.scrollIntoView({behavior:"smooth", block:"start"});
    });
  });
}

function renderReviewPagination(totalPages){
  const pag = document.getElementById("reviewPagination");
  if(!pag) return;
  if(totalPages <= 1){ pag.innerHTML = ""; return; }
  let html = "";
  html += `<button type="button" ${reviewPage<=1?"disabled":""} data-rpage="${reviewPage-1}">‹</button>`;
  const maxShown = 7;
  let start = Math.max(1, reviewPage - Math.floor(maxShown/2));
  let end = Math.min(totalPages, start + maxShown - 1);
  start = Math.max(1, end - maxShown + 1);
  if(start > 1){
    html += `<button type="button" data-rpage="1">1</button>`;
    if(start > 2) html += `<span>…</span>`;
  }
  for(let i=start;i<=end;i++){
    html += `<button type="button" class="${i===reviewPage?"active":""}" data-rpage="${i}">${i}</button>`;
  }
  if(end < totalPages){
    if(end < totalPages - 1) html += `<span>…</span>`;
    html += `<button type="button" data-rpage="${totalPages}">${totalPages}</button>`;
  }
  html += `<button type="button" ${reviewPage>=totalPages?"disabled":""} data-rpage="${reviewPage+1}">›</button>`;
  pag.innerHTML = html;
  pag.querySelectorAll("button[data-rpage]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const p = parseInt(btn.dataset.rpage,10);
      if(!p || p===reviewPage) return;
      reviewPage = p;
      renderReviews();
      document.getElementById("reviewsSection")?.scrollIntoView({behavior:"smooth", block:"start"});
    });
  });
}

function renderReviews(){
  const items = filteredListingReviews();
  const totalPages = Math.max(1, Math.ceil(items.length / REVIEW_PAGE_SIZE));
  if(reviewPage > totalPages) reviewPage = totalPages;
  const slice = items.slice((reviewPage - 1) * REVIEW_PAGE_SIZE, reviewPage * REVIEW_PAGE_SIZE);

  const avg = (
    ALL_LISTING_REVIEWS.reduce((s, r) => s + r.stars, 0) / ALL_LISTING_REVIEWS.length
  ).toFixed(1).replace(".", ",");

  document.getElementById("reviewsHeading").textContent = "Đánh giá từ khách hàng";
  document.getElementById("reviewsSummary").innerHTML =
    `<span class="stars">★★★★★</span> <strong>${avg}/5</strong> · ${ALL_LISTING_REVIEWS.length.toLocaleString("vi-VN")} đánh giá`;

  const filtersEl = document.getElementById("reviewFilters");
  filtersEl.innerHTML = [0, 5, 4, 3, 2, 1].map(star => {
    const count = star === 0
      ? ALL_LISTING_REVIEWS.length
      : ALL_LISTING_REVIEWS.filter(r => r.stars === star).length;
    if(star !== 0 && count === 0) return "";
    const label = star === 0 ? "Tất cả" : `${star} sao`;
    const active = reviewStarFilter === star ? " is-active" : "";
    return `<button type="button" class="review-filter-btn${active}" data-star="${star}">${label} <span>(${count})</span></button>`;
  }).join("");

  filtersEl.querySelectorAll(".review-filter-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      reviewStarFilter = parseInt(btn.dataset.star, 10) || 0;
      reviewPage = 1;
      renderReviews();
    });
  });

  document.getElementById("reviewsList").innerHTML = slice.length
    ? slice.map(r => `
      <article class="listing-review-card">
        <div class="listing-review-head">
          <span class="listing-review-stars">${starsHtml(r.stars)} <strong>${r.name}</strong></span>
          <span class="listing-review-date">${r.date}</span>
        </div>
        <p>${r.text}</p>
      </article>`).join("")
    : `<p class="listing-reviews-empty">Không có đánh giá phù hợp bộ lọc.</p>`;

  renderReviewPagination(totalPages);
}

function renderIntroFaqReviews(){
  const c = catalog();
  const title = searchQuery
    ? `Kết quả cho “${searchQuery}”`
    : c.title;
  document.getElementById("pageTitle").textContent = title;
  if(searchQuery) document.title = `${title} | Vua MMO`;
  else if(c.kind === "parent" && c.seoTitle) document.title = c.seoTitle;
  else if(c.kind === "child") document.title = `Mua ${c.title} giá rẻ | Vua MMO`;
  else document.title = `${title} | Vua MMO`;

  let crumb = `<a href="index.html">Trang chủ</a><span class="sep">›</span>`;
  if(searchQuery){
    crumb += `<a href="tat-ca-san-pham.html">Tất cả sản phẩm</a><span class="sep">›</span><span class="current">${title}</span>`;
  } else if(c.slug === "all"){
    crumb += `<span class="current">Tất cả sản phẩm</span>`;
  } else if(c.kind === "parent"){
    crumb += `<a href="tat-ca-san-pham.html">Tất cả sản phẩm</a><span class="sep">›</span><span class="current">${c.title}</span>`;
  } else {
    crumb += `<a href="tat-ca-san-pham.html">Tất cả sản phẩm</a><span class="sep">›</span>`;
    if(c.parentSlug){
      crumb += `<a href="${catHref(c.parentSlug)}">${c.parentTitle || "Danh mục"}</a><span class="sep">›</span>`;
    }
    crumb += `<span class="current">${c.title}</span>`;
  }
  document.getElementById("breadcrumb").innerHTML = crumb;

  document.getElementById("introBody").innerHTML = c.introHtml;

  document.getElementById("faqList").innerHTML = c.faqs.map(f=>`
    <div class="listing-faq-item">
      <h3>${f.q}</h3>
      <p>${f.a}</p>
    </div>`).join("");

  reviewStarFilter = 0;
  reviewPage = 1;
  renderReviews();
}

function init(){
  renderFilters();
  renderIntroFaqReviews();
  renderProducts();
  document.getElementById("sortSelect")?.addEventListener("change", e=>{
    sortMode = e.target.value;
    page = 1;
    renderProducts();
  });
}

init();
