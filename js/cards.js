/* ---------- Shared product card renderer (used by home, category & cart pages) ---------- */
const money = n => n.toLocaleString("vi-VN") + "₫";

function escapeAttr(s){ return String(s || "").replace(/"/g,"&quot;"); }

function shopNameOf(p){
  if(p && p.seller) return String(p.seller).trim();
  return "Vua MMO";
}

function shopLinkOf(p){
  const name = shopNameOf(p);
  if (typeof shopByToken === "function" && p && p.sellerToken) {
    const byTok = shopByToken(p.sellerToken);
    if (byTok && typeof shopHref === "function") return shopHref(byTok);
  }
  if (typeof shopByName === "function") {
    const s = shopByName(name);
    if (s && typeof shopHref === "function") return shopHref(s);
    if (s && s.slug) return "/" + s.slug;
  }
  const slug = String((p && (p.sellerSlug || p.seller)) || name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug ? ("/" + slug) : "/shop.html";
}

function discountBadge(p){
  if(!p.regular || p.regular <= p.price) return "";
  const pct = Math.round(100 - (p.price/p.regular)*100);
  return `<span class="badge-discount">-${pct}%</span>`;
}

function productCard(p){
  const rating = (p.rating && p.rating > 0 ? p.rating : 4.6).toFixed(1).replace(".", ",");
  const href = typeof productHref === "function" ? productHref(p) : `product.html?slug=${slugify(p.name)}`;
  const shop = shopNameOf(p);
  const seed = (Number(p.id) || 0) * 17 + String(p.name || "").length * 13;
  const soldN = 800 + (seed % 15000);
  const sold = soldN >= 1000
    ? (soldN / 1000).toFixed(1).replace(".", ",") + "k"
    : String(soldN);
  const wishActive = typeof WishStore !== "undefined" && WishStore.has(p.id) ? " active" : "";
  return `
  <div class="product-card">
    ${discountBadge(p)}
    <button type="button" class="badge-wish${wishActive}"
      data-wish-id="${escapeAttr(p.id)}"
      data-wish-name="${escapeAttr(p.name)}"
      data-wish-price="${escapeAttr(p.price)}"
      data-wish-regular="${escapeAttr(p.regular || "")}"
      data-wish-image="${escapeAttr(p.image)}"
      data-wish-seller="${escapeAttr(shop)}"
      data-wish-rating="${escapeAttr(p.rating || "")}"
      onclick="toggleWish(this)" aria-label="Thêm wishlist">
      <svg viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="1.7"><path d="M12 21s-7-4.4-9.5-8.6C.7 8.8 2 5 5.6 4.2 8 3.6 10 4.7 12 7c2-2.3 4-3.4 6.4-2.8C22 5 23.3 8.8 21.5 12.4 19 16.6 12 21 12 21z"/></svg>
    </button>
    <a class="product-thumb" href="${href}"><img src="${p.image}" alt="${escapeAttr(p.name)}" loading="lazy"></a>
    <div class="product-body">
      <h3><a href="${href}">${p.name}</a></h3>
      <a class="product-shop" href="${shopLinkOf(p)}" title="Xem gian hàng ${escapeAttr(shop)}">${shop}</a>
      <div class="rating"><span class="stars">★★★★★</span> ${rating} · ${sold} đã bán</div>
      <div class="price-row">
        <span class="price-label">Từ</span>
        <span class="price-now">${money(p.price)}</span>
        ${p.regular && p.regular > p.price ? `<span class="price-old">${money(p.regular)}</span>` : ""}
      </div>
      <a class="btn btn-primary" href="${href}">Mua Ngay</a>
    </div>
  </div>`;
}
