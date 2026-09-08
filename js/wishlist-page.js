/* Wishlist page — empty + filled (layout giống giỏ hàng) */
(function () {
  function money(n) {
    if (window.VuammoApi) return VuammoApi.money(n);
    return Number(n || 0).toLocaleString("vi-VN") + "₫";
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function productUrl(it) {
    const p = {
      id: it.id,
      name: it.name,
      slug: it.slug || (typeof slugify === "function" ? slugify(it.name) : String(it.id))
    };
    if (typeof productHref === "function") return productHref(p);
    return "product.html?slug=" + encodeURIComponent(p.slug);
  }

  function wishItemHtml(it) {
    const href = productUrl(it);
    const shop = it.seller || "Vua MMO";
    const hasOld = it.regular && Number(it.regular) > Number(it.price);
    return (
      '<article class="wish-item" role="listitem" data-id="' +
      esc(it.id) +
      '">' +
      '<a class="wish-item-thumb" href="' +
      esc(href) +
      '">' +
      (it.image
        ? '<img src="' + esc(it.image) + '" alt="' + esc(it.name) + '" loading="lazy" width="120" height="120">'
        : '<span class="wish-item-ph" aria-hidden="true"></span>') +
      "</a>" +
      '<div class="wish-item-body">' +
      '<p class="wish-item-shop">' +
      esc(shop) +
      "</p>" +
      '<h3 class="wish-item-title"><a href="' +
      esc(href) +
      '">' +
      esc(it.name) +
      "</a></h3>" +
      '<div class="wish-item-price">' +
      "<strong>" +
      money(it.price) +
      "</strong>" +
      (hasOld ? '<span class="wish-item-old">' + money(it.regular) + "</span>" : "") +
      "</div>" +
      '<div class="wish-item-actions">' +
      '<button type="button" class="btn btn-primary wish-add-cart" data-add="' +
      esc(it.id) +
      '">Thêm vào giỏ</button>' +
      '<a class="btn btn-outline" href="' +
      esc(href) +
      '">Xem sản phẩm</a>' +
      '<button type="button" class="wish-remove" data-remove="' +
      esc(it.id) +
      '" aria-label="Bỏ khỏi wishlist">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 21s-7-4.4-9.5-8.6C.7 8.8 2 5 5.6 4.2 8 3.6 10 4.7 12 7c2-2.3 4-3.4 6.4-2.8C22 5 23.3 8.8 21.5 12.4 19 16.6 12 21 12 21z"/></svg>' +
      " Bỏ thích</button>" +
      "</div></div></article>"
    );
  }

  function findItem(id) {
    return WishStore.read().find((x) => String(x.id) === String(id));
  }

  function render() {
    const empty = document.getElementById("wishEmpty");
    const filled = document.getElementById("wishFilled");
    const grid = document.getElementById("wishGrid");
    const countEl = document.getElementById("wishCountLabel");
    if (!empty || !filled || !grid || !window.WishStore) return;

    const items = WishStore.read();
    const page = document.querySelector(".wish-page") || document.body;
    page.classList.toggle("wish-is-empty", !items.length);
    page.classList.toggle("wish-has-items", items.length > 0);
    document.body.classList.toggle("wish-is-empty", !items.length);
    document.body.classList.toggle("wish-has-items", items.length > 0);

    if (countEl) {
      if (items.length) {
        countEl.hidden = false;
        countEl.textContent = items.length + " sản phẩm đã lưu";
      } else {
        countEl.hidden = true;
        countEl.textContent = "";
      }
    }

    if (!items.length) {
      empty.hidden = false;
      filled.hidden = true;
      empty.style.display = "";
      filled.style.display = "none";
      grid.innerHTML = "";
      return;
    }

    empty.hidden = true;
    filled.hidden = false;
    empty.style.display = "none";
    filled.style.display = "";
    grid.innerHTML = items.map(wishItemHtml).join("");

    grid.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        WishStore.remove(btn.getAttribute("data-remove"));
        if (window.VuammoApi) VuammoApi.showToast("Đã bỏ khỏi wishlist");
        render();
      });
    });

    grid.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const it = findItem(btn.getAttribute("data-add"));
        if (!it || !window.CartStore) return;
        CartStore.addItem({
          id: it.id,
          name: it.name,
          price: it.price,
          image: it.image,
          qty: 1
        });
        if (window.VuammoApi) VuammoApi.showToast("Đã thêm vào giỏ hàng");
      });
    });
  }

  function boot() {
    WishStore?.syncBadges();
    render();
    window.addEventListener("vuammo:wish", render);
    document.getElementById("wishClearBtn")?.addEventListener("click", () => {
      if (!WishStore.read().length) return;
      if (!confirm("Xóa toàn bộ danh sách yêu thích?")) return;
      WishStore.clear();
      render();
      if (window.VuammoApi) VuammoApi.showToast("Đã xóa wishlist");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
