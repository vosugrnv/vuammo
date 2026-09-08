/* Sitewide header chrome — đồng bộ nav-actions kiểu ảnh 2 trên mọi trang */
(function () {
  /** CSS tối thiểu cho dropdown — tránh header vỡ khi style.css cache cũ */
  function injectCriticalCss() {
    if (document.getElementById("vuammo-header-critical")) return;
    const s = document.createElement("style");
    s.id = "vuammo-header-critical";
    s.textContent =
      ".account-menu-wrap{position:relative!important;display:inline-flex!important;align-items:center;flex:0 0 auto;flex-direction:row;z-index:70}" +
      ".account-dropdown{position:absolute!important;top:calc(100% + 8px);right:0;left:auto;z-index:90;min-width:220px;" +
      "background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 12px 28px rgba(15,23,42,.12);padding:8px;" +
      "display:none!important;visibility:hidden!important;pointer-events:none!important}" +
      ".account-menu-wrap.is-open .account-dropdown{display:block!important;visibility:visible!important;pointer-events:auto!important}" +
      ".account-dropdown-head{padding:10px 12px 12px;border-bottom:1px solid #f1f5f9;margin-bottom:6px}" +
      ".account-dropdown-name{margin:0 0 2px;font-size:14px;font-weight:700;color:#0f172a}" +
      ".account-dropdown-email{margin:0;font-size:12px;color:#64748b;word-break:break-all}" +
      ".account-dropdown-bal{margin:10px 0 0;padding:8px 10px;background:#fff1f2;border:1px solid #fecaca;border-radius:8px;font-size:13px;color:#64748b}" +
      ".account-dropdown-bal strong{display:block;margin-top:2px;font-size:16px;font-weight:800;color:#dc2626}" +
      ".account-dropdown-item{display:block!important;width:100%!important;text-align:left;border:0;background:transparent;" +
      "padding:10px 12px;border-radius:8px;font:inherit;font-size:13.5px;font-weight:600;color:#0f172a;text-decoration:none;cursor:pointer;box-sizing:border-box}" +
      ".account-dropdown-logout{color:#dc2626;margin-top:4px;border-top:1px solid #f1f5f9}" +
      ".header-wallet-balance,#headerWalletBalance,.wallet-balance-badge,#walletBalanceBadge,#cartTotalTop{display:none!important}";
    document.head.appendChild(s);
  }
  injectCriticalCss();

  const ACCOUNT_SVG =
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.7"/><path d="M4.5 20c1.6-3.6 4.5-5.5 7.5-5.5s5.9 1.9 7.5 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const WISH_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 21s-7-4.4-9.5-8.6C.7 8.8 2 5 5.6 4.2 8 3.6 10 4.7 12 7c2-2.3 4-3.4 6.4-2.8C22 5 23.3 8.8 21.5 12.4 19 16.6 12 21 12 21z"/></svg>';
  const CART_SVG =
    '<svg viewBox="0 0 24 24"><path d="M3 4h2l1.6 9.6a2 2 0 0 0 2 1.7h7.4a2 2 0 0 0 2-1.6L19.5 8H6" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="19.5" r="1.4" fill="currentColor"/><circle cx="16.5" cy="19.5" r="1.4" fill="currentColor"/></svg>';

  function moneyText(n) {
    if (window.VuammoApi && typeof VuammoApi.money === "function") return VuammoApi.money(n);
    return Number(n || 0).toLocaleString("vi-VN") + "₫";
  }

  function wishCount() {
    if (window.WishStore) return WishStore.read().length;
    try {
      const list = JSON.parse(localStorage.getItem("vuammo_wish_v1") || "[]");
      return Array.isArray(list) ? list.length : 0;
    } catch {
      return 0;
    }
  }

  function cartCount() {
    if (window.CartStore) {
      return CartStore.read().reduce((s, i) => s + (i.qty || 1), 0);
    }
    try {
      const list = JSON.parse(localStorage.getItem("vuammo_cart_v1") || "[]");
      return Array.isArray(list) ? list.reduce((s, i) => s + (i.qty || 1), 0) : 0;
    } catch {
      return 0;
    }
  }

  function walletBalance() {
    if (window.VuammoAuth && VuammoAuth.getUser()) {
      return Number(VuammoAuth.getUser().balance || 0);
    }
    return 0;
  }

  function syncCountsAndBalance() {
    const wishN = wishCount();
    const cartN = cartCount();
    const bal = walletBalance();
    const loggedIn = !!(window.VuammoAuth && VuammoAuth.getUser());

    ["wishBadgeTop", "wishBadge"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(wishN);
    });
    ["cartBadgeTop", "cartBadge"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(cartN);
    });

    const balanceEl = document.getElementById("headerWalletBalance");
    if (balanceEl) balanceEl.remove();
    const dropBal = document.getElementById("dropdownWalletBal");
    if (dropBal) dropBal.textContent = moneyText(bal);

    // Gỡ pill cũ nếu còn
    document.querySelectorAll("#walletBalanceBadge, .wallet-balance-badge, #cartTotalTop").forEach((el) => el.remove());
  }

  /** Chuẩn header ảnh 2 — chỉ rebuild khi chưa chuẩn (tránh phá dropdown) */
  function normalizeNavActions(force) {
    const actions = document.querySelector(".nav-actions");
    if (!actions) return null;

    document.querySelectorAll("#walletBalanceBadge, .wallet-balance-badge").forEach((el) => el.remove());

    if (!force && actions.dataset.vuammoHeader === "v3" && actions.querySelector(".account-btn") && actions.querySelector(".cart-btn")) {
      // Đã chuẩn: chỉ sync số, giữ nguyên account dropdown DOM
      syncCountsAndBalance();
      return actions;
    }

    const wishN = wishCount();
    const cartN = cartCount();
    const bal = walletBalance();
    const loggedIn = !!(window.VuammoAuth && VuammoAuth.getUser());

    actions.innerHTML =
      '<a class="icon-btn account-btn" href="tai-khoan.html" aria-label="Tài khoản" title="Tài khoản">' +
      ACCOUNT_SVG +
      "</a>" +
      '<a class="icon-btn wish-btn" href="wishlist.html" aria-label="Wishlist" title="Danh sách yêu thích">' +
      WISH_SVG +
      '<span class="nav-badge" id="wishBadgeTop">' +
      wishN +
      "</span></a>" +
      '<a class="cart-btn" href="cart.html" aria-label="Giỏ hàng" title="Giỏ hàng">' +
      '<span class="cart-icon-circle">' +
      CART_SVG +
      '<span class="nav-badge" id="cartBadgeTop">' +
      cartN +
      "</span></span></a>";

    const wishMobile = document.getElementById("wishBadge");
    if (wishMobile) wishMobile.textContent = String(wishN);
    const cartMobile = document.getElementById("cartBadge");
    if (cartMobile) cartMobile.textContent = String(cartN);

    actions.dataset.vuammoHeader = "v3";
    return actions;
  }

  const TICKER_INTRO =
    "Vua MMO – Nền tảng giao dịch sản phẩm số uy tín. Mua bán tài khoản số, phần mềm bản quyền và dịch vụ số. Giao dịch trung gian an toàn, hỗ trợ nhanh.";
  const TICKER_WARN =
    "⚠️ Cảnh báo: Vui lòng yêu cầu shop bảo hành trực tiếp trên nền tảng bằng tính năng bảo hành để được bảo đảm quyền lợi. Không nhận bảo hành qua bất kỳ kênh nào khác — rất có thể bạn sẽ nhận sản phẩm cũ đã bán cho người khác. Không giao dịch ngoài nền tảng — Vua MMO không chịu trách nhiệm khi mua bán riêng.";

  function injectTicker() {
    if (document.getElementById("siteTicker")) return;
    const header = document.querySelector(".site-header");
    if (!header) return;

    if (!document.getElementById("vuammo-ticker-critical")) {
      const s = document.createElement("style");
      s.id = "vuammo-ticker-critical";
      s.textContent =
        ".site-ticker{background:#fff;border-bottom:1px solid #fee2e2;overflow:hidden;height:34px;display:flex;align-items:center;contain:layout paint style;transform:translateZ(0)}" +
        ".site-ticker__track{display:flex;width:max-content;align-items:center;animation:siteTickerRtl 70s linear infinite;transform:translate3d(0,0,0);backface-visibility:hidden}" +
        ".site-ticker__unit{display:inline-flex;align-items:center;flex:0 0 auto;white-space:nowrap;padding-right:4rem}" +
        ".site-ticker__intro,.site-ticker__warn{font-size:13px;font-weight:600;line-height:1.3;color:#dc2626}" +
        ".site-ticker__gap{display:inline-block;width:4.5rem;flex:0 0 auto;height:1px}" +
        ".site-ticker:hover .site-ticker__track{animation-play-state:paused}" +
        "@keyframes siteTickerRtl{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}";
      document.head.appendChild(s);
    }

    function unitHtml() {
      return (
        '<span class="site-ticker__unit">' +
        '<span class="site-ticker__intro">' +
        TICKER_INTRO +
        "</span>" +
        '<span class="site-ticker__gap" aria-hidden="true"></span>' +
        '<span class="site-ticker__warn">' +
        TICKER_WARN +
        "</span></span>"
      );
    }

    const bar = document.createElement("div");
    bar.className = "site-ticker";
    bar.id = "siteTicker";
    bar.setAttribute("role", "marquee");
    bar.setAttribute("aria-label", "Thông báo và cảnh báo Vua MMO");
    bar.innerHTML =
      '<div class="site-ticker__track">' + unitHtml() + unitHtml() + "</div>";
    /* Ngoài sticky header để animation không làm lag cả header */
    header.insertAdjacentElement("afterend", bar);
  }

  function boot() {
    injectTicker();
    normalizeNavActions(true);
  }

  window.VuammoHeader = {
    normalize: normalizeNavActions,
    sync: syncCountsAndBalance,
    moneyText,
    wishCount,
    cartCount
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("vuammo:wish", syncCountsAndBalance);
  window.addEventListener("vuammo:cart", syncCountsAndBalance);
  window.addEventListener("vuammo:user", () => {
    syncCountsAndBalance();
    if (window.VuammoAuth && typeof window.VuammoAuth._wireHeaderAfterNormalize === "function") {
      window.VuammoAuth._wireHeaderAfterNormalize();
    }
  });
})();
