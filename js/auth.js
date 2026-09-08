/* Auth + header account menu for Vua MMO */
(function () {
  let currentUser = null;

  /** Dropdown CSS — luôn inject để không phụ thuộc cache style.css */
  function injectAccountMenuCss() {
    if (document.getElementById("vuammo-account-menu-critical")) return;
    const s = document.createElement("style");
    s.id = "vuammo-account-menu-critical";
    s.textContent =
      ".account-menu-wrap{position:relative!important;display:inline-flex!important;align-items:center;flex:0 0 auto;flex-direction:row;z-index:70}" +
      ".account-dropdown{position:absolute!important;top:calc(100% + 8px);right:0;left:auto;z-index:90;min-width:220px;" +
      "background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 12px 28px rgba(15,23,42,.12);padding:8px;" +
      "display:none!important;visibility:hidden!important;pointer-events:none!important;max-height:min(70vh,420px);overflow:auto}" +
      ".account-menu-wrap.is-open .account-dropdown{display:block!important;visibility:visible!important;pointer-events:auto!important}" +
      ".account-dropdown-head{padding:10px 12px 12px;border-bottom:1px solid #f1f5f9;margin-bottom:6px}" +
      ".account-dropdown-name{margin:0 0 2px;font-size:14px;font-weight:700;color:#0f172a}" +
      ".account-dropdown-email{margin:0;font-size:12px;color:#64748b;word-break:break-all}" +
      ".account-dropdown-bal{margin:10px 0 0;padding:8px 10px;background:#fff1f2;border:1px solid #fecaca;border-radius:8px;font-size:13px;color:#64748b}" +
      ".account-dropdown-bal strong{display:block;margin-top:2px;font-size:16px;font-weight:800;color:#dc2626}" +
      ".account-dropdown-item{display:block!important;width:100%!important;text-align:left;border:0;background:transparent;" +
      "padding:10px 12px;border-radius:8px;font:inherit;font-size:13.5px;font-weight:600;color:#0f172a;text-decoration:none;cursor:pointer;box-sizing:border-box}" +
      ".account-dropdown-logout{color:#dc2626;margin-top:4px;border-top:1px solid #f1f5f9}" +
      ".account-btn.account-btn--avatar{padding:0!important;overflow:hidden;border-radius:999px;width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center}" +
      ".account-btn.account-btn--avatar .account-btn-img{width:100%;height:100%;object-fit:cover;display:block;border-radius:999px}" +
      ".account-dropdown-avatar{width:40px;height:40px;border-radius:10px;object-fit:cover;display:block;margin:0 0 8px;background:#fee2e2}" +
      ".header-wallet-balance,#headerWalletBalance,.wallet-balance-badge,#walletBalanceBadge,#cartTotalTop{display:none!important}";
    document.head.appendChild(s);
  }
  injectAccountMenuCss();

  function redirectAfterAuth() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.indexOf("://") === -1 && !next.startsWith("//")) {
      window.location.href = next;
      return;
    }
    window.location.href = "tai-khoan.html";
  }

  async function refreshMe() {
    if (!window.VuammoApi) return null;
    try {
      const data = await VuammoApi.api("/auth/me");
      currentUser = data.user;
      renderHeaderUser();
      window.dispatchEvent(new CustomEvent("vuammo:user", { detail: currentUser }));
      return currentUser;
    } catch {
      currentUser = null;
      VuammoApi.setToken("");
      renderHeaderUser();
      return null;
    }
  }

  function displayName(user) {
    if (!user) return "";
    return user.name || String(user.email || "").split("@")[0] || "Tài khoản";
  }

  function moneyText(n) {
    if (window.VuammoApi) return VuammoApi.money(n);
    return Number(n || 0).toLocaleString("vi-VN") + "₫";
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function closeAccountMenu() {
    const wrap = document.getElementById("accountMenuWrap");
    if (!wrap) return;
    wrap.classList.remove("is-open");
    const btn = wrap.querySelector(".account-btn");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function toggleAccountMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    const wrap = document.getElementById("accountMenuWrap");
    if (!wrap) return;
    const open = !wrap.classList.contains("is-open");
    document.querySelectorAll(".account-menu-wrap.is-open").forEach((el) => {
      if (el !== wrap) el.classList.remove("is-open");
    });
    wrap.classList.toggle("is-open", open);
    const btn = wrap.querySelector(".account-btn");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function ensureAccountMenuWired(actions) {
    injectAccountMenuCss();
    let wrap = document.getElementById("accountMenuWrap");
    let accountBtn = actions.querySelector(".account-btn");
    if (!accountBtn) return null;

    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "accountMenuWrap";
      wrap.className = "account-menu-wrap";
      accountBtn.replaceWith(wrap);
      wrap.appendChild(accountBtn);

      const menu = document.createElement("div");
      menu.id = "accountDropdown";
      menu.className = "account-dropdown";
      menu.setAttribute("role", "menu");
      wrap.appendChild(menu);

      accountBtn.addEventListener("click", (e) => {
        if (!currentUser) {
          accountBtn.href = "tai-khoan.html";
          return;
        }
        toggleAccountMenu(e);
      });

      if (!document.documentElement.dataset.accountMenuDoc) {
        document.documentElement.dataset.accountMenuDoc = "1";
        document.addEventListener("click", (e) => {
          const w = document.getElementById("accountMenuWrap");
          if (w && !w.contains(e.target)) closeAccountMenu();
        });
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape") closeAccountMenu();
        });
      }
    }

    accountBtn = wrap.querySelector(".account-btn");
    accountBtn.setAttribute("aria-haspopup", "true");
    accountBtn.setAttribute("aria-expanded", "false");
    return wrap;
  }

  function normalizeHeaderChrome() {
    if (window.VuammoHeader && typeof VuammoHeader.normalize === "function") {
      // Không force rebuild — giữ dropdown nếu đã wire
      return VuammoHeader.normalize(false);
    }
    const actions = document.querySelector(".nav-actions");
    if (!actions) return null;
    document.querySelectorAll("#walletBalanceBadge, .wallet-balance-badge").forEach((el) => el.remove());
    const legacy = document.getElementById("cartTotalTop");
    if (legacy) legacy.remove();
    return actions;
  }

  const ACCOUNT_SVG =
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.7"/><path d="M4.5 20c1.6-3.6 4.5-5.5 7.5-5.5s5.9 1.9 7.5 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  function paintAccountButton(accountBtn, user) {
    if (!accountBtn) return;
    const url = user && user.avatarUrl ? String(user.avatarUrl) : "";
    if (url) {
      accountBtn.classList.add("account-btn--avatar");
      accountBtn.innerHTML =
        '<img class="account-btn-img" src="' + escapeHtml(url) + '" alt="" width="36" height="36">';
    } else {
      accountBtn.classList.remove("account-btn--avatar");
      accountBtn.innerHTML = ACCOUNT_SVG;
    }
  }

  function renderHeaderUser() {
    const actions = normalizeHeaderChrome() || document.querySelector(".nav-actions");
    if (!actions) return;

    ensureAccountMenuWired(actions);
    closeAccountMenu();
    const accountBtn = actions.querySelector(".account-btn");
    const menu = document.getElementById("accountDropdown");
    // Số dư chỉ hiện trong dropdown tài khoản (không hiện pill trên header)
    document
      .querySelectorAll("#headerWalletBalance, .header-wallet-balance, #walletBalanceBadge, .wallet-balance-badge")
      .forEach((el) => el.remove());

    const bal = currentUser ? Number(currentUser.balance || 0) : 0;

    if (currentUser) {
      if (accountBtn) {
        accountBtn.href = "#";
        accountBtn.setAttribute("role", "button");
        accountBtn.title = "Tài khoản";
        paintAccountButton(accountBtn, currentUser);
      }
      if (menu) {
        const name = displayName(currentUser);
        const av = currentUser.avatarUrl
          ? '<img class="account-dropdown-avatar" src="' +
            escapeHtml(currentUser.avatarUrl) +
            '" alt="">'
          : "";
        menu.innerHTML =
          '<div class="account-dropdown-head">' +
          av +
          '<p class="account-dropdown-name">' +
          escapeHtml(name) +
          "</p>" +
          '<p class="account-dropdown-email">' +
          escapeHtml(currentUser.email) +
          "</p>" +
          '<div class="account-dropdown-bal">Số dư ví<strong id="dropdownWalletBal">' +
          moneyText(bal) +
          "</strong>" +
          '<a href="nap-tien.html" style="display:inline-block;margin-top:6px;font-size:12px;font-weight:700;color:#dc2626;text-decoration:none">Nạp tiền →</a>' +
          "</div></div>" +
          '<a class="account-dropdown-item" role="menuitem" href="tai-khoan.html#profile">Thông tin tài khoản</a>' +
          '<a class="account-dropdown-item" role="menuitem" href="tai-khoan.html#orders">Đơn hàng</a>' +
          '<a class="account-dropdown-item" role="menuitem" href="tai-khoan.html#wallet">Ví của tôi</a>' +
          '<a class="account-dropdown-item" role="menuitem" href="tai-khoan.html#security">Bảo mật</a>' +
          '<button type="button" class="account-dropdown-item account-dropdown-logout" id="headerLogoutBtn">Đăng xuất</button>';
        document.getElementById("headerLogoutBtn")?.addEventListener("click", async () => {
          closeAccountMenu();
          await logout();
          VuammoApi.showToast("Đã đăng xuất");
          location.href = "tai-khoan.html";
        });
      }
    } else {
      if (accountBtn) {
        accountBtn.href = "tai-khoan.html";
        accountBtn.removeAttribute("role");
        accountBtn.title = "Đăng nhập";
        paintAccountButton(accountBtn, null);
      }
      if (menu) menu.innerHTML = "";
    }
  }

  function _wireHeaderAfterNormalize() {
    renderHeaderUser();
  }

  async function login(email, password) {
    const data = await VuammoApi.api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (data.token) VuammoApi.setToken(data.token);
    currentUser = data.user;
    renderHeaderUser();
    return data.user;
  }

  async function register(email, password, name) {
    const data = await VuammoApi.api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name })
    });
    if (data.token) VuammoApi.setToken(data.token);
    currentUser = data.user;
    renderHeaderUser();
    return data.user;
  }

  async function logout() {
    try {
      await VuammoApi.api("/auth/logout", { method: "POST", body: "{}" });
    } catch (_) {}
    VuammoApi.setToken("");
    currentUser = null;
    renderHeaderUser();
  }

  function requireLogin(nextUrl) {
    if (currentUser) return true;
    const next = nextUrl || location.pathname.split("/").pop() + location.search;
    location.href = "tai-khoan.html?next=" + encodeURIComponent(next);
    return false;
  }

  function wireAccountPage() {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const panel = document.getElementById("accountApp");
    if (!panel && !loginForm && !registerForm) return;

    if (currentUser && panel && window.VuammoAccountDash) {
      VuammoAccountDash.mount(panel, currentUser);
      return;
    }

    if (currentUser && panel) {
      panel.innerHTML =
        '<div class="account-dash"><p>Đang tải dashboard…</p></div>';
      return;
    }

    loginForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginUser").value.trim();
      const password = document.getElementById("loginPass").value;
      try {
        await login(email, password);
        VuammoApi.showToast("Đăng nhập thành công");
        redirectAfterAuth();
      } catch (err) {
        VuammoApi.showToast(err.message || "Đăng nhập thất bại");
      }
    });

    registerForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("regEmail").value.trim();
      const password = document.getElementById("regPass").value;
      const nameEl = document.getElementById("regName");
      const name = nameEl ? nameEl.value.trim() : "";
      try {
        await register(email, password, name);
        VuammoApi.showToast("Đăng ký thành công");
        redirectAfterAuth();
      } catch (err) {
        VuammoApi.showToast(err.message || "Đăng ký thất bại");
      }
    });

    document.getElementById("googleLoginBtn")?.addEventListener("click", () => {
      VuammoApi.showToast("Đăng nhập Google sẽ có ở giai đoạn sau");
    });
  }

  window.VuammoAuth = {
    refreshMe,
    login,
    register,
    logout,
    requireLogin,
    getUser: () => currentUser,
    renderHeaderUser,
    wireAccountPage,
    _wireHeaderAfterNormalize
  };

  async function boot() {
    if (VuammoApi.getToken()) await refreshMe();
    else renderHeaderUser();
    wireAccountPage();
    const userBtn = document.getElementById("userBtn");
    if (userBtn) {
      userBtn.addEventListener("click", () => {
        location.href = "tai-khoan.html";
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
