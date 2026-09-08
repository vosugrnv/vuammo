/* Shop profile — layout sidebar + grid (card sản phẩm giữ nguyên productCard) */
(function () {
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function money(n) {
    if (window.VuammoApi && typeof VuammoApi.money === "function") return VuammoApi.money(n);
    return Number(n || 0).toLocaleString("vi-VN") + "₫";
  }

  function resolveShop() {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const slug = params.get("slug");
    if (token && typeof shopByToken === "function") return shopByToken(token);
    if (slug && typeof shopBySlug === "function") return shopBySlug(slug);
    return null;
  }

  function hashSeed(str) {
    let h = 0;
    const s = String(str || "");
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  function joinDate(shop) {
    const seed = hashSeed(shop.token || shop.name);
    const day = 1 + (seed % 28);
    const month = 1 + (seed % 12);
    const year = shop.joinedYear || 2024;
    const pad = (n) => String(n).padStart(2, "0");
    return pad(day) + " " + pad(month) + " " + year;
  }

  function successRate(shop) {
    const seed = hashSeed(shop.token || shop.name);
    const base = 92 + (seed % 700) / 100;
    return base.toFixed(2).replace(".", ",") + "%";
  }

  function levelOf(shop) {
    return 40 + ((Number(shop.id) || 1) * 3 + hashSeed(shop.name) % 40) % 60;
  }

  function avatarOf(shop) {
    if (typeof shopAvatarUrl === "function") return shopAvatarUrl(shop);
    return shop.avatar || "images/logo-vuammo.png";
  }

  let allProducts = [];

  function renderGrid(list) {
    const grid = document.getElementById("shopGrid");
    const empty = document.getElementById("shopSearchEmpty");
    const countEl = document.getElementById("shopProductsCount");
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML = "";
      if (empty) empty.hidden = false;
      if (countEl) countEl.textContent = "0 / " + allProducts.length + " sản phẩm";
      return;
    }
    if (empty) empty.hidden = true;
    if (countEl) {
      countEl.textContent =
        list.length === allProducts.length
          ? list.length + " sản phẩm"
          : list.length + " / " + allProducts.length + " sản phẩm";
    }
    if (typeof productCard === "function") grid.innerHTML = list.map(productCard).join("");
  }

  function filterProducts(q) {
    const needle = String(q || "").trim().toLowerCase();
    if (!needle) return allProducts.slice();
    return allProducts.filter((p) => String(p.name || "").toLowerCase().includes(needle));
  }

  function wireShopChat(shop) {
    const btn = document.getElementById("shopChatBtn");
    if (!btn) return;
    btn.setAttribute("data-shop-token", shop.token || "");
    btn.setAttribute("data-shop-name", shop.name || "");
    btn.setAttribute("data-shop-avatar", avatarOf(shop));
    btn.setAttribute("data-shop-room", shop.chatRoomId || ("shop_" + (shop.token || shop.slug)));
    btn.setAttribute("title", "Chat trực tiếp với " + shop.name);
  }

  function boot() {
    const shop = resolveShop();
    const missing = document.getElementById("shopMissing");
    const layout = document.getElementById("shopLayout");

    if (!shop) {
      if (layout) layout.hidden = true;
      if (missing) missing.hidden = false;
      return;
    }

    if (missing) missing.hidden = true;
    if (layout) layout.hidden = false;

    document.title = shop.name + " | Gian hàng Vua MMO";
    const crumb = document.getElementById("shopCrumbName");
    if (crumb) crumb.textContent = shop.name;

    const nameEl = document.getElementById("shopName");
    if (nameEl) nameEl.textContent = shop.name;

    const img = document.getElementById("shopAvatarImg");
    if (img) {
      img.src = avatarOf(shop);
      img.alt = "Avatar " + shop.name;
    }

    const level = document.getElementById("shopLevel");
    if (level) level.textContent = "Cấp " + levelOf(shop);

    const success = document.getElementById("shopSuccess");
    if (success) success.textContent = "✓ " + successRate(shop) + " giao dịch thành công";

    const joined = document.getElementById("shopJoinedText");
    if (joined) joined.textContent = "Tham gia: " + joinDate(shop);

    const city = document.getElementById("shopCityLine");
    if (city) city.textContent = (shop.city || "") + (shop.district ? " · " + shop.district : "");

    wireShopChat(shop);

    allProducts = typeof productsOfShop === "function" ? productsOfShop(shop) : [];
    const minPrice = allProducts.reduce((m, p) => Math.min(m, Number(p.price) || Infinity), Infinity);
    const fromEl = document.getElementById("shopFromPriceText");
    if (fromEl) {
      fromEl.textContent = minPrice < Infinity ? "Từ: " + money(minPrice) : "Từ: —";
    }

    renderGrid(allProducts);

    const form = document.getElementById("shopSearchForm");
    const input = document.getElementById("shopSearchInput");
    if (form && input) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        renderGrid(filterProducts(input.value));
      });
      input.addEventListener("input", () => {
        renderGrid(filterProducts(input.value));
      });
    }

    const ld = {
      "@context": "https://schema.org",
      "@type": "Store",
      name: shop.name,
      description: shop.bio,
      url: location.href,
      image: avatarOf(shop),
      address: {
        "@type": "PostalAddress",
        addressLocality: shop.city,
        addressRegion: shop.district,
        addressCountry: "VN"
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: shop.rating,
        reviewCount: Math.max(12, allProducts.length * 3)
      }
    };
    let script = document.getElementById("shopJsonLd");
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "shopJsonLd";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(ld);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
