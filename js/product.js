/* Product detail — packages, description, FAQ, reviews, related, seller + SEO */
/* Danh mục: js/category-taxonomy.js + js/category-labels.js */

function categoryInfo(p){
  if(typeof resolveProductCategory === "function"){
    const path = resolveProductCategory(p);
    return {
      parentSlug: path.parent.slug,
      parentLabel: path.parent.title,
      slug: path.child.slug,
      label: path.child.title
    };
  }
  const leaf = (p.cats || []).filter(c => !/^tài khoản$/i.test(c) && !/^sản phẩm/i.test(c))[0];
  return {
    parentSlug: "tai-khoan-cong-cu-ai",
    parentLabel: "Tài khoản & Công cụ AI",
    slug: leaf ? slugify(leaf) : "tai-khoan-khac",
    label: leaf || "Tài Khoản Khác"
  };
}

const REVIEW_NAMES = [
  "Nguyễn Minh Anh","Trần Hoàng Long","Lê Thu Hà","Phạm Đức Huy","Hoàng Nhật Nam",
  "Vũ Thanh Trúc","Đỗ Quang Vinh","Bùi Mỹ Linh","Ngô Hải Đăng","Phan Khánh Vy"
];
const REVIEW_TEXTS = [
  "Giao tài khoản nhanh, dùng ổn định, chat hỗ trợ nhiệt tình.",
  "Giá tốt hơn mua ngoài, bảo hành rõ ràng nên yên tâm.",
  "Hướng dẫn kích hoạt dễ hiểu, người mới cũng làm được.",
  "Mua lần 2 rồi, chất lượng vẫn tốt như lần đầu.",
  "Thanh toán xong vài phút là nhận email, rất tiện.",
  "Shop uy tín, có lỗi được đổi nhanh trong thời hạn bảo hành."
];

const SHOP_POOL = [
  {name:"AccVIP Pro", city:"Hà Nội", district:"Cầu Giấy"},
  {name:"Digital Hub", city:"TP. Hồ Chí Minh", district:"Quận 1"},
  {name:"Key bản quyền 24h", city:"Đà Nẵng", district:"Hải Châu"},
  {name:"SoftGo", city:"Hà Nội", district:"Thanh Xuân"},
  {name:"MMO Fast", city:"TP. Hồ Chí Minh", district:"Bình Thạnh"},
  {name:"Premium Store", city:"Hải Phòng", district:"Lê Chân"},
  {name:"Tài khoản chuẩn", city:"Cần Thơ", district:"Ninh Kiều"},
  {name:"Cloud Tools", city:"Hà Nội", district:"Đống Đa"},
  {name:"Pro License VN", city:"TP. Hồ Chí Minh", district:"Tân Bình"},
  {name:"Acc chính chủ", city:"Huế", district:"TP. Huế"}
];

function sellerFor(p){
  const base = SHOP_POOL[(Number(p.id) || 0) % SHOP_POOL.length];
  if (typeof shopByToken === "function" && p.sellerToken) {
    const s = shopByToken(p.sellerToken);
    if (s) return Object.assign({}, s, { href: shopHref(s) });
  }
  if (typeof shopByName === "function" && p.seller) {
    const s = shopByName(p.seller);
    if (s) return Object.assign({}, s, { href: shopHref(s) });
  }
  if (p.seller) {
    const slug = p.sellerSlug || null;
    return {
      name: String(p.seller),
      city: base.city,
      district: base.district,
      href: slug ? "/" + slug : null,
      slug: slug,
      token: p.sellerToken || null
    };
  }
  return base;
}

function sellerHash(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function sellerSuccessRate(s) {
  const seed = sellerHash(s.token || s.name);
  return (92 + (seed % 700) / 100).toFixed(2).replace(".", ",") + "%";
}
function sellerLevel(s) {
  return 40 + ((Number(s.id) || 1) * 3 + sellerHash(s.name) % 40) % 60;
}
function sellerJoinText(s) {
  const seed = sellerHash(s.token || s.name);
  const day = String(1 + (seed % 28)).padStart(2, "0");
  const month = String(1 + (seed % 12)).padStart(2, "0");
  return day + " " + month + " " + (s.joinedYear || 2024);
}
function sellerAvatar(s) {
  if (typeof shopAvatarUrl === "function") return shopAvatarUrl(s);
  const raw = s.avatar || (s.slug ? ("/images/shops/" + s.slug + ".svg") : "/images/logo-vuammo.png");
  return typeof absAssetUrl === "function" ? absAssetUrl(raw) : raw;
}

let product = typeof resolveProductFromLocation === "function" ? resolveProductFromLocation() : null;
if (!product) {
  try {
    const ld = document.getElementById("productJsonLd");
    if (ld && typeof productById === "function") {
      const j = JSON.parse(ld.textContent || "{}");
      if (j && j.sku) product = productById(j.sku);
    }
  } catch (_) {}
}
if (!product || (typeof isBlockedProduct === "function" && isBlockedProduct(product))) {
  location.replace("/tat-ca-san-pham");
  throw new Error("product not found");
}
const cat = categoryInfo(product);
const seed = product.name.length * 137 + product.price;
const seller = sellerFor(product);
const shopName = seller.name;
const ratingNumBase = product.rating > 0 ? product.rating : 4.6;
let ratingNum = ratingNumBase;
let ratingVal = ratingNum.toFixed(1).replace(".", ",");
let reviewCount = 200 + (seed % 1800);
const soldCount = 500 + (seed % 12000);
const seoPath = productSeoPath(product);

const variants = (product.variants && product.variants.length)
  ? product.variants.slice()
  : [{
      id: product.id,
      label: "Gói tiêu chuẩn",
      price: product.price,
      regular: product.regular || product.price,
      ...(typeof product.stock === "number" ? { stock: product.stock } : {})
    }];
let selectedVariantId = variants[0].id;

function selectedVariant(){
  return variants.find(v => v.id === selectedVariantId) || variants[0];
}

function esc(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function absoluteUrl(){
  try { return new URL(seoPath, location.origin).href; }
  catch { return seoPath; }
}

function applySeo(){
  const title = product.name + " | Mua giá rẻ tại Vua MMO";
  const desc = "Mua " + product.name + " chính chủ tại Vua MMO. Giá từ " + money(product.price) + ", giao tài khoản 5–15 phút, bảo hành 1 đổi 1. Xem gói, đánh giá và FAQ.";
  document.title = title;

  const setMeta = (attr, key, content) => {
    let el = document.querySelector("meta[" + attr + '="' + key + '"]');
    if(!el){
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };
  setMeta("name", "description", desc);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", desc);
  setMeta("property", "og:type", "product");
  setMeta("property", "og:url", absoluteUrl());
  setMeta("property", "og:image", product.image);
  setMeta("name", "twitter:card", "summary_large_image");

  let link = document.querySelector('link[rel="canonical"]');
  if(!link){
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = absoluteUrl();

  let ld = document.getElementById("productJsonLd");
  if(!ld){
    ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = "productJsonLd";
    document.head.appendChild(ld);
  }
  const offerPrice = selectedVariant().price;
  ld.textContent = JSON.stringify({
    "@context":"https://schema.org",
    "@type":"Product",
    name: product.name,
    image: [product.image],
    description: desc,
    sku: String(product.id),
    brand: {"@type":"Brand", name:"Vua MMO"},
    category: cat.parentLabel + " > " + cat.label,
    offers: {
      "@type":"Offer",
      url: absoluteUrl(),
      priceCurrency:"VND",
      price: offerPrice,
      availability:"https://schema.org/InStock",
      seller: {"@type":"Organization", name: shopName}
    },
    aggregateRating: {
      "@type":"AggregateRating",
      ratingValue: ratingNum.toFixed(1),
      reviewCount: reviewCount,
      bestRating:"5",
      worstRating:"1"
    }
  });

  let bld = document.getElementById("breadcrumbJsonLd");
  if(!bld){
    bld = document.createElement("script");
    bld.type = "application/ld+json";
    bld.id = "breadcrumbJsonLd";
    document.head.appendChild(bld);
  }
  const origin = (() => { try { return location.origin; } catch { return ""; } })();
  const listingUrl = origin + "/tat-ca-san-pham";
  const parentPath = typeof categoryListingPath === "function"
    ? categoryListingPath(cat.parentSlug)
    : listingUrl + "/" + cat.parentSlug;
  const childPath = typeof categoryListingPath === "function"
    ? categoryListingPath(cat.parentSlug, cat.slug)
    : listingUrl + "/" + cat.parentSlug + "/" + cat.slug;
  bld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Tất cả sản phẩm", item: listingUrl },
      { "@type": "ListItem", position: 2, name: cat.parentLabel, item: origin + parentPath },
      { "@type": "ListItem", position: 3, name: cat.label, item: origin + childPath },
      { "@type": "ListItem", position: 4, name: product.name, item: absoluteUrl() }
    ]
  });

  if(location.protocol === "http:" || location.protocol === "https:"){
    const pathNow = String(location.pathname || "").replace(/\/+$/, "") || "/";
    const needCanonical =
      pathNow !== seoPath ||
      !!location.search ||
      /product\.html$/i.test(pathNow) ||
      /\/vi\//i.test(pathNow) ||
      /\.html$/i.test(pathNow) ||
      /^\/product$/i.test(pathNow);
    if(needCanonical){
      try { history.replaceState(null, "", seoPath); } catch(_){}
    }
  }
}

function currentPrice(){
  const v = selectedVariant();
  return { now: v.price, old: v.regular > v.price ? v.regular : 0 };
}

function updateStockLine(){
  const v = selectedVariant();
  const soldPct = 10 + (seed % 55);
  if(typeof v.stock === "number"){
    document.getElementById("prodStockLine").textContent =
      "Đã bán " + soldPct + "% · tồn kho: " + v.stock.toLocaleString("vi-VN");
  } else if(typeof product.stock === "number"){
    document.getElementById("prodStockLine").textContent =
      "Đã bán " + soldPct + "% · tồn kho: " + product.stock.toLocaleString("vi-VN");
  } else {
    document.getElementById("prodStockLine").textContent =
      "Đã bán " + soldPct + "% · Còn hàng";
  }
}

function updatePrice(){
  const {now, old} = currentPrice();
  document.getElementById("prodPriceNow").textContent = money(now);
  const oldEl = document.getElementById("prodPriceOld");
  if(old > now){
    oldEl.textContent = money(old);
    oldEl.hidden = false;
  } else {
    oldEl.hidden = true;
  }
  updateStockLine();
}

function renderVariants(){
  const labelEl = document.getElementById("variantGroupLabel");
  const wrap = document.getElementById("variantPills");
  if(!wrap) return;
  if(labelEl) labelEl.textContent = product.variantGroup || "Gói";

  wrap.innerHTML = variants.map(v => {
    const active = v.id === selectedVariantId ? " is-active" : "";
    return `<button type="button" class="variant-pill${active}" role="option" aria-selected="${v.id === selectedVariantId}" data-vid="${v.id}">` +
      `<span class="variant-pill-label">${esc(v.label)}</span>` +
      `<span class="variant-pill-price">${money(v.price)}</span>` +
      `</button>`;
  }).join("");

  wrap.querySelectorAll(".variant-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedVariantId = Number(btn.dataset.vid);
      wrap.querySelectorAll(".variant-pill").forEach(b => {
        const on = Number(b.dataset.vid) === selectedVariantId;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      updatePrice();
    });
  });
}

function faqItems(name){
  const prices = variants.map(v => v.price);
  const low = money(Math.min(...prices));
  const high = money(Math.max(...prices));
  const shop = shopName;
  return [
    {
      q: name + " của " + shop + " giao hàng như thế nào?",
      a: name + " do " + shop + " cung cấp hoàn toàn online trên Vua MMO. Bạn đặt mua trên trang sản phẩm và nhận thông tin tài khoản qua hệ thống sau khi thanh toán thành công (thường trong vài phút)."
    },
    {
      q: "Giá " + name + " tại " + shop + " là bao nhiêu?",
      a: "Giá " + name + " tại " + shop + " từ " + low + (low !== high ? (" đến " + high) : "") + " tùy biến thể/gói trên trang sản phẩm. Chọn đúng gói trước khi thanh toán."
    },
    {
      q: name + " của " + shop + " có bao nhiêu đánh giá?",
      a: name + " đang bán bởi " + shop + " hiện có " + reviewCount.toLocaleString("vi-VN") + " đánh giá từ khách hàng với điểm trung bình " + ratingVal + "/5. Bạn có thể xem chi tiết các đánh giá bên dưới."
    },
    {
      q: "Mua " + name + " từ " + shop + " có được bảo hành không?",
      a: "Có. " + shop + " cam kết bảo hành 1 đổi 1 " + name + " trong suốt thời hạn gói đã mua. Nếu tài khoản lỗi do phía cung cấp, shop hỗ trợ cấp lại hoặc hoàn tiền theo chính sách ghi trên sản phẩm."
    },
    {
      q: "Thanh toán " + name + " với " + shop + " bằng cách nào?",
      a: "Bạn thanh toán đơn hàng của " + shop + " bằng chuyển khoản ngân hàng (QR) hoặc số dư ví trên sàn. Sau khi xác nhận thanh toán, " + shop + " tự động bàn giao " + name + " kèm hướng dẫn kích hoạt qua email."
    }
  ];
}

function reviewItems(){
  const list = [];
  const total = Math.min(reviewCount, 60);
  for(let i = 0; i < total; i++){
    const roll = (seed + i * 17) % 100;
    let stars;
    if(roll < 62) stars = 5;
    else if(roll < 88) stars = 4;
    else if(roll < 96) stars = 3;
    else if(roll < 99) stars = 2;
    else stars = 1;
    list.push({
      name: REVIEW_NAMES[(seed + i) % REVIEW_NAMES.length],
      stars: stars,
      text: REVIEW_TEXTS[(seed + i * 3) % REVIEW_TEXTS.length],
      time: (1 + ((seed + i) % 60)) + " ngày trước"
    });
  }
  return list.sort(function(a, b){ return b.stars - a.stars; });
}

let ALL_REVIEWS = reviewItems();
const REVIEW_PAGE_SIZE = 5;
let reviewStarFilter = 0; /* 0 = all */
let reviewPage = 1;
let realReviewMeta = null; /* { count, average, items for JSON-LD } */

function formatReviewTime(iso){
  try {
    const d = new Date(iso);
    const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
    if(days <= 0) return "Hôm nay";
    if(days === 1) return "1 ngày trước";
    if(days < 60) return days + " ngày trước";
    return d.toLocaleDateString("vi-VN");
  } catch {
    return "";
  }
}

async function mergeVerifiedReviews(){
  if(!window.VuammoApi || !product || product.id == null) return;
  try {
    const data = await VuammoApi.api("/products/" + encodeURIComponent(product.id) + "/reviews?limit=30");
    if(!data || !data.count) return;
    realReviewMeta = data;
    const verified = (data.items || []).map(function(r){
      return {
        name: r.author || "Khách đã mua",
        stars: Number(r.rating) || 5,
        text: r.body || "",
        time: formatReviewTime(r.createdAt),
        verified: true
      };
    });
    ALL_REVIEWS = verified.concat(ALL_REVIEWS.filter(function(r){ return !r.verified; }));
    if(data.average > 0){
      ratingNum = Number(data.average);
      ratingVal = ratingNum.toFixed(1).replace(".", ",");
    }
    reviewCount = Math.max(reviewCount, data.count);
    try { applyProductSeo(); } catch(_){}
    injectReviewJsonLd(verified);
    renderReviews();
  } catch(_){ /* keep synthetic fallback */ }
}

function injectReviewJsonLd(verified){
  if(!verified || !verified.length) return;
  let el = document.getElementById("productReviewsJsonLd");
  if(!el){
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = "productReviewsJsonLd";
    document.head.appendChild(el);
  }
  const avg = realReviewMeta && realReviewMeta.average ? realReviewMeta.average : ratingNum;
  const count = realReviewMeta && realReviewMeta.count ? realReviewMeta.count : verified.length;
  el.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: String(product.id),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Number(avg).toFixed(1),
      reviewCount: count,
      bestRating: "5",
      worstRating: "1"
    },
    review: verified.slice(0, 10).map(function(r){
      return {
        "@type": "Review",
        author: { "@type": "Person", name: r.name },
        reviewRating: {
          "@type": "Rating",
          ratingValue: String(r.stars),
          bestRating: "5",
          worstRating: "1"
        },
        reviewBody: r.text
      };
    })
  });
}

function filteredReviews(){
  if(!reviewStarFilter) return ALL_REVIEWS.slice();
  return ALL_REVIEWS.filter(function(r){ return r.stars === reviewStarFilter; });
}

function starBar(n){
  return '<span class="stars">' + "★".repeat(n) + "☆".repeat(5 - n) + "</span>";
}

function renderReviewPagination(totalPages){
  if(totalPages <= 1) return "";
  let html = '<div class="pagination product-review-pagination">';
  html += '<button type="button" ' + (reviewPage <= 1 ? "disabled" : "") + ' data-rpage="' + (reviewPage - 1) + '">‹</button>';
  const maxShown = 7;
  let start = Math.max(1, reviewPage - Math.floor(maxShown / 2));
  let end = Math.min(totalPages, start + maxShown - 1);
  start = Math.max(1, end - maxShown + 1);
  if(start > 1){
    html += '<button type="button" data-rpage="1">1</button>';
    if(start > 2) html += "<span>…</span>";
  }
  for(let i = start; i <= end; i++){
    html += '<button type="button" class="' + (i === reviewPage ? "active" : "") + '" data-rpage="' + i + '">' + i + "</button>";
  }
  if(end < totalPages){
    if(end < totalPages - 1) html += "<span>…</span>";
    html += '<button type="button" data-rpage="' + totalPages + '">' + totalPages + "</button>";
  }
  html += '<button type="button" ' + (reviewPage >= totalPages ? "disabled" : "") + ' data-rpage="' + (reviewPage + 1) + '">›</button>';
  html += "</div>";
  return html;
}

function renderReviews(){
  const items = filteredReviews();
  const totalPages = Math.max(1, Math.ceil(items.length / REVIEW_PAGE_SIZE));
  if(reviewPage > totalPages) reviewPage = totalPages;
  const slice = items.slice((reviewPage - 1) * REVIEW_PAGE_SIZE, reviewPage * REVIEW_PAGE_SIZE);

  const filters = [0, 5, 4, 3, 2, 1].map(function(star){
    const count = star === 0
      ? ALL_REVIEWS.length
      : ALL_REVIEWS.filter(function(r){ return r.stars === star; }).length;
    if(star !== 0 && count === 0) return "";
    const label = star === 0 ? "Tất cả" : (star + " sao");
    const active = reviewStarFilter === star ? " is-active" : "";
    return '<button type="button" class="review-filter-btn' + active + '" data-star="' + star + '">' +
      label + ' <span>(' + count + ")</span></button>";
  }).join("");

  const listHtml = slice.length
    ? slice.map(function(r){
        return '<article class="product-review-item"' + (r.verified ? ' data-verified="1"' : "") + '><header><strong>' + esc(r.name) +
          "</strong>" + starBar(r.stars) +
          (r.verified ? '<span class="review-verified">Đã mua</span>' : "") +
          "<time>" + esc(r.time) + "</time></header><p>" + esc(r.text) + "</p></article>";
      }).join("")
    : '<p class="product-reviews-empty">Không có đánh giá phù hợp bộ lọc.</p>';

  document.getElementById("prodReviews").innerHTML =
    "<h2>Đánh giá từ khách hàng</h2>" +
    '<p class="product-reviews-summary"><span class="stars">★★★★★</span> <strong>' + ratingVal +
    "/5</strong> · " + reviewCount.toLocaleString("vi-VN") + " đánh giá</p>" +
    '<div class="product-review-filters" role="group" aria-label="Lọc theo sao">' + filters + "</div>" +
    '<div class="product-review-list">' + listHtml + "</div>" +
    renderReviewPagination(totalPages);

  document.querySelectorAll(".review-filter-btn").forEach(function(btn){
    btn.addEventListener("click", function(){
      reviewStarFilter = parseInt(btn.dataset.star, 10) || 0;
      reviewPage = 1;
      renderReviews();
    });
  });
  document.querySelectorAll(".product-review-pagination button[data-rpage]").forEach(function(btn){
    btn.addEventListener("click", function(){
      const p = parseInt(btn.dataset.rpage, 10);
      if(!p || p === reviewPage) return;
      reviewPage = p;
      renderReviews();
      document.getElementById("prodReviews")?.scrollIntoView({behavior:"smooth", block:"start"});
    });
  });
}

applySeo();

document.getElementById("breadcrumb").innerHTML =
  '<a href="/tat-ca-san-pham">Tất cả sản phẩm</a><span class="sep">›</span>' +
  '<a href="' + (typeof categoryListingPath === "function" ? categoryListingPath(cat.parentSlug) : ("/tat-ca-san-pham/" + cat.parentSlug)) + '">' + esc(cat.parentLabel) + '</a><span class="sep">›</span>' +
  '<a href="' + (typeof categoryListingPath === "function" ? categoryListingPath(cat.parentSlug, cat.slug) : ("/tat-ca-san-pham/" + cat.parentSlug + "/" + cat.slug)) + '">' + esc(cat.label) + '</a><span class="sep">›</span>' +
  '<span class="current">' + esc(product.name) + '</span>';

document.getElementById("prodImage").src = product.image;
document.getElementById("prodImage").alt = product.name;
document.getElementById("prodTitle").textContent = product.name;
(function fillProdMeta() {
  const href = seller.href || (seller.slug ? ("/" + seller.slug) : null);
  const sellerLabel = href
    ? ('Bán bởi <a class="product-meta-seller" href="' + esc(href) + '"><b>' + esc(shopName) + "</b></a>")
    : ("Bán bởi <b>" + esc(shopName) + "</b>");
  document.getElementById("prodMeta").innerHTML =
    '<span class="stars">★★★★★</span> ' + ratingVal +
    ' <span class="dot">·</span> ' + reviewCount.toLocaleString("vi-VN") + ' đánh giá' +
    ' <span class="dot">·</span> ' + soldCount.toLocaleString("vi-VN") + ' đã bán' +
    ' <span class="dot">·</span> ' + sellerLabel +
    ' <span class="dot">·</span> Mã #' + product.id +
    ' <span class="product-verified" title="Đơn hàng được sàn Vua MMO xác minh và bảo vệ">' +
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2l7 3v6c0 5-3.4 8.4-7 10-3.6-1.6-7-5-7-10V5l7-3zm-1.1 13.2l5.6-5.6-1.4-1.4-4.2 4.2-2-2-1.4 1.4 3.4 3.4z"/></svg>' +
    "Giao dịch đã xác minh</span>";
})();

document.getElementById("prodStockLine").textContent = "";
renderVariants();
updatePrice();

/** Sibling/related category tags → listing URLs (sample-style pink links above CTA). */
function productCategoryNavTags(p, info){
  const tags = [];
  const seen = new Set();
  const skipSlug = /^(tai-khoan-khac|tang-tuong-tac|uncategorized)$/i;
  function add(title, href, isCurrent){
    if(!title || !href || seen.has(href)) return;
    seen.add(href);
    tags.push({ title: String(title), href: String(href), current: !!isCurrent });
  }
  const listPath = typeof categoryListingPath === "function"
    ? categoryListingPath
    : function(parent, child){
        return child ? "/tat-ca-san-pham/" + parent + "/" + child : "/tat-ca-san-pham/" + parent;
      };
  const leaf = typeof leafSlug === "function"
    ? leafSlug
    : function(_parent, title, preferred){
        return preferred || (typeof slugify === "function" ? slugify(title) : String(title || "").toLowerCase());
      };

  if(info && info.parentSlug && info.slug){
    add(info.label, listPath(info.parentSlug, info.slug), true);
  }

  const parents = (typeof CATEGORY_TAXONOMY !== "undefined" && CATEGORY_TAXONOMY.parents) || [];
  const parentNode = parents.find(function(x){ return x.slug === (info && info.parentSlug); });
  const children = (parentNode && parentNode.children) || [];
  const idx = children.findIndex(function(c){
    const cs = leaf(info.parentSlug, c.title, c.slug);
    return cs === info.slug || c.slug === info.slug;
  });

  const popularByParent = {
    "tai-khoan-cong-cu-ai": [
      "capcut","canva","chatgpt","adobe","zoom","spotify","netflix","youtube",
      "cursor","midjourney","figma","gemini","claude","expressvpn","tiktok",
      "office","microsoft","grammarly","notion"
    ],
    "game": ["steam","discord","nitro-discord"],
    "khoa-hoc": []
  };
  const popular = popularByParent[info.parentSlug] || [];

  function childHref(c){
    const cs = leaf(info.parentSlug, c.title, c.slug);
    if(skipSlug.test(cs) || skipSlug.test(c.slug || "")) return null;
    return { title: c.title, href: listPath(info.parentSlug, cs), slug: cs };
  }

  // Prefer curated related brands first (better UX than raw taxonomy neighbors)
  popular.forEach(function(slug){
    if(tags.length >= 10) return;
    const c = children.find(function(ch){
      return ch.slug === slug || leaf(info.parentSlug, ch.title, ch.slug) === slug;
    });
    if(!c) return;
    const item = childHref(c);
    if(item) add(item.title, item.href, false);
  });

  for(let d = 1; tags.length < 10 && d < 40; d++){
    [idx - d, idx + d].forEach(function(j){
      if(j < 0 || j >= children.length || tags.length >= 10) return;
      const item = childHref(children[j]);
      if(item) add(item.title, item.href, false);
    });
  }

  if(tags.length < 8){
    children.forEach(function(c){
      if(tags.length >= 10) return;
      const item = childHref(c);
      if(item) add(item.title, item.href, false);
    });
  }

  // Cross-parent discovery when still thin (e.g. game/khoa-hoc with few siblings)
  if(tags.length < 6){
    const extras = [
      { title: "Capcut", href: "/tat-ca-san-pham/tai-khoan-cong-cu-ai/capcut" },
      { title: "Canva", href: "/tat-ca-san-pham/tai-khoan-cong-cu-ai/canva" },
      { title: "ChatGPT", href: "/tat-ca-san-pham/tai-khoan-cong-cu-ai/chatgpt" },
      { title: "Netflix", href: "/tat-ca-san-pham/tai-khoan-cong-cu-ai/netflix" },
      { title: "Spotify", href: "/tat-ca-san-pham/tai-khoan-cong-cu-ai/spotify" },
      { title: "Zoom", href: "/tat-ca-san-pham/tai-khoan-cong-cu-ai/zoom" },
      { title: "Adobe", href: "/tat-ca-san-pham/tai-khoan-cong-cu-ai/adobe" },
      { title: "Game", href: "/tat-ca-san-pham/game" },
      { title: "Khóa học", href: "/tat-ca-san-pham/khoa-hoc" }
    ];
    extras.forEach(function(t){
      if(tags.length >= 10) return;
      add(t.title, t.href, false);
    });
  }

  return tags.slice(0, 10);
}

(function renderProductNavTags(){
  const buyRow = document.querySelector(".product-buy-row");
  if(!buyRow) return;
  const tags = productCategoryNavTags(product, cat);
  if(!tags.length) return;
  const nav = document.createElement("nav");
  nav.className = "product-nav-tags-wrap";
  nav.setAttribute("aria-label", "Danh mục liên quan");
  nav.innerHTML =
    '<ul class="product-nav-tags">' +
    tags.map(function(t){
      return '<li><a href="' + esc(t.href) + '"' +
        (t.current ? ' class="is-current" aria-current="page"' : "") +
        ">" + esc(t.title) + "</a></li>";
    }).join("") +
    "</ul>";
  buyRow.parentNode.insertBefore(nav, buyRow);
})();

function pad(n){ return String(n).padStart(2, "0"); }
function tick(){
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const d = Math.max(0, end - new Date());
  document.getElementById("cdHours").textContent = pad(Math.floor(d / 3600000));
  document.getElementById("cdMins").textContent = pad(Math.floor((d % 3600000) / 60000));
  document.getElementById("cdSecs").textContent = pad(Math.floor((d % 60000) / 1000));
}
tick();
setInterval(tick, 1000);

const qtyInput = document.getElementById("qtyInput");
document.getElementById("qtyMinus").addEventListener("click", () => {
  qtyInput.value = Math.max(1, parseInt(qtyInput.value, 10) - 1);
});
document.getElementById("qtyPlus").addEventListener("click", () => {
  qtyInput.value = parseInt(qtyInput.value, 10) + 1;
});
function currentCartItem() {
  const qty = Math.max(1, parseInt(document.getElementById("qtyInput")?.value || "1", 10) || 1);
  const variant = typeof selectedVariant === "function" ? selectedVariant() : null;
  const price = Number((variant && variant.price) || product.price || 0);
  const name = variant && variant.label
    ? product.name + " — " + variant.label
    : product.name;
  const id = String((variant && variant.id) || product.id);
  return {
    id,
    name,
    price,
    qty,
    image: product.image || "",
    seller: product.seller || "",
    sellerToken: product.sellerToken || "",
    sellerSlug: product.sellerSlug || "",
    parentId: String(product.id)
  };
}
document.getElementById("addToCartBtn").addEventListener("click", () => {
  if (typeof addToCart === "function") addToCart(currentCartItem());
});
document.getElementById("buyNowBtn").addEventListener("click", () => {
  if (typeof addToCart === "function") addToCart(currentCartItem());
  location.href = "/thanh-toan";
});

(function wireProductWish() {
  const row = document.querySelector(".product-buy-row");
  if (!row || document.getElementById("productWishBtn")) return;
  const shop = typeof shopName !== "undefined" ? shopName : (product.seller || "Vua MMO");
  const on = window.WishStore && WishStore.has(product.id);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "productWishBtn";
  btn.className = "btn btn-outline product-wish-btn" + (on ? " active" : "");
  btn.setAttribute("aria-label", "Thêm wishlist");
  btn.dataset.wishId = String(product.id);
  btn.dataset.wishName = product.name || "";
  btn.dataset.wishPrice = String(product.price || 0);
  btn.dataset.wishRegular = String(product.regular || "");
  btn.dataset.wishImage = product.image || "";
  btn.dataset.wishSeller = shop;
  btn.dataset.wishRating = String(product.rating || "");
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 21s-7-4.4-9.5-8.6C.7 8.8 2 5 5.6 4.2 8 3.6 10 4.7 12 7c2-2.3 4-3.4 6.4-2.8C22 5 23.3 8.8 21.5 12.4 19 16.6 12 21 12 21z"/></svg>' +
    "<span>Yêu thích</span>";
  btn.addEventListener("click", () => {
    if (typeof toggleWish === "function") toggleWish(btn);
    const span = btn.querySelector("span");
    if (span) span.textContent = btn.classList.contains("active") ? "Đã thích" : "Yêu thích";
  });
  if (on) {
    const span = btn.querySelector("span");
    if (span) span.textContent = "Đã thích";
  }
  row.appendChild(btn);
})();

document.getElementById("prodDesc").innerHTML =
  "<h2>Vì sao nên mua " + esc(product.name) + " tại Vua MMO?</h2>" +
  "<p><strong>" + esc(product.name) + "</strong> tại Vua MMO là tài khoản/gói chính chủ, được kiểm tra trước khi bàn giao, cam kết hoạt động ổn định trong suốt thời hạn sử dụng. Giao tự động qua email chỉ trong 5–15 phút sau thanh toán.</p>" +
  "<ul>" +
  "<li>Đầy đủ tính năng như bản trả phí gốc.</li>" +
  "<li>Bảo hành 1 đổi 1 trọn thời hạn nếu lỗi từ nhà cung cấp.</li>" +
  "<li>Hỗ trợ kỹ thuật nhanh qua chat 8h–22h hàng ngày.</li>" +
  "<li>Hoàn tiền 100% nếu không giao được trong thời gian cam kết.</li>" +
  "</ul>" +
  "<h2>Hướng dẫn kích hoạt &amp; bảo hành</h2>" +
  "<p>Sau khi đặt hàng thành công, hệ thống gửi thông tin " + esc(product.name) + " kèm hướng dẫn kích hoạt qua email. Cần hỗ trợ thêm, đội ngũ CSKH Vua MMO sẵn sàng qua chat trên website.</p>";

document.getElementById("prodFaq").innerHTML =
  "<h2>Câu hỏi thường gặp</h2>" +
  faqItems(product.name).map(function(f){
    return '<div class="product-faq-item"><h3>' + esc(f.q) + "</h3><p>" + esc(f.a) + "</p></div>";
  }).join("");

renderReviews();
mergeVerifiedReviews();

const related = shuffleArray(
  RAW_PRODUCTS.filter(function(p){ return p !== product && (p.cats || []).some(function(c){ return (product.cats || []).includes(c); }); })
).slice(0, 5);
document.getElementById("relatedGrid").className = "card-grid product-related-grid";
document.getElementById("relatedGrid").innerHTML =
  (related.length ? related : shuffleArray(RAW_PRODUCTS.filter(function(p){ return p !== product; })).slice(0, 5))
    .map(productCard).join("");

(function(){
  const href = seller.href || (seller.slug ? ("/" + seller.slug) : null);
  const avatar = sellerAvatar(seller);
  const room = seller.chatRoomId || ("shop_" + (seller.token || seller.slug || shopName));
  const level = sellerLevel(seller);
  const success = sellerSuccessRate(seller);
  const joined = sellerJoinText(seller);
  const cats = (product.cats || []).filter(Boolean).slice(0, 2);
  const nameHtml = href
    ? ('<a href="' + esc(href) + '"><strong>' + esc(shopName) + "</strong></a>")
    : ("<strong>" + esc(shopName) + "</strong>");
  const introFocus = cats.length
    ? ("Chuyên " + cats.join(", ").toLowerCase() + " và các sản phẩm số liên quan")
    : "Chuyên tài khoản, phần mềm và công cụ số";

  const chatAttrs =
    ' data-shop-token="' + esc(seller.token || "") + '"' +
    ' data-shop-name="' + esc(shopName) + '"' +
    ' data-shop-avatar="' + esc(avatar) + '"' +
    ' data-shop-room="' + esc(room) + '"';

  const barHtml =
    '<aside class="product-seller-bar" aria-label="Người bán">' +
    '<div class="product-seller-bar-main">' +
    (href
      ? '<a class="product-seller-bar-avatar" href="' + esc(href) + '"><img src="' + esc(avatar) + '" alt="' + esc(shopName) + '"></a>'
      : '<span class="product-seller-bar-avatar"><img src="' + esc(avatar) + '" alt="' + esc(shopName) + '"></span>') +
    '<div class="product-seller-bar-info">' +
    '<div class="product-seller-bar-name-row">' +
    (href
      ? '<a class="product-seller-bar-name" href="' + esc(href) + '">' + esc(shopName) + "</a>"
      : '<span class="product-seller-bar-name">' + esc(shopName) + "</span>") +
    '<span class="product-seller-bar-level">Cấp ' + level + "</span>" +
    '<span class="product-seller-bar-online"><span class="product-seller-bar-online-dot"></span>Online</span>' +
    "</div>" +
    '<div class="product-seller-bar-stats">' +
    "<span>✓ " + success + " thành công</span>" +
    '<span class="product-seller-bar-sep">|</span>' +
    '<span class="product-seller-bar-verified">' +
    '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M12 2l7 3v6c0 5-3.4 8.4-7 10-3.6-1.6-7-5-7-10V5l7-3zm-1.1 13.2l5.6-5.6-1.4-1.4-4.2 4.2-2-2-1.4 1.4 3.4 3.4z"/></svg>' +
    "Đã xác minh</span>" +
    "</div>" +
    '<div class="product-seller-bar-meta">Tham gia ' + esc(joined) + " · Giao dịch online</div>" +
    "</div></div>" +
    '<div class="product-seller-bar-actions">' +
    '<a href="#" class="product-seller-bar-btn product-seller-bar-btn-chat js-open-shop-chat"' + chatAttrs + ' title="Chat với ' + esc(shopName) + '">' +
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>Chat</a>' +
    (href
      ? '<a href="' + esc(href) + '" class="product-seller-bar-btn product-seller-bar-btn-shop">' +
        '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M4 7h16l-1.2 12.2A2 2 0 0 1 16.81 21H7.19a2 2 0 0 1-1.99-1.8L4 7zm4-3h8l1 2H7l1-2z"/></svg>Xem shop</a>'
      : "") +
    "</div></aside>";

  const gallery = document.querySelector(".product-gallery");
  if (gallery && !document.querySelector(".product-seller-bar")) {
    let media = gallery.closest(".product-media");
    if (!media) {
      media = document.createElement("div");
      media.className = "product-media";
      gallery.parentNode.insertBefore(media, gallery);
      media.appendChild(gallery);
    }
    media.insertAdjacentHTML("beforeend", barHtml);
  }

  document.getElementById("prodSeller").innerHTML =
    '<div class="product-seller-head">' +
    '<img class="product-seller-avatar" src="' + esc(avatar) + '" alt="' + esc(shopName) + '">' +
    "<div><h2>Giới thiệu " + esc(shopName) + "</h2>" +
    '<p class="product-seller-sub">Gian hàng trên Vua MMO · <span class="product-seller-verified-inline">Giao dịch đã xác minh</span></p></div></div>' +
    "<p>" + nameHtml + " " + esc(introFocus) +
    ". Đang bán <strong>" + esc(product.name) +
    "</strong> — giao tự động, bảo hành rõ ràng, hỗ trợ nhanh trên sàn.</p>" +
    '<div class="product-shop-actions">' +
    (href ? '<a class="btn btn-outline" href="' + esc(href) + '">Xem shop</a>' : "") +
    '<a class="btn btn-primary js-open-shop-chat" href="#"' + chatAttrs + ">Chat shop</a>" +
    '<a class="btn btn-outline js-open-chat" href="#">Chat sàn</a>' +
    "</div>";
})();
