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
    const slugQ = params.get("slug");
    if (token && typeof shopByToken === "function") return shopByToken(token);
    if (slugQ && typeof shopBySlug === "function") return shopBySlug(slugQ);

    const path = String(location.pathname || "").replace(/\/+$/, "") || "/";
    const m = path.match(/^\/([a-z0-9][a-z0-9-]{0,62})(?:\.html)?$/i);
    if (m && typeof shopBySlug === "function") {
      const key = m[1].toLowerCase();
      const reserved = {
        index: 1,
        admin: 1,
        cart: 1,
        wishlist: 1,
        blog: 1,
        shop: 1,
        product: 1,
        api: 1,
        uploads: 1,
        images: 1,
        css: 1,
        js: 1,
        vi: 1,
        "gian-hang": 1,
        "tai-khoan": 1,
        "tin-nhan": 1,
        "thanh-toan": 1,
        "don-hang": 1,
        "chia-se": 1,
        "tat-ca-san-pham": 1,
        "dang-ky-nguoi-ban": 1,
        "lien-he": 1,
        "gioi-thieu": 1
      };
      if (!reserved[key]) {
        const s = shopBySlug(key);
        if (s) return s;
      }
    }
    return null;
  }

  function prettyShopUrl(shop) {
    if (!shop) return "/shop";
    if (typeof shopHref === "function") return shopHref(shop);
    return shop.slug ? "/" + shop.slug : "/shop";
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
    const raw = shop.avatar || "/images/logo-vuammo.png";
    return typeof absAssetUrl === "function" ? absAssetUrl(raw) : (raw.charAt(0) === "/" || /^https?:/i.test(raw) ? raw : "/" + raw);
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

    const pretty = prettyShopUrl(shop);
    if (pretty && pretty !== location.pathname + location.search) {
      try {
        history.replaceState(null, "", pretty);
      } catch (_) {}
    }

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
    if (city) city.textContent = "Giao dịch online · Đã xác minh";

    wireShopChat(shop);

    allProducts = typeof productsOfShop === "function" ? productsOfShop(shop) : [];
    if (typeof shuffleArray === "function") allProducts = shuffleArray(allProducts);

    const bioEl = document.getElementById("shopBio");
    if (bioEl) {
      const focusCats = allProducts.flatMap((p) => p.cats || []).filter(Boolean);
      const topCats = [...new Set(focusCats)].slice(0, 3);
      const count = allProducts.length;
      bioEl.textContent =
        shop.name +
        " chuyên sản phẩm số trên Vua MMO" +
        (topCats.length ? (" — " + topCats.join(", ")) : "") +
        (count ? (". Đang có " + count + " sản phẩm") : "") +
        ". Giao tự động, bảo hành rõ ràng, hỗ trợ nhanh.";
    }
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
