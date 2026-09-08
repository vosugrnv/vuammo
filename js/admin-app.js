/* Vua MMO Admin SPA — UI kiểu ZENA, nghiệp vụ Vua MMO */
(function () {
  const money = (n) =>
    window.VuammoApi && VuammoApi.money
      ? VuammoApi.money(n)
      : Number(n || 0).toLocaleString("vi-VN") + "₫";
  const esc = (s) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const ORDER_LABELS = {
    all: "Tất cả",
    paid: "Đã thanh toán",
    delivered: "Đã giao",
    disputed: "Khiếu nại",
    released: "Hoàn tất",
    refunded: "Đã hoàn"
  };
  const TYPE_LABELS = {
    topup: "Nạp tiền",
    purchase: "Mua hàng",
    refund: "Hoàn / trừ",
    release: "Giải ngân"
  };

  const state = {
    view: "dashboard",
    user: null,
    supportVisitor: null,
    shopToken: null,
    shopName: null,
    shopVisitor: null,
    orders: { status: "all", range: "all", q: "", from: "", to: "" },
    disputes: { status: "all", q: "" },
    ledger: { type: "all", q: "" },
    blog: { q: "", status: "all", locale: "all", category: "all" },
    badges: {},
    badgeTimer: null
  };

  function getCatalogProducts() {
    try {
      if (typeof RAW_PRODUCTS !== "undefined" && Array.isArray(RAW_PRODUCTS)) return RAW_PRODUCTS;
    } catch (_) {}
    return Array.isArray(window.RAW_PRODUCTS) ? window.RAW_PRODUCTS : [];
  }
  function getCatalogShops() {
    try {
      if (typeof VUAMMO_SHOPS !== "undefined" && Array.isArray(VUAMMO_SHOPS)) return VUAMMO_SHOPS;
    } catch (_) {}
    return Array.isArray(window.VUAMMO_SHOPS) ? window.VUAMMO_SHOPS : [];
  }

  /** Map mã SP/biến thể → { title, subtitle } để hiển thị tồn kho */
  let _stockNameMap = null;
  function getStockNameMap() {
    if (_stockNameMap) return _stockNameMap;
    const map = Object.create(null);
    getCatalogProducts().forEach((p) => {
      const name = p.name || ("SP #" + p.id);
      if (Array.isArray(p.variants) && p.variants.length) {
        p.variants.forEach((v) => {
          map[String(v.id)] = {
            title: name,
            subtitle: v.label || ("Biến thể #" + v.id)
          };
        });
      }
      map[String(p.id)] = { title: name, subtitle: "" };
    });
    _stockNameMap = map;
    return map;
  }
  function stockProductLabel(productId) {
    const m = getStockNameMap()[String(productId)];
    if (!m) return { title: "Không tìm thấy tên", subtitle: "" };
    return m;
  }

  function getSharePosts() {
    try {
      if (typeof SHARE_POSTS !== "undefined" && Array.isArray(SHARE_POSTS)) return SHARE_POSTS;
    } catch (_) {}
    return Array.isArray(window.SHARE_POSTS) ? window.SHARE_POSTS : [];
  }

  function slugifyText(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
  }

  function wrapTextarea(el, before, after) {
    if (!el) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const val = el.value || "";
    const sel = val.slice(start, end) || "…";
    el.value = val.slice(0, start) + before + sel + after + val.slice(end);
    el.focus();
    const pos = start + before.length + sel.length + after.length;
    el.setSelectionRange(pos, pos);
  }

  async function uploadAdminFile(file) {
    if (!file) throw new Error("Chưa chọn file");
    const dataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error("Không đọc được file"));
      fr.readAsDataURL(file);
    });
    const data = await api("/admin/upload", {
      method: "POST",
      body: JSON.stringify({ data: dataUrl, filename: file.name })
    });
    return data.url;
  }

  function wireSeoCounter(inputId, labelCntId, max) {
    const input = document.getElementById(inputId);
    const cnt = document.getElementById(labelCntId);
    if (!input || !cnt) return;
    const tick = () => {
      const n = String(input.value || "").length;
      cnt.textContent = n + "/" + max;
      cnt.style.color = n > max ? "#dc2626" : "#94a3b8";
    };
    input.addEventListener("input", tick);
    tick();
  }

  function filterSelect(id, label, options, cur) {
    return (
      '<div class="adm-field"><label>' +
      esc(label) +
      '</label><select id="' +
      id +
      '">' +
      options
        .map(
          (o) =>
            '<option value="' +
            esc(o.v) +
            '"' +
            (String(cur) === String(o.v) ? " selected" : "") +
            ">" +
            esc(o.t) +
            "</option>"
        )
        .join("") +
      "</select></div>"
    );
  }

  function api(path, opts) {
    return VuammoApi.api(path, opts);
  }

  function fmt(d) {
    try {
      return new Date(d).toLocaleString("vi-VN");
    } catch {
      return String(d || "");
    }
  }
  function fmtTime(d) {
    try {
      const x = new Date(d);
      return (
        x.toLocaleTimeString("vi-VN", { hour12: false }) +
        "<br><span class=\"adm-cell-sub\">" +
        x.toLocaleDateString("vi-VN") +
        "</span>"
      );
    } catch {
      return esc(d);
    }
  }
  function statusTag(st) {
    const map = {
      paid: "warn",
      delivered: "info",
      disputed: "bad",
      released: "ok",
      refunded: "pink",
      open: "warn",
      resolved: "ok",
      rejected: "bad"
    };
    return (
      '<span class="adm-tag ' +
      (map[st] || "") +
      '">' +
      esc(ORDER_LABELS[st] || st) +
      "</span>"
    );
  }
  function moneyCls(n) {
    if (n > 0) return '<span class="adm-money-pos">+' + money(n) + "</span>";
    if (n < 0) return '<span class="adm-money-neg">' + money(n) + "</span>";
    return '<span class="adm-money-zero">' + money(0) + "</span>";
  }
  function shopOfItem(item) {
    return item.seller || item.shopName || item.shop || "—";
  }
  function toast(msg) {
    if (window.VuammoApi && VuammoApi.showToast) VuammoApi.showToast(msg);
    else alert(msg);
  }

  function setView(view) {
    state.view = view;
    document.querySelectorAll(".adm-nav button").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === view);
    });
    const title = document.getElementById("admTitle");
    const sub = document.getElementById("admSub");
    const map = {
      dashboard: ["Dashboard", "Theo dõi doanh thu, đơn hàng và hoạt động sàn Vua MMO"],
      orders: [
        "Đơn hàng",
        "Lọc theo trạng thái · tìm khách · giao / huỷ / hoàn tất đơn số"
      ],
      disputes: [
        "Khiếu nại",
        "Admin cập nhật trạng thái xử lý khiếu nại đơn hàng tại đây"
      ],
      products: ["Sản phẩm", "Ẩn/hiện catalog · ghi chú · gắn nhập kho nhanh"],
      stock: ["Tồn kho", "Thêm / xoá dòng hàng giao tự động (1 dòng = 1 đơn vị)"],
      shops: ["Gian hàng", "80 shop thật — chỉnh hồ sơ, bật/tắt hiển thị từng shop"],
      virtualShops: [
        "Shop ảo",
        "Shop filler hiển thị khám phá — tách biệt 80 gian hàng thật"
      ],
      promos: [
        "Khuyến mãi",
        "Chọn hiện công khai hoặc chỉ nhập mã; giới hạn số lần mỗi user (0 = không giới hạn)."
      ],
      notifications: [
        "Thông báo",
        "Gửi thông báo hệ thống tới tất cả khách / nhóm audience"
      ],
      blog: ["Blog / Viết bài", "Đồng bộ từ website · form SEO đầy đủ · publish lên Chia sẻ"],
      users: ["Quản lý Users", "Danh sách tài khoản khách trên Vua MMO"],
      blacklist: [
        "Blacklist",
        "User trong list bị chặn mua hàng. Gỡ blacklist để mở lại."
      ],
      wallet: [
        "Ví người dùng",
        "Tất cả user và số dư (mặc định 0₫ nếu chưa có giao dịch). Nạp / trừ thủ công."
      ],
      ledger: [
        "Giao dịch ví",
        "Lịch sử nạp PayOS · mua hàng · hoàn / điều chỉnh admin"
      ],
      chatSupport: [
        "Chat Vua MMO ↔ Khách",
        "Kênh hỗ trợ sàn — tách biệt hoàn toàn với chat shop"
      ],
      chatShop: [
        "Chat Shop ↔ Khách",
        "Mỗi shop một phòng chat riêng (80 phòng) — không lẫn sang support"
      ]
    };
    const t = map[view] || ["Admin", ""];
    if (title) title.textContent = t[0];
    if (sub) sub.textContent = t[1];
    const actions = document.getElementById("admTopActions");
    if (actions) {
      actions.innerHTML =
        '<button type="button" class="btn btn-outline" id="admRefresh">Làm mới</button>';
      document.getElementById("admRefresh")?.addEventListener("click", () => render());
    }
    render();
  }

  async function boot() {
    const mount = document.getElementById("admRoot");
    if (!mount) return;
    await VuammoAuth.refreshMe();
    const user = VuammoAuth.getUser();
    if (!user) {
      mount.innerHTML = loginHtml();
      wireLogin();
      return;
    }
    if (user.isAdmin === false) {
      mount.innerHTML =
        '<div class="adm-login"><h1>Không có quyền admin</h1><p>Tài khoản ' +
        esc(user.email) +
        " chưa nằm trong ADMIN_EMAILS.</p>" +
        '<a class="btn btn-outline" href="index.html">Về trang chủ</a></div>';
      return;
    }
    state.user = user;
    mount.innerHTML = shellHtml(user);
    document.querySelectorAll(".adm-nav button").forEach((b) => {
      b.addEventListener("click", () => setView(b.dataset.view));
    });
    document.getElementById("admLogout")?.addEventListener("click", async () => {
      await VuammoAuth.logout();
      location.reload();
    });
    setView("dashboard");
    refreshBadges();
    if (state.badgeTimer) clearInterval(state.badgeTimer);
    state.badgeTimer = setInterval(refreshBadges, 20000);
  }

  async function refreshBadges() {
    try {
      const b = await api("/admin/badges");
      state.badges = b || {};
      document.querySelectorAll("[data-badge]").forEach((el) => {
        const key = el.getAttribute("data-badge");
        const n = Number(b[key] || 0);
        if (n > 0) {
          el.textContent = n > 99 ? "99+" : String(n);
          el.classList.remove("hidden");
        } else {
          el.textContent = "";
          el.classList.add("hidden");
        }
      });
    } catch (_) {}
  }

  function loginHtml() {
    return (
      '<div class="adm-login"><h1>Vua MMO Admin</h1>' +
      "<p>Đăng nhập tài khoản quản trị để theo dõi đơn, ví, kho và chat.</p>" +
      '<form id="admLoginForm">' +
      "<label>Email</label><input name=\"email\" type=\"email\" required>" +
      "<label>Mật khẩu</label><input name=\"password\" type=\"password\" required>" +
      '<div class="adm-actions"><button class="btn btn-primary" type="submit">Đăng nhập</button>' +
      '<a class="btn btn-outline" href="tai-khoan.html">Tạo tài khoản</a></div>' +
      '<p class="adm-muted" id="admLoginErr"></p></form></div>'
    );
  }

  function wireLogin() {
    document.getElementById("admLoginForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await VuammoAuth.login(String(fd.get("email")), String(fd.get("password")));
        location.reload();
      } catch (err) {
        const el = document.getElementById("admLoginErr");
        if (el) el.textContent = err.message || "Đăng nhập thất bại";
      }
    });
  }

  function ico(path) {
    return (
      '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      path +
      "</svg>"
    );
  }

  function shellHtml(user) {
    return (
      '<div class="adm-shell">' +
      '<aside class="adm-side">' +
      '<div class="adm-brand"><img src="images/logo-vuammo.png" alt="">' +
      "<div><strong>Vua MMO Admin</strong><span>Điều hành đơn, shop, ví &amp; chat</span></div></div>" +
      '<nav class="adm-nav">' +
      '<div class="adm-nav-label">Tổng quan</div>' +
      btn("dashboard", "Dashboard", "M3 12h18M3 6h18M3 18h18") +
      '<div class="adm-nav-label">Vận hành</div>' +
      btn("orders", "Đơn hàng", "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2") +
      btn("disputes", "Khiếu nại", "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z") +
      btn("products", "Sản phẩm", "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4") +
      btn("stock", "Tồn kho", "M4 7h16M4 12h16M4 17h10") +
      btn("shops", "Gian hàng", "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6") +
      btn("virtualShops", "Shop ảo", "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z") +
      btn("promos", "Khuyến mãi", "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z") +
      btn("notifications", "Thông báo", "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9") +
      btn("blog", "Blog / Viết bài", "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z") +
      btn("blacklist", "Blacklist", "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636") +
      '<div class="adm-nav-label">Chat</div>' +
      btn("chatSupport", "Chat Vua MMO ↔ Khách", "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z") +
      btn("chatShop", "Chat Shop ↔ Khách", "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-1") +
      '<div class="adm-nav-label">Tài chính &amp; Users</div>' +
      btn("users", "Quản lý Users", "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z") +
      btn("wallet", "Ví người dùng", "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z") +
      btn("ledger", "Giao dịch ví", "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2") +
      "</nav>" +
      '<div class="adm-side-foot">' +
      esc(user.email) +
      '<br><button type="button" class="btn btn-ghost" id="admLogout" style="margin-top:8px">Đăng xuất</button>' +
      '<br><a href="index.html">← Về website</a></div></aside>' +
      '<div class="adm-main"><header class="adm-top"><div><h1 id="admTitle">Dashboard</h1>' +
      '<p id="admSub"></p></div><div class="adm-top-actions" id="admTopActions"></div></header>' +
      '<div class="adm-body" id="admBody"></div></div></div>'
    );
  }

  function btn(view, label, path) {
    return (
      '<button type="button" data-view="' +
      view +
      '">' +
      ico('<path stroke-linecap="round" stroke-linejoin="round" d="' + path + '"/>') +
      '<span class="adm-nav-label-text">' +
      label +
      "</span>" +
      '<span class="badge hidden" data-badge="' +
      view +
      '"></span></button>'
    );
  }

  async function render() {
    const body = document.getElementById("admBody");
    if (!body) return;
    body.innerHTML = '<p class="adm-muted">Đang tải…</p>';
    try {
      if (state.view === "dashboard") await renderDashboard(body);
      else if (state.view === "orders") await renderOrders(body);
      else if (state.view === "disputes") await renderDisputes(body);
      else if (state.view === "products") await renderProducts(body);
      else if (state.view === "stock") await renderStock(body);
      else if (state.view === "shops") await renderShops(body);
      else if (state.view === "virtualShops") await renderVirtualShops(body);
      else if (state.view === "promos") await renderPromos(body);
      else if (state.view === "notifications") await renderNotifications(body);
      else if (state.view === "blog") await renderBlog(body);
      else if (state.view === "users") await renderUsers(body);
      else if (state.view === "blacklist") await renderBlacklist(body);
      else if (state.view === "wallet") await renderWallet(body);
      else if (state.view === "ledger") await renderLedger(body);
      else if (state.view === "chatSupport") await renderChatSupport(body);
      else if (state.view === "chatShop") await renderChatShop(body);
    } catch (err) {
      body.innerHTML = '<p class="adm-muted">' + esc(err.message) + "</p>";
    }
    refreshBadges();
  }

  function stat(label, value, cls) {
    return (
      '<div class="adm-stat"><span>' +
      esc(label) +
      "</span><b" +
      (cls ? ' class="' + cls + '"' : "") +
      ">" +
      value +
      "</b></div>"
    );
  }

  async function renderDashboard(body) {
    const data = await api("/admin/dashboard");
    const s = data.stats;
    body.innerHTML =
      (s.payosMock
        ? '<div class="adm-card"><span class="adm-tag warn">PayOS đang MOCK</span> — nạp tiền chưa thu thật. Cần gắn key PayOS live.</div>'
        : "") +
      '<div class="adm-grid">' +
      stat("Doanh thu đơn", money(s.orderRevenue)) +
      stat("Đã trừ ví (mua)", money(s.purchaseVolume), "neg") +
      stat("Đã nạp ví", money(s.topupVolume), "pos") +
      stat("Đơn hàng", s.orders) +
      stat("Users", s.users) +
      stat("Tồn kho còn", s.stockAvailable) +
      stat("Khiếu nại mở", s.openDisputes, s.openDisputes ? "warn" : "") +
      "</div>" +
      '<div class="adm-card"><div class="adm-card-head"><h2>Đơn gần đây</h2>' +
      '<button type="button" class="btn btn-outline btn-sm" id="goOrders">Xem tất cả</button></div>' +
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>Mã</th><th>Khách</th><th>Sản phẩm</th><th>Giá</th><th>Trạng thái</th><th>Ngày</th>" +
      "</tr></thead><tbody>" +
      (data.recentOrders || [])
        .map((o) => {
          const items = (o.items || []).map((i) => i.name).join(", ");
          return (
            "<tr><td>#" +
            esc(o.code || String(o.id).slice(0, 8)) +
            '</td><td><span class="adm-cell-main">' +
            esc((o.items && o.items[0] && shopOfItem(o.items[0])) || "—") +
            "</span></td><td>" +
            esc(items) +
            "</td><td>" +
            money(o.total) +
            "</td><td>" +
            statusTag(o.status) +
            "</td><td>" +
            fmtTime(o.createdAt) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div></div>";
    document.getElementById("goOrders")?.addEventListener("click", () => setView("orders"));
  }

  async function renderOrders(body) {
    const f = state.orders;
    const qs = new URLSearchParams({
      limit: "100",
      status: f.status,
      range: f.range,
      q: f.q,
      from: f.from,
      to: f.to
    });
    const data = await api("/admin/orders?" + qs.toString());
    const c = data.counts || {};
    const pills = ["all", "paid", "delivered", "disputed", "released", "refunded"]
      .map((st) => {
        const n = c[st] != null ? c[st] : st === "all" ? c.all || 0 : 0;
        return (
          '<button type="button" class="adm-pill' +
          (f.status === st ? " active" : "") +
          '" data-st="' +
          st +
          '">' +
          esc(ORDER_LABELS[st]) +
          " (" +
          n +
          ")</button>"
        );
      })
      .join("");

    body.innerHTML =
      '<div class="adm-hint">Đơn số giao tự động từ kho. Dùng <b>Hoàn tất</b> khi đã xong hold, <b>Huỷ / hoàn</b> khi cần refund thủ công.</div>' +
      '<div class="adm-pills" id="ordPills">' +
      pills +
      "</div>" +
      '<div class="adm-card"><div class="adm-filters">' +
      '<div class="adm-range-btns" id="ordRange">' +
      rangeBtn("all", "Mọi ngày", f.range) +
      rangeBtn("today", "Hôm nay", f.range) +
      rangeBtn("7d", "7 ngày", f.range) +
      rangeBtn("30d", "30 ngày", f.range) +
      "</div>" +
      '<div class="adm-field"><label>Từ ngày</label><input type="date" id="ordFrom" value="' +
      esc(f.from) +
      '"></div>' +
      '<div class="adm-field"><label>Đến ngày</label><input type="date" id="ordTo" value="' +
      esc(f.to) +
      '"></div>' +
      '<input class="adm-search" id="ordQ" placeholder="Tìm email / tên / mã đơn…" value="' +
      esc(f.q) +
      '">' +
      '<button type="button" class="btn btn-primary" id="ordApply">Lọc</button>' +
      "</div></div>" +
      '<div class="adm-card"><div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>ID</th><th>Khách</th><th>Shop</th><th>Sản phẩm</th><th>Giá</th><th>Trạng thái</th><th>Ngày</th><th></th>" +
      "</tr></thead><tbody>" +
      (data.orders || [])
        .map((o) => {
          const shops = [
            ...new Set((o.items || []).map((i) => shopOfItem(i)).filter(Boolean))
          ].join(", ");
          const items = (o.items || []).map((i) => esc(i.name) + " ×" + i.qty).join("<br>");
          const canDone = o.status === "delivered" || o.status === "paid";
          const canCancel = o.status !== "refunded" && o.status !== "released";
          return (
            '<tr data-id="' +
            o.id +
            '"><td>#' +
            esc(o.code || String(o.id).slice(0, 8)) +
            '</td><td><span class="adm-cell-main">' +
            esc(o.buyerName || "—") +
            '</span><span class="adm-cell-sub">' +
            esc(o.buyerEmail) +
            "</span></td><td>" +
            esc(shops || "—") +
            "</td><td>" +
            items +
            "</td><td><b>" +
            money(o.total) +
            "</b></td><td>" +
            statusTag(o.status) +
            (o.dispute
              ? '<div class="adm-tag bad" style="margin-top:4px">KN: ' +
                esc(o.dispute.reason || "") +
                "</div>"
              : "") +
            "</td><td>" +
            fmtTime(o.createdAt) +
            '</td><td><div class="adm-row-actions">' +
            '<button type="button" class="btn btn-outline btn-sm js-detail">Chi tiết</button>' +
            (canCancel
              ? '<button type="button" class="btn btn-danger btn-sm js-cancel">Huỷ / hoàn</button>'
              : "") +
            (canDone
              ? '<button type="button" class="btn btn-ok btn-sm js-done">Hoàn tất</button>'
              : "") +
            "</div></td></tr>"
          );
        })
        .join("") ||
      '<tr><td colspan="8" class="adm-empty">Chưa có đơn phù hợp bộ lọc</td></tr>' +
      "</tbody></table></div></div>";

    document.getElementById("ordPills")?.querySelectorAll(".adm-pill").forEach((b) => {
      b.addEventListener("click", () => {
        state.orders.status = b.getAttribute("data-st");
        renderOrders(body);
      });
    });
    document.getElementById("ordRange")?.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        state.orders.range = b.getAttribute("data-r");
        state.orders.from = "";
        state.orders.to = "";
        renderOrders(body);
      });
    });
    document.getElementById("ordApply")?.addEventListener("click", () => {
      state.orders.q = document.getElementById("ordQ").value.trim();
      state.orders.from = document.getElementById("ordFrom").value;
      state.orders.to = document.getElementById("ordTo").value;
      if (state.orders.from || state.orders.to) state.orders.range = "all";
      renderOrders(body);
    });
    body.querySelectorAll(".js-detail").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.closest("tr").getAttribute("data-id");
        const o = (data.orders || []).find((x) => x.id === id);
        if (!o) return;
        const delivery = Array.isArray(o.delivery)
          ? o.delivery
              .map((d) => (d.lines || []).join("\n"))
              .filter(Boolean)
              .join("\n---\n")
          : o.deliveryNote || "(chưa có payload)";
        alert(
          "Đơn #" +
            id +
            "\nKhách: " +
            o.buyerEmail +
            "\nTT: " +
            o.status +
            "\nTổng: " +
            money(o.total) +
            "\n\nGiao hàng:\n" +
            delivery
        );
      });
    });
    body.querySelectorAll(".js-cancel").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Đánh dấu đơn hoàn / refund?")) return;
        const id = btn.closest("tr").getAttribute("data-id");
        await api("/admin/orders/" + id, {
          method: "PATCH",
          body: JSON.stringify({ status: "refunded" })
        });
        toast("Đã huỷ / hoàn đơn");
        renderOrders(body);
      });
    });
    body.querySelectorAll(".js-done").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.closest("tr").getAttribute("data-id");
        await api("/admin/orders/" + id, {
          method: "PATCH",
          body: JSON.stringify({ status: "released" })
        });
        toast("Đã hoàn tất đơn");
        renderOrders(body);
      });
    });
  }

  function rangeBtn(id, label, cur) {
    return (
      '<button type="button" data-r="' +
      id +
      '" class="' +
      (cur === id ? "active" : "") +
      '">' +
      label +
      "</button>"
    );
  }

  async function renderDisputes(body) {
    const f = state.disputes;
    const qs = new URLSearchParams({ status: f.status, q: f.q });
    const data = await api("/admin/disputes?" + qs.toString());
    const c = data.counts || {};
    const pills = ["all", "open", "resolved", "rejected"]
      .map((st) => {
        const labels = {
          all: "Tất cả",
          open: "Mới / mở",
          resolved: "Đã xử lý",
          rejected: "Từ chối"
        };
        return (
          '<button type="button" class="adm-pill' +
          (f.status === st ? " active" : "") +
          '" data-st="' +
          st +
          '">' +
          labels[st] +
          " (" +
          (c[st] || 0) +
          ")</button>"
        );
      })
      .join("");
    body.innerHTML =
      '<div class="adm-pills" id="dpPills">' +
      pills +
      "</div>" +
      '<div class="adm-card"><div class="adm-filters">' +
      '<input class="adm-search" id="dpQ" placeholder="Tìm lý do, mã đơn, email…" value="' +
      esc(f.q) +
      '">' +
      '<button type="button" class="btn btn-outline" id="dpRefresh">Làm mới</button></div></div>' +
      '<div class="adm-card"><div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>Đơn</th><th>Khách</th><th>Lý do</th><th>Tổng</th><th>TT KN</th><th>Ngày</th><th></th>" +
      "</tr></thead><tbody>" +
      ((data.disputes || []).length
        ? data.disputes
            .map(
              (d) =>
                '<tr data-id="' +
                d.id +
                '"><td>#' +
                esc(d.orderCode || String(d.orderId).slice(0, 8)) +
                '</td><td><span class="adm-cell-main">' +
                esc(d.name || "—") +
                '</span><span class="adm-cell-sub">' +
                esc(d.email) +
                "</span></td><td>" +
                esc(d.reason) +
                "</td><td>" +
                money(d.total) +
                "</td><td>" +
                statusTag(d.status) +
                "</td><td>" +
                fmtTime(d.createdAt) +
                '</td><td><div class="adm-row-actions">' +
                (d.status === "open"
                  ? '<button type="button" class="btn btn-ok btn-sm js-res">Đã xử lý</button>' +
                    '<button type="button" class="btn btn-danger btn-sm js-rej">Từ chối</button>'
                  : "") +
                "</div></td></tr>"
            )
            .join("")
        : '<tr><td colspan="7" class="adm-empty">Chưa có khiếu nại nào</td></tr>') +
      "</tbody></table></div></div>";

    document.getElementById("dpPills")?.querySelectorAll(".adm-pill").forEach((b) => {
      b.addEventListener("click", () => {
        state.disputes.status = b.getAttribute("data-st");
        renderDisputes(body);
      });
    });
    document.getElementById("dpRefresh")?.addEventListener("click", () => {
      state.disputes.q = document.getElementById("dpQ").value.trim();
      renderDisputes(body);
    });
    body.querySelectorAll(".js-res").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await api("/admin/disputes/" + btn.closest("tr").getAttribute("data-id"), {
          method: "PATCH",
          body: JSON.stringify({ status: "resolved" })
        });
        toast("Đã xử lý khiếu nại");
        renderDisputes(body);
      });
    });
    body.querySelectorAll(".js-rej").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await api("/admin/disputes/" + btn.closest("tr").getAttribute("data-id"), {
          method: "PATCH",
          body: JSON.stringify({ status: "rejected" })
        });
        toast("Đã từ chối khiếu nại");
        renderDisputes(body);
      });
    });
  }

  async function renderProducts(body) {
    const overrides = await api("/admin/products");
    const map = {};
    (overrides.overrides || []).forEach((o) => {
      map[o.product_id] = o;
    });
    let cmsProducts = [];
    try {
      const cmsData = await api("/admin/cms-products");
      cmsProducts = (cmsData.products || []).map((p) =>
        Object.assign({}, p, { source: "cms" })
      );
    } catch (_) {
      cmsProducts = [];
    }
    const catalog = getCatalogProducts();
    if (!catalog.length && !cmsProducts.length) {
      body.innerHTML =
        '<div class="adm-card"><span class="adm-tag bad">Lỗi tải catalog</span> Không đọc được <code>js/products-data.js</code>. Hard refresh (Ctrl+F5) hoặc kiểm tra file trên server.</div>';
      return;
    }
    const cmsIds = new Set(cmsProducts.map((p) => String(p.id)));
    const products = cmsProducts.concat(
      catalog
        .filter((p) => !cmsIds.has(String(p.id)))
        .map((p) => Object.assign({}, p, { source: p.source || "catalog" }))
    );
    const sellers = [
      ...new Set(products.map((p) => p.seller).filter(Boolean))
    ].sort();

    body.innerHTML =
      '<div class="adm-card"><div class="adm-card-head"><h2>Sản phẩm</h2>' +
      '<button type="button" class="btn btn-primary" id="prodNew">Sản phẩm mới</button></div>' +
      '<div id="prodCompose" class="hidden adm-compose">' +
      "<h3>Sản phẩm mới</h3>" +
      '<div class="adm-field"><label>Tên *</label><input id="npName" placeholder="Tên sản phẩm"></div>' +
      '<div class="adm-field"><label>Slug (auto)</label><input id="npSlug" placeholder="tu-dong-tu-ten"></div>' +
      '<div class="adm-field"><label>ID (tuỳ chọn)</label><input id="npId" placeholder="Để trống = tự sinh"></div>' +
      '<div class="adm-field"><label>Giá bán ₫ *</label><input id="npPrice" type="number" min="0" step="1000"></div>' +
      '<div class="adm-field"><label>Giá gốc ₫</label><input id="npRegular" type="number" min="0" step="1000"></div>' +
      '<div class="adm-field"><label>Ảnh (URL)</label><input id="npImage" placeholder="https://… hoặc /uploads/…"></div>' +
      '<div class="adm-field"><label>Upload ảnh</label><div class="adm-file-row">' +
      '<input type="file" id="npImageFile" accept="image/*">' +
      '<button type="button" class="btn btn-outline btn-sm" id="npImageUp">Upload</button></div>' +
      '<img id="npImagePreview" class="adm-preview-img hidden" alt=""></div>' +
      '<div class="adm-field"><label>Seller</label><input id="npSeller" placeholder="Tên gian hàng"></div>' +
      '<div class="adm-field"><label>Seller token</label><input id="npSellerToken" placeholder="token shop"></div>' +
      '<div class="adm-field"><label>Cats (phẩy)</label><input id="npCats" placeholder="ai, tool, account"></div>' +
      '<div class="adm-field"><label>Mô tả</label><textarea id="npDesc" rows="4"></textarea></div>' +
      '<div class="adm-field"><label>SEO title <span class="cnt" id="npMetaTitleCnt">0/60</span></label>' +
      '<input id="npMetaTitle" maxlength="70"></div>' +
      '<div class="adm-field"><label>Meta description <span class="cnt" id="npMetaDescCnt">0/155</span></label>' +
      '<textarea id="npMetaDesc" rows="2"></textarea></div>' +
      '<div class="adm-field"><label>Stock (hiển thị)</label><input id="npStock" type="number" value="100" min="0"></div>' +
      '<div class="adm-compose-actions">' +
      '<button type="button" class="btn btn-primary" id="npSave">Lưu sản phẩm</button>' +
      '<button type="button" class="btn btn-outline" id="npCancel">Huỷ</button></div></div></div>' +
      '<div class="adm-card"><h2>Chỉnh sản phẩm (override)</h2>' +
      '<div class="adm-form-grid">' +
      '<div class="adm-field"><label>ID sản phẩm</label><input id="pId" placeholder="VD 1189"></div>' +
      '<div class="adm-field"><label>Tên hiển thị (tuỳ chọn)</label><input id="pName"></div>' +
      '<div class="adm-field"><label>Giá mới ₫ (tuỳ chọn)</label><input id="pPrice" type="number"></div>' +
      '<div class="adm-field span2"><label>Ghi chú nội bộ</label><input id="pNote" placeholder="VD hết hàng nhà cung cấp"></div>' +
      '<div class="adm-field"><label>&nbsp;</label><button type="button" class="btn btn-primary" id="pSave" style="width:100%">Lưu override</button></div>' +
      "</div></div>" +
      '<div class="adm-card"><div class="adm-card-head"><h2>Catalog (' +
      products.length +
      " SP · CMS " +
      cmsProducts.length +
      ")</h2></div>" +
      '<div class="adm-filters">' +
      '<input class="adm-search" id="prodFilter" placeholder="Lọc tên / id / shop…">' +
      filterSelect(
        "prodShop",
        "Shop",
        [{ v: "all", t: "Mọi shop" }].concat(sellers.map((s) => ({ v: s, t: s }))),
        "all"
      ) +
      filterSelect(
        "prodActive",
        "Hiển thị",
        [
          { v: "all", t: "Tất cả" },
          { v: "on", t: "Đang hiện" },
          { v: "off", t: "Đã ẩn" }
        ],
        "all"
      ) +
      '<button type="button" class="btn btn-outline" id="prodApply">Lọc</button></div>' +
      '<p class="adm-muted" id="prodCount" style="margin:10px 0"></p>' +
      '<div class="adm-table-wrap"><table class="adm-table" id="prodTable"><thead><tr>' +
      "<th>ID</th><th>Tên</th><th>Giá</th><th>Shop</th><th>Nguồn</th><th>Hiển thị</th><th></th>" +
      "</tr></thead><tbody></tbody></table></div></div>";

    const compose = document.getElementById("prodCompose");
    let slugManual = false;
    document.getElementById("prodNew")?.addEventListener("click", () => {
      compose.classList.remove("hidden");
      slugManual = false;
      compose.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    document.getElementById("npCancel")?.addEventListener("click", () => {
      compose.classList.add("hidden");
    });
    document.getElementById("npName")?.addEventListener("input", () => {
      if (slugManual) return;
      document.getElementById("npSlug").value = slugifyText(
        document.getElementById("npName").value
      );
    });
    document.getElementById("npSlug")?.addEventListener("input", () => {
      slugManual = true;
    });
    wireSeoCounter("npMetaTitle", "npMetaTitleCnt", 60);
    wireSeoCounter("npMetaDesc", "npMetaDescCnt", 155);
    const syncNpPreview = () => {
      const url = document.getElementById("npImage")?.value.trim();
      const img = document.getElementById("npImagePreview");
      if (!img) return;
      if (url) {
        img.src = url;
        img.classList.remove("hidden");
      } else img.classList.add("hidden");
    };
    document.getElementById("npImage")?.addEventListener("input", syncNpPreview);
    document.getElementById("npImageUp")?.addEventListener("click", async () => {
      const file = document.getElementById("npImageFile")?.files?.[0];
      if (!file) return toast("Chọn file ảnh");
      try {
        const url = await uploadAdminFile(file);
        document.getElementById("npImage").value = url;
        syncNpPreview();
        toast("Đã upload ảnh");
      } catch (e) {
        toast(e.message || "Upload lỗi");
      }
    });
    document.getElementById("npSave")?.addEventListener("click", async () => {
      const name = document.getElementById("npName").value.trim();
      if (!name) return toast("Nhập tên sản phẩm");
      const price = Number(document.getElementById("npPrice").value || 0);
      const regularRaw = document.getElementById("npRegular").value;
      const payload = {
        name,
        slug: document.getElementById("npSlug").value.trim() || slugifyText(name),
        id: document.getElementById("npId").value.trim() || undefined,
        price,
        regular: regularRaw === "" ? price : Number(regularRaw),
        image: document.getElementById("npImage").value.trim(),
        seller: document.getElementById("npSeller").value.trim(),
        sellerToken: document.getElementById("npSellerToken").value.trim(),
        catsText: document.getElementById("npCats").value.trim(),
        description: document.getElementById("npDesc").value.trim(),
        metaTitle: document.getElementById("npMetaTitle").value.trim(),
        metaDescription: document.getElementById("npMetaDesc").value.trim(),
        stock: Number(document.getElementById("npStock").value || 100)
      };
      await api("/admin/cms-products", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      toast("Đã tạo sản phẩm CMS");
      renderProducts(body);
    });

    document.getElementById("pSave")?.addEventListener("click", async () => {
      const id = document.getElementById("pId").value.trim();
      if (!id) return toast("Nhập ID sản phẩm");
      const priceRaw = document.getElementById("pPrice").value;
      await api("/admin/products/" + encodeURIComponent(id), {
        method: "PUT",
        body: JSON.stringify({
          productId: id,
          name: document.getElementById("pName").value.trim() || null,
          price: priceRaw === "" ? null : Number(priceRaw),
          note: document.getElementById("pNote").value.trim(),
          active: true
        })
      });
      toast("Đã lưu sản phẩm");
      renderProducts(body);
    });

    const tbody = body.querySelector("#prodTable tbody");
    function paint() {
      const needle = String(document.getElementById("prodFilter")?.value || "").toLowerCase();
      const shopF = document.getElementById("prodShop")?.value || "all";
      const actF = document.getElementById("prodActive")?.value || "all";
      const filtered = products.filter((p) => {
        const ov = map[String(p.id)] || {};
        const active = ov.active !== false && p.active !== false;
        if (shopF !== "all" && String(p.seller || "") !== shopF) return false;
        if (actF === "on" && !active) return false;
        if (actF === "off" && active) return false;
        if (!needle) return true;
        return (
          String(p.id).includes(needle) ||
          String(p.name || "").toLowerCase().includes(needle) ||
          String(p.seller || "").toLowerCase().includes(needle)
        );
      });
      const countEl = document.getElementById("prodCount");
      if (countEl) {
        countEl.textContent =
          "Hiển thị " + filtered.length + " / " + products.length + " sản phẩm";
      }
      tbody.innerHTML =
        (filtered.length
          ? filtered
              .map((p) => {
                const ov = map[String(p.id)] || {};
                const active = ov.active !== false && p.active !== false;
                const price = ov.price_cents != null ? Number(ov.price_cents) : p.price;
                const isCms = p.source === "cms";
                return (
                  '<tr data-id="' +
                  p.id +
                  '"><td>#' +
                  p.id +
                  '</td><td><span class="adm-cell-main">' +
                  esc(ov.name || p.name) +
                  "</span>" +
                  (ov.note ? '<span class="adm-cell-sub">' + esc(ov.note) + "</span>" : "") +
                  "</td><td>" +
                  money(price) +
                  "</td><td>" +
                  esc(p.seller || "") +
                  "</td><td>" +
                  (isCms
                    ? '<span class="adm-tag pink">cms</span>'
                    : '<span class="adm-tag">catalog</span>') +
                  "</td><td>" +
                  (active
                    ? '<span class="adm-tag ok">Hiện</span>'
                    : '<span class="adm-tag bad">Ẩn</span>') +
                  '</td><td><div class="adm-row-actions">' +
                  '<button type="button" class="btn btn-ghost btn-sm js-toggle-prod">' +
                  (active ? "Ẩn" : "Hiện") +
                  "</button>" +
                  '<a class="btn btn-outline btn-sm" href="kho-hang.html">Kho</a></div></td></tr>'
                );
              })
              .join("")
          : '<tr><td colspan="7" class="adm-empty">Không khớp bộ lọc</td></tr>');
      tbody.querySelectorAll(".js-toggle-prod").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.closest("tr").getAttribute("data-id");
          const ov = map[id] || {};
          const next = !(ov.active !== false);
          await api("/admin/products/" + id, {
            method: "PUT",
            body: JSON.stringify({ active: next })
          });
          map[id] = Object.assign({}, ov, { active: next, product_id: id });
          paint();
          toast(next ? "Đã hiện" : "Đã ẩn");
        });
      });
    }
    paint();
    document.getElementById("prodApply")?.addEventListener("click", paint);
    document.getElementById("prodFilter")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") paint();
    });
  }

  async function renderStock(body) {
    const data = await api("/stock");
    body.innerHTML =
      '<div class="adm-card"><h2>Nhập tồn kho</h2>' +
      '<div class="adm-form-grid">' +
      '<div class="adm-field"><label>Mã sản phẩm / biến thể</label><input id="stkId" placeholder="VD 1189"></div>' +
      '<div class="adm-field span2"><label>Dòng hàng (1 dòng = 1 đơn vị giao)</label><textarea id="stkText" rows="5" placeholder="user:pass&#10;key-xxxx"></textarea></div>' +
      '<div class="adm-field span3"><button type="button" class="btn btn-primary" id="stkImport">Lưu vào kho</button></div>' +
      "</div></div>" +
      '<div class="adm-card"><h2>Tồn hiện tại</h2>' +
      '<div class="adm-filters"><input class="adm-search" id="stkFilter" placeholder="Lọc mã hoặc tên sản phẩm…">' +
      filterSelect(
        "stkSort",
        "Sắp xếp",
        [
          { v: "avail", t: "Còn nhiều → ít" },
          { v: "id", t: "Theo mã" },
          { v: "name", t: "Theo tên" },
          { v: "empty", t: "Hết hàng trước" }
        ],
        "avail"
      ) +
      '<button type="button" class="btn btn-outline" id="stkFilterBtn">Lọc</button></div>' +
      '<div class="adm-table-wrap" style="margin-top:10px"><table class="adm-table"><thead><tr>' +
      "<th>Mã</th><th>Sản phẩm</th><th>Còn</th><th>Đã bán</th><th>Tổng</th><th></th></tr></thead><tbody id=\"stkRows\">" +
      "</tbody></table></div></div>";

    function paintStock() {
      const needle = String(document.getElementById("stkFilter")?.value || "").toLowerCase();
      const sort = document.getElementById("stkSort")?.value || "avail";
      let list = (data.products || []).slice();
      if (needle) {
        list = list.filter((p) => {
          const label = stockProductLabel(p.product_id);
          const hay =
            String(p.product_id).toLowerCase() +
            " " +
            String(label.title || "").toLowerCase() +
            " " +
            String(label.subtitle || "").toLowerCase();
          return hay.includes(needle);
        });
      }
      if (sort === "empty") list.sort((a, b) => a.available - b.available);
      else if (sort === "id")
        list.sort((a, b) => String(a.product_id).localeCompare(String(b.product_id)));
      else if (sort === "name")
        list.sort((a, b) =>
          stockProductLabel(a.product_id).title.localeCompare(
            stockProductLabel(b.product_id).title,
            "vi"
          )
        );
      else list.sort((a, b) => b.available - a.available);
      const box = document.getElementById("stkRows");
      box.innerHTML = list.length
        ? list
            .map((p) => {
              const label = stockProductLabel(p.product_id);
              return (
                '<tr data-id="' +
                esc(p.product_id) +
                '"><td>#' +
                esc(p.product_id) +
                '</td><td><span class="adm-cell-main">' +
                esc(label.title) +
                "</span>" +
                (label.subtitle
                  ? '<span class="adm-cell-sub">' + esc(label.subtitle) + "</span>"
                  : "") +
                "</td><td><b>" +
                p.available +
                "</b></td><td>" +
                p.sold +
                "</td><td>" +
                p.total +
                '</td><td><button type="button" class="btn btn-danger btn-sm js-void">Xóa tồn còn</button></td></tr>'
              );
            })
            .join("")
        : '<tr><td colspan="6" class="adm-empty">Chưa có tồn kho / không khớp lọc</td></tr>';
      box.querySelectorAll(".js-void").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const productId = btn.closest("tr").getAttribute("data-id");
          const count = Number(prompt("Xóa bao nhiêu dòng còn lại?", "10") || 0);
          if (!count) return;
          await api("/admin/stock/void", {
            method: "POST",
            body: JSON.stringify({ productId, count })
          });
          toast("Đã xóa tồn");
          renderStock(body);
        });
      });
    }
    document.getElementById("stkImport")?.addEventListener("click", async () => {
      const productId = document.getElementById("stkId").value.trim();
      const text = document.getElementById("stkText").value;
      await api("/stock/import", { method: "POST", body: JSON.stringify({ productId, text }) });
      toast("Đã nhập kho");
      renderStock(body);
    });
    paintStock();
    document.getElementById("stkFilterBtn")?.addEventListener("click", paintStock);
    document.getElementById("stkFilter")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") paintStock();
    });
  }

  async function renderShops(body) {
    const ovData = await api("/admin/shops");
    const ov = {};
    (ovData.overrides || []).forEach((s) => {
      ov[s.token] = s;
    });
    let cmsShops = [];
    try {
      const cmsData = await api("/admin/cms-shops");
      cmsShops = (cmsData.shops || []).map((s) =>
        Object.assign({}, s, { source: "cms" })
      );
    } catch (_) {
      cmsShops = [];
    }
    const catalog = getCatalogShops();
    const cmsTokens = new Set(cmsShops.map((s) => String(s.token)));
    const shops = cmsShops.concat(
      catalog
        .filter((s) => !cmsTokens.has(String(s.token)))
        .map((s) => Object.assign({}, s, { source: s.source || "catalog" }))
    );
    const hidden = shops.filter((s) => {
      const o = ov[s.token] || {};
      return o.active === false || s.active === false;
    }).length;
    body.innerHTML =
      '<div class="adm-hint"><b>Cách hoạt động</b><ul>' +
      "<li>CMS shops + catalog tĩnh, merge theo token (CMS ưu tiên).</li>" +
      "<li>Tắt shop = ẩn trên site (override active=false).</li>" +
      "<li>Mỗi shop có phòng chat riêng tại mục Chat Shop ↔ Khách.</li></ul></div>" +
      '<div class="adm-grid adm-grid-3">' +
      stat("Tổng gian hàng", shops.length) +
      stat("Đang hiện", shops.length - hidden, "pos") +
      stat("Đã tắt", hidden, hidden ? "warn" : "") +
      "</div>" +
      '<div class="adm-card"><div class="adm-card-head"><h2>Gian hàng</h2>' +
      '<button type="button" class="btn btn-primary" id="shopNew">Gian hàng mới</button></div>' +
      '<div id="shopCompose" class="hidden adm-compose">' +
      "<h3>Gian hàng mới</h3>" +
      '<div class="adm-field"><label>Tên *</label><input id="nsName" placeholder="Tên gian hàng"></div>' +
      '<div class="adm-field"><label>Slug</label><input id="nsSlug" placeholder="tu-dong-tu-ten"></div>' +
      '<div class="adm-field"><label>Token (tuỳ chọn / auto)</label><input id="nsToken" placeholder="Để trống = tự sinh"></div>' +
      '<div class="adm-field"><label>Avatar URL</label><input id="nsAvatar" placeholder="https://… hoặc /uploads/…"></div>' +
      '<div class="adm-field"><label>Upload avatar</label><div class="adm-file-row">' +
      '<input type="file" id="nsAvatarFile" accept="image/*">' +
      '<button type="button" class="btn btn-outline btn-sm" id="nsAvatarUp">Upload</button></div>' +
      '<img id="nsAvatarPreview" class="adm-preview-img hidden" alt=""></div>' +
      '<div class="adm-field"><label>Rating</label><input id="nsRating" type="number" min="0" max="5" step="0.1" value="5"></div>' +
      '<div class="adm-field"><label>Bio</label><textarea id="nsBio" rows="3"></textarea></div>' +
      '<div class="adm-field"><label>SEO title <span class="cnt" id="nsMetaTitleCnt">0/60</span></label>' +
      '<input id="nsMetaTitle"></div>' +
      '<div class="adm-field"><label>Meta description <span class="cnt" id="nsMetaDescCnt">0/155</span></label>' +
      '<textarea id="nsMetaDesc" rows="2"></textarea></div>' +
      '<div class="adm-compose-actions">' +
      '<button type="button" class="btn btn-primary" id="nsSave">Lưu gian hàng</button>' +
      '<button type="button" class="btn btn-outline" id="nsCancel">Huỷ</button></div></div></div>' +
      '<div class="adm-card"><div class="adm-filters">' +
      '<input class="adm-search" id="shopFilter" placeholder="Lọc theo tên shop, token…">' +
      filterSelect(
        "shopActive",
        "Hiển thị",
        [
          { v: "all", t: "Tất cả" },
          { v: "on", t: "Đang hiện" },
          { v: "off", t: "Đã tắt" }
        ],
        "all"
      ) +
      '<button type="button" class="btn btn-outline" id="shopRefresh">Làm mới</button></div>' +
      '<p class="adm-muted" id="shopCount" style="margin:8px 0 10px"></p>' +
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>Shop</th><th>Đánh giá</th><th>Nguồn</th><th>Hiển thị</th><th></th>" +
      '</tr></thead><tbody id="shopRows"></tbody></table></div></div>' +
      '<div id="shopEditor" class="hidden"></div>';

    const compose = document.getElementById("shopCompose");
    let slugManual = false;
    document.getElementById("shopNew")?.addEventListener("click", () => {
      compose.classList.remove("hidden");
      slugManual = false;
      compose.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    document.getElementById("nsCancel")?.addEventListener("click", () => {
      compose.classList.add("hidden");
    });
    document.getElementById("nsName")?.addEventListener("input", () => {
      if (slugManual) return;
      document.getElementById("nsSlug").value = slugifyText(
        document.getElementById("nsName").value
      );
    });
    document.getElementById("nsSlug")?.addEventListener("input", () => {
      slugManual = true;
    });
    wireSeoCounter("nsMetaTitle", "nsMetaTitleCnt", 60);
    wireSeoCounter("nsMetaDesc", "nsMetaDescCnt", 155);
    const syncNsPreview = () => {
      const url = document.getElementById("nsAvatar")?.value.trim();
      const img = document.getElementById("nsAvatarPreview");
      if (!img) return;
      if (url) {
        img.src = url;
        img.classList.remove("hidden");
      } else img.classList.add("hidden");
    };
    document.getElementById("nsAvatar")?.addEventListener("input", syncNsPreview);
    document.getElementById("nsAvatarUp")?.addEventListener("click", async () => {
      const file = document.getElementById("nsAvatarFile")?.files?.[0];
      if (!file) return toast("Chọn file ảnh");
      try {
        const url = await uploadAdminFile(file);
        document.getElementById("nsAvatar").value = url;
        syncNsPreview();
        toast("Đã upload avatar");
      } catch (e) {
        toast(e.message || "Upload lỗi");
      }
    });
    document.getElementById("nsSave")?.addEventListener("click", async () => {
      const name = document.getElementById("nsName").value.trim();
      if (!name) return toast("Nhập tên gian hàng");
      await api("/admin/cms-shops", {
        method: "POST",
        body: JSON.stringify({
          name,
          slug: document.getElementById("nsSlug").value.trim() || slugifyText(name),
          token: document.getElementById("nsToken").value.trim() || undefined,
          avatar: document.getElementById("nsAvatar").value.trim(),
          rating: Number(document.getElementById("nsRating").value || 5),
          bio: document.getElementById("nsBio").value.trim(),
          metaTitle: document.getElementById("nsMetaTitle").value.trim(),
          metaDescription: document.getElementById("nsMetaDesc").value.trim()
        })
      });
      toast("Đã tạo gian hàng CMS");
      renderShops(body);
    });

    const rows = document.getElementById("shopRows");
    function paint() {
      const needle = String(document.getElementById("shopFilter")?.value || "").toLowerCase();
      const actF = document.getElementById("shopActive")?.value || "all";
      const filtered = shops.filter((s) => {
        const o = ov[s.token] || {};
        const active = o.active !== false && s.active !== false;
        if (actF === "on" && !active) return false;
        if (actF === "off" && active) return false;
        if (!needle) return true;
        return (
          String(s.name || "").toLowerCase().includes(needle) ||
          String(s.token || "").includes(needle)
        );
      });
      const countEl = document.getElementById("shopCount");
      if (countEl) {
        countEl.textContent =
          "Hiển thị " + filtered.length + " / " + shops.length + " gian hàng";
      }
      rows.innerHTML =
        (filtered.length
          ? filtered
              .map((s) => {
                const o = ov[s.token] || {};
                const active = o.active !== false && s.active !== false;
                const name = o.name || s.name;
                const isCms = s.source === "cms";
                return (
                  '<tr data-token="' +
                  esc(s.token) +
                  '"><td><span class="adm-cell-main">' +
                  esc(name) +
                  '</span><span class="adm-cell-sub">' +
                  esc(String(s.token || "").slice(0, 12)) +
                  "…</span></td><td>★ " +
                  esc(String(o.rating != null ? o.rating : s.rating || "—")) +
                  "</td><td>" +
                  (isCms
                    ? '<span class="adm-tag pink">cms</span>'
                    : '<span class="adm-tag">catalog</span>') +
                  "</td><td>" +
                  (active
                    ? '<span class="adm-tag ok">Hiện</span>'
                    : '<span class="adm-tag bad">Ẩn</span>') +
                  '</td><td><div class="adm-row-actions">' +
                  '<button type="button" class="btn btn-primary btn-sm js-edit">Chỉnh hồ sơ</button>' +
                  '<a class="btn btn-outline btn-sm" target="_blank" href="shop.html?token=' +
                  encodeURIComponent(s.token) +
                  '">Xem</a></div></td></tr>'
                );
              })
              .join("")
          : '<tr><td colspan="5" class="adm-empty">Không khớp bộ lọc</td></tr>');
      rows.querySelectorAll(".js-edit").forEach((btn) => {
        btn.addEventListener("click", () => openEditor(btn.closest("tr").getAttribute("data-token")));
      });
    }

    function openEditor(token) {
      const s = shops.find((x) => x.token === token);
      if (!s) return;
      const o = ov[token] || {};
      const active = o.active !== false && s.active !== false;
      const box = document.getElementById("shopEditor");
      box.classList.remove("hidden");
      box.innerHTML =
        '<div class="adm-card"><h2>Chỉnh hồ sơ — ' +
        esc(o.name || s.name) +
        "</h2>" +
        '<div class="adm-form-grid">' +
        '<div class="adm-field span2"><label>Tên</label><input class="f-name" value="' +
        esc(o.name || s.name) +
        '"></div>' +
        '<div class="adm-field span3"><label>Bio</label><textarea class="f-bio" rows="3">' +
        esc(o.bio || s.bio || "") +
        "</textarea></div></div>" +
        '<div class="adm-actions"><button type="button" class="btn btn-primary" id="shopSave">Lưu</button>' +
        '<button type="button" class="btn btn-ghost" id="shopToggle">' +
        (active ? "Tắt shop" : "Bật shop") +
        '</button><button type="button" class="btn btn-outline" id="shopClose">Đóng</button></div></div>';
      box.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("shopClose")?.addEventListener("click", () => box.classList.add("hidden"));
      document.getElementById("shopSave")?.addEventListener("click", async () => {
        await api("/admin/shops/" + encodeURIComponent(token), {
          method: "PUT",
          body: JSON.stringify({
            token,
            name: box.querySelector(".f-name").value,
            bio: box.querySelector(".f-bio").value,
            active: true
          })
        });
        toast("Đã lưu shop");
        renderShops(body);
      });
      document.getElementById("shopToggle")?.addEventListener("click", async () => {
        await api("/admin/shops/" + encodeURIComponent(token), {
          method: "PUT",
          body: JSON.stringify({ token, active: !active })
        });
        toast(active ? "Đã tắt shop" : "Đã bật shop");
        renderShops(body);
      });
    }

    paint();
    document.getElementById("shopFilter")?.addEventListener("input", paint);
    document.getElementById("shopActive")?.addEventListener("change", paint);
    document.getElementById("shopRefresh")?.addEventListener("click", () => renderShops(body));
  }

  async function renderWallet(body) {
    const data = await api("/admin/users");
    const st = data.stats || { users: data.users.length, totalBalance: 0 };
    body.innerHTML =
      '<div class="adm-grid adm-grid-3">' +
      stat("Tổng người dùng", st.users) +
      stat("Tổng số dư", money(st.totalBalance), "pos") +
      stat("Trang này", data.users.length) +
      "</div>" +
      '<div class="adm-card"><input class="adm-search" id="userFilter" placeholder="Tìm theo tên, email, user id…">' +
      '<div class="adm-table-wrap" style="margin-top:14px"><table class="adm-table"><thead><tr>' +
      "<th>User</th><th>Vai trò</th><th>Số dư</th><th>Cập nhật</th><th></th>" +
      '</tr></thead><tbody id="userRows"></tbody></table></div></div>' +
      '<div id="walletModal" class="hidden"></div>';

    const rows = document.getElementById("userRows");
    function paint(q) {
      const needle = String(q || "").toLowerCase();
      rows.innerHTML = data.users
        .filter(
          (u) =>
            !needle ||
            u.email.toLowerCase().includes(needle) ||
            String(u.name || "").toLowerCase().includes(needle) ||
            String(u.id).includes(needle)
        )
        .map((u) => {
          const balCls =
            u.balance > 0 ? "adm-money-pos" : u.balance < 0 ? "adm-money-neg" : "adm-money-zero";
          return (
            '<tr data-id="' +
            u.id +
            '"><td><span class="adm-cell-main">' +
            esc(u.name || u.email.split("@")[0]) +
            '</span><span class="adm-cell-sub">' +
            esc(u.email) +
            "<br>" +
            esc(String(u.id).slice(0, 13)) +
            "…</span></td><td>" +
            (u.isAdmin
              ? '<span class="adm-tag pink">admin</span>'
              : '<span class="adm-tag">customer</span>') +
            '</td><td class="' +
            balCls +
            '">' +
            money(u.balance) +
            "</td><td>" +
            fmtTime(u.updatedAt || u.createdAt) +
            '</td><td><button type="button" class="btn btn-outline btn-sm js-edit-bal">Sửa số dư</button></td></tr>'
          );
        })
        .join("");
      rows.querySelectorAll(".js-edit-bal").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.closest("tr").getAttribute("data-id");
          const u = data.users.find((x) => x.id === id);
          openCreditModal(u);
        });
      });
    }

    function openCreditModal(u) {
      const box = document.getElementById("walletModal");
      box.classList.remove("hidden");
      box.innerHTML =
        '<div class="adm-modal-bg"><div class="adm-modal"><h3>Sửa số dư</h3>' +
        "<p>" +
        esc(u.email) +
        " · hiện tại <b>" +
        money(u.balance) +
        "</b></p>" +
        '<div class="adm-field"><label>Số tiền (+ nạp / − trừ)</label>' +
        '<input type="number" id="mAmt" placeholder="VD 100000 hoặc -50000"></div>' +
        '<div class="adm-field"><label>Ghi chú</label><input id="mNote" value="Admin điều chỉnh"></div>' +
        '<div class="adm-actions"><button type="button" class="btn btn-primary" id="mOk">Cập nhật</button>' +
        '<button type="button" class="btn btn-outline" id="mClose">Huỷ</button></div></div></div>';
      document.getElementById("mClose")?.addEventListener("click", () => box.classList.add("hidden"));
      box.querySelector(".adm-modal-bg")?.addEventListener("click", (e) => {
        if (e.target.classList.contains("adm-modal-bg")) box.classList.add("hidden");
      });
      document.getElementById("mOk")?.addEventListener("click", async () => {
        const amount = Number(document.getElementById("mAmt").value);
        const note = document.getElementById("mNote").value.trim();
        await api("/admin/users/" + u.id + "/credit", {
          method: "POST",
          body: JSON.stringify({ amount, note })
        });
        toast("Đã cập nhật ví");
        renderWallet(body);
      });
    }

    paint("");
    document.getElementById("userFilter")?.addEventListener("input", (e) => paint(e.target.value));
  }

  async function renderLedger(body) {
    const f = state.ledger;
    const qs = new URLSearchParams({ type: f.type, q: f.q, limit: "100" });
    const data = await api("/admin/ledger?" + qs.toString());
    const ps = data.pageStats || {};
    body.innerHTML =
      '<div class="adm-card"><div class="adm-filters">' +
      '<input class="adm-search" id="ledQ" placeholder="Tìm tên, email, user id, mô tả, ref…" value="' +
      esc(f.q) +
      '">' +
      '<div class="adm-field"><label>Loại</label><select id="ledType">' +
      ["all", "topup", "purchase", "refund", "release"]
        .map(
          (t) =>
            '<option value="' +
            t +
            '"' +
            (f.type === t ? " selected" : "") +
            ">" +
            (t === "all" ? "Tất cả loại" : TYPE_LABELS[t] || t) +
            "</option>"
        )
        .join("") +
      '</select></div><button type="button" class="btn btn-primary" id="ledApply">Lọc</button>' +
      '<button type="button" class="btn btn-outline" id="goWallet">Số dư ví</button></div></div>' +
      '<div class="adm-grid">' +
      stat("Giao dịch (+) trang này", ps.creditCount || 0) +
      stat("Tổng nạp (+) trang này", money(ps.creditSum || 0), "pos") +
      stat("Tổng trừ (−) trang này", money(ps.debitSum || 0), "neg") +
      stat("Số dòng", ps.total || 0) +
      "</div>" +
      '<div class="adm-card"><div class="adm-muted" style="margin-bottom:10px">Hiển thị ' +
      (data.items || []).length +
      " · sắp xếp mới → cũ</div>" +
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>#</th><th>Giao dịch</th><th>Người dùng</th><th>Loại</th><th>Số tiền</th><th>Mô tả</th><th>Ref</th><th>Thời gian</th>" +
      "</tr></thead><tbody>" +
      (data.items || [])
        .map((i, idx) => {
          const note = (i.meta && (i.meta.note || i.meta.by)) || "";
          return (
            "<tr><td>" +
            (idx + 1) +
            "</td><td>#" +
            i.id +
            '</td><td><span class="adm-cell-main">' +
            esc(i.name || "—") +
            '</span><span class="adm-cell-sub">' +
            esc(i.email) +
            "</span></td><td>" +
            (i.amount >= 0
              ? '<span class="adm-tag ok">'
              : '<span class="adm-tag bad">') +
            esc(TYPE_LABELS[i.type] || i.type) +
            "</span></td><td>" +
            moneyCls(i.amount) +
            "</td><td>" +
            esc(note || "—") +
            "</td><td>" +
            esc(i.refId || "—") +
            "</td><td>" +
            fmtTime(i.createdAt) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div></div>";

    document.getElementById("ledApply")?.addEventListener("click", () => {
      state.ledger.q = document.getElementById("ledQ").value.trim();
      state.ledger.type = document.getElementById("ledType").value;
      renderLedger(body);
    });
    document.getElementById("goWallet")?.addEventListener("click", () => setView("wallet"));
  }

  async function renderChatSupport(body) {
    body.innerHTML =
      '<div class="adm-hint">Kênh <b>Vua MMO ↔ Khách</b> (room <code>vuammo_support</code>). Danh sách hội thoại luôn hiện — trống cũng check được.</div>' +
      '<div class="adm-split"><div class="adm-list" id="supList"></div>' +
      '<div class="adm-chat-pane"><div class="adm-chat-head" id="supHead">Chọn khách bên trái</div>' +
      '<div class="adm-chat-msgs" id="supMsgs"><div class="adm-empty">Chưa chọn hội thoại</div></div>' +
      '<form class="adm-chat-form" id="supForm"><input id="supInput" placeholder="Trả lời khách…" autocomplete="off">' +
      '<button class="btn btn-primary" type="submit">Gửi</button></form></div></div>';
    const threads = await api("/admin/chat/threads?channel=support");
    const list = document.getElementById("supList");
    const rows = threads.threads || [];
    list.innerHTML =
      '<div style="padding:10px;border-bottom:1px solid #f1f5f9" class="adm-muted">Hội thoại: <b>' +
      rows.length +
      "</b></div>" +
      (rows.length
        ? rows
            .map((t) => {
              const pending = t.last_role === "user";
              return (
                '<button type="button" class="adm-list-item" data-v="' +
                esc(t.visitor_key) +
                '"><strong>Khách ' +
                esc(t.visitor_key.slice(0, 10)) +
                "…" +
                (pending ? ' <span class="adm-tag warn">Mới</span>' : "") +
                "</strong><small>" +
                esc(t.last_body || "(trống)") +
                " · " +
                esc(fmt(t.last_at)) +
                "</small></button>"
              );
            })
            .join("")
        : '<div class="adm-empty">Chưa có hội thoại support — phòng vẫn sẵn sàng khi khách nhắn.</div>');

    async function openThread(visitorKey) {
      state.supportVisitor = visitorKey;
      document.getElementById("supHead").textContent = "Khách " + visitorKey.slice(0, 16);
      const data = await api(
        "/chat/messages?roomId=" +
          encodeURIComponent("vuammo_support") +
          "&visitorKey=" +
          encodeURIComponent(visitorKey)
      );
      const box = document.getElementById("supMsgs");
      const msgs = data.messages || [];
      box.innerHTML = msgs.length
        ? msgs
            .map((m) => {
              const staff = m.role !== "user";
              return (
                '<div class="adm-bubble ' +
                (staff ? "staff" : "user") +
                '">' +
                esc(m.body) +
                "<br><small>" +
                esc(m.role) +
                " · " +
                esc(fmt(m.created_at)) +
                "</small></div>"
              );
            })
            .join("")
        : '<div class="adm-empty">Hội thoại trống</div>';
      box.scrollTop = box.scrollHeight;
      refreshBadges();
    }

    list.querySelectorAll(".adm-list-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        list.querySelectorAll(".adm-list-item").forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");
        openThread(btn.getAttribute("data-v"));
      });
    });

    document.getElementById("supForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!state.supportVisitor) return;
      const input = document.getElementById("supInput");
      const bodyText = input.value.trim();
      if (!bodyText) return;
      await api("/chat/messages", {
        method: "POST",
        body: JSON.stringify({
          roomId: "vuammo_support",
          channel: "support",
          visitorKey: state.supportVisitor,
          role: "support",
          body: bodyText
        })
      });
      input.value = "";
      openThread(state.supportVisitor);
    });
  }

  async function renderChatShop(body) {
    const shops = getCatalogShops();
    const [act, badges] = await Promise.all([
      api("/admin/chat/threads?channel=shop"),
      api("/admin/badges").catch(() => ({}))
    ]);
    state.badges = badges || state.badges;
    const byToken = {};
    (act.threads || []).forEach((t) => {
      byToken[t.shop_token] = t;
    });
    const pendingMap = badges.shopPendingByToken || {};

    body.innerHTML =
      '<div class="adm-hint"><b>' +
      shops.length +
      " phòng chat shop</b> luôn hiện đủ (kể cả trống). Badge đỏ = khách đang chờ trả lời.</div>" +
      '<div class="adm-split adm-split-3">' +
      '<div class="adm-list" id="shopRooms"></div>' +
      '<div class="adm-list" id="shopThreads"></div>' +
      '<div class="adm-chat-pane"><div class="adm-chat-head" id="shopHead">Chọn shop bên trái để mở phòng</div>' +
      '<div class="adm-chat-msgs" id="shopMsgs"><div class="adm-empty">Chọn shop để kiểm tra phòng chat</div></div>' +
      '<form class="adm-chat-form" id="shopForm"><input id="shopInput" placeholder="Trả lời với tư cách shop…" autocomplete="off">' +
      '<button class="btn btn-primary" type="submit">Gửi</button></form></div></div>';

    const roomList = document.getElementById("shopRooms");
    function roomHtml(s) {
      const a = byToken[s.token];
      const pending = Number(pendingMap[s.token] || 0);
      const threads = a ? a.threads : 0;
      const msgs = a ? a.msg_count : 0;
      const empty = !threads;
      return (
        '<button type="button" class="adm-list-item" data-token="' +
        esc(s.token) +
        '" data-name="' +
        esc(s.name) +
        '"><strong>' +
        esc(s.name) +
        (pending
          ? ' <span class="badge" style="position:static;margin-left:6px">' + pending + "</span>"
          : "") +
        "</strong><small>" +
        esc(s.city || "") +
        " · " +
        (empty
          ? '<span class="adm-tag">Trống</span>'
          : threads + " khách · " + msgs + " tin") +
        "</small></button>"
      );
    }

    roomList.innerHTML =
      '<div style="padding:10px"><input class="adm-search" id="roomQ" placeholder="Tìm trong ' +
      shops.length +
      ' phòng shop…">' +
      '<div class="adm-muted" style="margin-top:8px">Hiển thị đủ ' +
      shops.length +
      " phòng</div></div>" +
      '<div id="roomItems">' +
      shops.map(roomHtml).join("") +
      "</div>";

    document.getElementById("roomQ")?.addEventListener("input", (e) => {
      const needle = e.target.value.toLowerCase();
      roomList.querySelectorAll(".adm-list-item").forEach((btn) => {
        const hit =
          !needle ||
          btn.getAttribute("data-name").toLowerCase().includes(needle) ||
          btn.getAttribute("data-token").includes(needle);
        btn.style.display = hit ? "" : "none";
      });
    });

    async function loadThreads(token, name) {
      state.shopToken = token;
      state.shopName = name;
      state.shopVisitor = null;
      const a = byToken[token];
      document.getElementById("shopHead").textContent =
        "Phòng shop: " + name + (a ? "" : " (trống)");
      document.getElementById("shopMsgs").innerHTML =
        '<div class="adm-empty">Phòng <b>' +
        esc(name) +
        "</b> sẵn sàng.<br>Chưa chọn khách — hoặc chưa có ai nhắn.</div>";
      const data = await api(
        "/admin/chat/threads?channel=shop&shopToken=" + encodeURIComponent(token)
      );
      const box = document.getElementById("shopThreads");
      const rows = data.threads || [];
      box.innerHTML =
        '<div style="padding:10px;border-bottom:1px solid #f1f5f9" class="adm-muted">Khách trong phòng: <b>' +
        rows.length +
        "</b></div>" +
        (rows.length
          ? rows
              .map((t) => {
                const pending = t.last_role === "user";
                return (
                  '<button type="button" class="adm-list-item" data-v="' +
                  esc(t.visitor_key) +
                  '"><strong>Khách ' +
                  esc(t.visitor_key.slice(0, 10)) +
                  "…" +
                  (pending ? ' <span class="adm-tag warn">Chờ</span>' : "") +
                  "</strong><small>" +
                  esc(t.last_body || "(trống)") +
                  "</small></button>"
                );
              })
              .join("")
          : '<div class="adm-empty">Phòng trống — chưa có khách chat với shop này.<br>Vẫn kiểm tra / sẵn sàng nhận tin.</div>');
      box.querySelectorAll(".adm-list-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          box.querySelectorAll(".adm-list-item").forEach((x) => x.classList.remove("active"));
          btn.classList.add("active");
          openShopThread(btn.getAttribute("data-v"));
        });
      });
    }

    async function openShopThread(visitorKey) {
      state.shopVisitor = visitorKey;
      const roomId = "shop_" + state.shopToken;
      document.getElementById("shopHead").textContent =
        "Shop " + state.shopName + " ↔ " + visitorKey.slice(0, 12);
      const data = await api(
        "/chat/messages?roomId=" +
          encodeURIComponent(roomId) +
          "&visitorKey=" +
          encodeURIComponent(visitorKey)
      );
      const box = document.getElementById("shopMsgs");
      const msgs = data.messages || [];
      box.innerHTML = msgs.length
        ? msgs
            .map((m) => {
              const staff = m.role !== "user";
              return (
                '<div class="adm-bubble ' +
                (staff ? "staff" : "user") +
                '">' +
                esc(m.body) +
                "<br><small>" +
                esc(m.role) +
                " · " +
                esc(fmt(m.created_at)) +
                "</small></div>"
              );
            })
            .join("")
        : '<div class="adm-empty">Chưa có tin nhắn trong hội thoại này</div>';
      box.scrollTop = box.scrollHeight;
      refreshBadges();
    }

    roomList.querySelectorAll(".adm-list-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        roomList.querySelectorAll(".adm-list-item").forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");
        loadThreads(btn.getAttribute("data-token"), btn.getAttribute("data-name"));
      });
    });

    document.getElementById("shopForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!state.shopToken || !state.shopVisitor) {
        toast("Chọn shop và khách trước khi gửi");
        return;
      }
      const input = document.getElementById("shopInput");
      const bodyText = input.value.trim();
      if (!bodyText) return;
      await api("/chat/messages", {
        method: "POST",
        body: JSON.stringify({
          roomId: "shop_" + state.shopToken,
          channel: "shop",
          shopToken: state.shopToken,
          shopName: state.shopName || "",
          visitorKey: state.shopVisitor,
          role: "shop",
          body: bodyText
        })
      });
      input.value = "";
      openShopThread(state.shopVisitor);
    });

    refreshBadges();
  }

  async function renderVirtualShops(body) {
    const data = await api("/admin/virtual-shops");
    const st = data.stats || { total: 0, visible: 0, on_shift: 0 };
    body.innerHTML =
      '<div class="adm-hint"><b>Shop ảo</b> dùng để filler / demo trên khám phá. Không lẫn với 80 gian hàng thật (mục Gian hàng) và không có phòng chat shop thật.</div>' +
      '<div class="adm-grid adm-grid-3">' +
      stat("Tổng shop ảo", st.total) +
      stat("Hiện trên khám phá", st.visible, "pos") +
      stat("Đang trong ca", st.on_shift) +
      "</div>" +
      '<div class="adm-card"><h2>Thêm / sửa shop ảo</h2><div class="adm-form-grid">' +
      '<input type="hidden" id="vsId">' +
      '<div class="adm-field"><label>Tên shop</label><input id="vsName"></div>' +
      '<div class="adm-field"><label>Thành phố</label><input id="vsCity"></div>' +
      '<div class="adm-field"><label>SĐT</label><input id="vsPhone"></div>' +
      '<div class="adm-field"><label>Đánh giá</label><input id="vsRating" type="number" step="0.1" value="4.9"></div>' +
      '<div class="adm-field span2"><label>Bio</label><input id="vsBio"></div>' +
      '<div class="adm-field span3"><button type="button" class="btn btn-primary" id="vsSave">Lưu shop ảo</button></div>' +
      "</div></div>" +
      '<div class="adm-card"><div class="adm-filters">' +
      '<input class="adm-search" id="vsFilter" placeholder="Lọc theo tên, SĐT, khu vực…">' +
      filterSelect(
        "vsVis",
        "Hiển thị",
        [
          { v: "all", t: "Tất cả" },
          { v: "on", t: "Đang hiện" },
          { v: "off", t: "Đã ẩn" }
        ],
        "all"
      ) +
      '<button type="button" class="btn btn-outline" id="vsRefresh">Làm mới &amp; đồng bộ</button></div>' +
      '<div class="adm-table-wrap" style="margin-top:12px"><table class="adm-table"><thead><tr>' +
      "<th>Shop ảo</th><th>SĐT</th><th>Khu vực</th><th>Đánh giá</th><th>Hiển thị</th><th></th>" +
      '</tr></thead><tbody id="vsRows"></tbody></table></div></div>';

    function fillForm(item) {
      document.getElementById("vsId").value = item ? item.id : "";
      document.getElementById("vsName").value = item ? item.name : "";
      document.getElementById("vsCity").value = item ? item.city : "";
      document.getElementById("vsPhone").value = item ? item.phone : "";
      document.getElementById("vsRating").value = item ? item.rating : "4.9";
      document.getElementById("vsBio").value = item ? item.bio : "";
    }

    function paint() {
      const needle = String(document.getElementById("vsFilter")?.value || "").toLowerCase();
      const vis = document.getElementById("vsVis")?.value || "all";
      const rows = document.getElementById("vsRows");
      const list = (data.items || []).filter((s) => {
        if (vis === "on" && !s.visible) return false;
        if (vis === "off" && s.visible) return false;
        if (!needle) return true;
        return (
          s.name.toLowerCase().includes(needle) ||
          String(s.phone).includes(needle) ||
          String(s.city).toLowerCase().includes(needle)
        );
      });
      rows.innerHTML = list.length
        ? list
            .map(
              (s) =>
                '<tr data-id="' +
                s.id +
                '"><td><span class="adm-cell-main">' +
                esc(s.name) +
                "</span></td><td>" +
                esc(s.phone || "—") +
                "</td><td>" +
                esc(s.city || "—") +
                "</td><td>★ " +
                esc(s.rating) +
                "</td><td>" +
                (s.visible
                  ? '<span class="adm-tag ok">Hiện</span>'
                  : '<span class="adm-tag bad">Ẩn</span>') +
                '</td><td><div class="adm-row-actions">' +
                '<button type="button" class="btn btn-primary btn-sm js-edit">Chỉnh hồ sơ</button>' +
                '<button type="button" class="btn btn-ghost btn-sm js-vis">' +
                (s.visible ? "Ẩn" : "Hiện") +
                '</button><button type="button" class="btn btn-danger btn-sm js-del">Xóa</button></div></td></tr>'
            )
            .join("")
        : '<tr><td colspan="6" class="adm-empty">Chưa có shop ảo / không khớp lọc</td></tr>';
      rows.querySelectorAll(".js-edit").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = Number(btn.closest("tr").getAttribute("data-id"));
          fillForm(data.items.find((x) => x.id === id));
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
      rows.querySelectorAll(".js-vis").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.closest("tr").getAttribute("data-id");
          const s = data.items.find((x) => String(x.id) === id);
          await api("/admin/virtual-shops/" + id, {
            method: "PUT",
            body: JSON.stringify({
              name: s.name,
              city: s.city,
              phone: s.phone,
              rating: s.rating,
              bio: s.bio,
              visible: !s.visible,
              onShift: s.onShift
            })
          });
          toast("Đã cập nhật");
          renderVirtualShops(body);
        });
      });
      rows.querySelectorAll(".js-del").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("Xóa shop ảo này?")) return;
          await api("/admin/virtual-shops/" + btn.closest("tr").getAttribute("data-id"), {
            method: "DELETE"
          });
          toast("Đã xóa");
          renderVirtualShops(body);
        });
      });
    }

    document.getElementById("vsSave")?.addEventListener("click", async () => {
      const id = document.getElementById("vsId").value;
      const payload = {
        name: document.getElementById("vsName").value.trim(),
        city: document.getElementById("vsCity").value.trim(),
        phone: document.getElementById("vsPhone").value.trim(),
        rating: Number(document.getElementById("vsRating").value || 4.9),
        bio: document.getElementById("vsBio").value.trim(),
        visible: true,
        onShift: true
      };
      if (!payload.name) return toast("Nhập tên shop");
      if (id) {
        await api("/admin/virtual-shops/" + id, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await api("/admin/virtual-shops", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      toast("Đã lưu shop ảo");
      renderVirtualShops(body);
    });
    paint();
    document.getElementById("vsFilter")?.addEventListener("input", paint);
    document.getElementById("vsVis")?.addEventListener("change", paint);
    document.getElementById("vsRefresh")?.addEventListener("click", () => renderVirtualShops(body));
  }

  async function renderPromos(body) {
    const data = await api("/admin/promos");
    body.innerHTML =
      '<div class="adm-card"><div class="adm-card-head"><h2>Tạo mã mới</h2>' +
      "<span class=\"adm-muted\">Tổng: " +
      (data.total || 0) +
      " mã · Đang bật: " +
      (data.active || 0) +
      "</span></div>" +
      '<div class="adm-form-grid">' +
      '<div class="adm-field"><label>Mã</label><input id="prCode" placeholder="VD VUAMMO10"></div>' +
      '<div class="adm-field"><label>% giảm</label><input id="prPct" type="number" value="10"></div>' +
      '<div class="adm-field"><label>Giảm tối đa (₫)</label><input id="prMax" type="number" value="100000"></div>' +
      '<div class="adm-field"><label>Đơn tối thiểu (₫)</label><input id="prMin" type="number" value="0"></div>' +
      '<div class="adm-field"><label>Hết hạn</label><input id="prExp" type="date"></div>' +
      '<div class="adm-field"><label>Số lượt dùng (toàn sàn)</label><input id="prUses" type="number" min="1" value="100"></div>' +
      '<div class="adm-field"><label>Hiển thị</label><select id="prVis">' +
      '<option value="public">Công khai — hiện khi thanh toán, bấm áp dụng</option>' +
      '<option value="hidden">Nhập mã — không hiện list, chỉ khi gõ đúng</option>' +
      "</select></div>" +
      '<div class="adm-field"><label>Mỗi user dùng tối đa</label><input id="prPerUser" type="number" min="0" value="0" title="0 = không giới hạn mỗi tài khoản">' +
      '<span class="adm-muted" style="display:block;margin-top:4px;font-size:12px">0 = không giới hạn · 1 = mỗi TK 1 lần · 2+ = giới hạn tương ứng</span></div>' +
      '<div class="adm-field span3"><label>Mô tả khuyến mãi…</label><textarea id="prDesc" rows="2"></textarea></div>' +
      '<div class="adm-field span3"><button type="button" class="btn btn-primary" id="prCreate">Tạo mã mới</button></div>' +
      "</div></div>" +
      '<div class="adm-card"><div class="adm-filters">' +
      '<input class="adm-search" id="prFilter" placeholder="Lọc mã / mô tả…">' +
      filterSelect(
        "prActive",
        "Trạng thái",
        [
          { v: "all", t: "Tất cả" },
          { v: "on", t: "Đang bật" },
          { v: "off", t: "Đã tắt" }
        ],
        "all"
      ) +
      '<button type="button" class="btn btn-outline" id="prFilterBtn">Lọc</button></div>' +
      '<div class="adm-table-wrap" style="margin-top:12px"><table class="adm-table"><thead><tr>' +
      "<th>Mã</th><th>Hiển thị</th><th>/user</th><th>Mô tả</th><th>Giảm</th><th>Tối đa</th><th>Đơn tối thiểu</th><th>Lượt sàn</th><th>Hết hạn</th><th>Trạng thái</th><th></th>" +
      '</tr></thead><tbody id="prRows"></tbody></table></div></div>';

    function promoVisLabel(p) {
      return p.visibility === "hidden" ? "Nhập mã" : "Công khai";
    }

    function promoPerUserLabel(p) {
      const n = Number(p.perUserLimit || 0);
      if (!n) return "Không giới hạn";
      return n + " lần";
    }

    function paintPromos() {
      const needle = String(document.getElementById("prFilter")?.value || "").toLowerCase();
      const act = document.getElementById("prActive")?.value || "all";
      const list = (data.items || []).filter((p) => {
        if (act === "on" && !p.active) return false;
        if (act === "off" && p.active) return false;
        if (!needle) return true;
        return (
          p.code.toLowerCase().includes(needle) ||
          String(p.description || "")
            .toLowerCase()
            .includes(needle) ||
          promoVisLabel(p).toLowerCase().includes(needle)
        );
      });
      document.getElementById("prRows").innerHTML = list.length
        ? list
            .map(
              (p) =>
                '<tr data-id="' +
                p.id +
                '"><td><b>' +
                esc(p.code) +
                "</b></td><td>" +
                esc(promoVisLabel(p)) +
                "</td><td>" +
                esc(promoPerUserLabel(p)) +
                "</td><td>" +
                esc(p.description || "—") +
                "</td><td>" +
                p.percent +
                "%</td><td>" +
                money(p.maxCents) +
                "</td><td>" +
                money(p.minOrderCents) +
                "</td><td>" +
                p.usedCount +
                "/" +
                p.maxUses +
                "</td><td>" +
                esc(p.expiresAt ? String(p.expiresAt).slice(0, 10) : "—") +
                "</td><td>" +
                (p.active
                  ? '<span class="adm-tag ok">Đang bật</span>'
                  : '<span class="adm-tag bad">Tắt</span>') +
                '</td><td><div class="adm-row-actions">' +
                '<button type="button" class="btn btn-ghost btn-sm js-tog">' +
                (p.active ? "Tắt" : "Bật") +
                '</button><button type="button" class="btn btn-danger btn-sm js-del">Xóa</button></div></td></tr>'
            )
            .join("")
        : '<tr><td colspan="11" class="adm-empty">Không khớp bộ lọc</td></tr>';
      document.querySelectorAll("#prRows .js-tog").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.closest("tr").getAttribute("data-id");
          const p = data.items.find((x) => String(x.id) === id);
          await api("/admin/promos/" + id, {
            method: "PATCH",
            body: JSON.stringify({ active: !p.active })
          });
          renderPromos(body);
        });
      });
      document.querySelectorAll("#prRows .js-del").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("Xóa mã này?")) return;
          await api("/admin/promos/" + btn.closest("tr").getAttribute("data-id"), {
            method: "DELETE"
          });
          renderPromos(body);
        });
      });
    }

    document.getElementById("prCreate")?.addEventListener("click", async () => {
      await api("/admin/promos", {
        method: "POST",
        body: JSON.stringify({
          code: document.getElementById("prCode").value,
          percent: Number(document.getElementById("prPct").value),
          maxCents: Number(document.getElementById("prMax").value),
          minOrderCents: Number(document.getElementById("prMin").value),
          expiresAt: document.getElementById("prExp").value || null,
          maxUses: Number(document.getElementById("prUses").value || 1),
          visibility: document.getElementById("prVis").value,
          perUserLimit: Number(document.getElementById("prPerUser").value || 0),
          description: document.getElementById("prDesc").value
        })
      });
      toast("Đã tạo mã");
      renderPromos(body);
    });
    paintPromos();
    document.getElementById("prFilterBtn")?.addEventListener("click", paintPromos);
  }

  async function renderNotifications(body) {
    const data = await api("/admin/notifications");
    const st = data.stats || {};
    body.innerHTML =
      '<div class="adm-grid">' +
      stat("Tổng thông báo", st.total || 0) +
      stat("Users nhận được", st.users || 0) +
      stat("Khách hàng", st.users || 0) +
      stat("Shop", getCatalogShops().length) +
      "</div>" +
      '<div class="adm-card"><h2>Gửi thông báo mới</h2>' +
      '<div class="adm-pills" id="ntAud">' +
      '<button type="button" class="adm-pill active" data-a="all">Tất cả users</button>' +
      '<button type="button" class="adm-pill" data-a="customers">Chỉ khách</button>' +
      '<button type="button" class="adm-pill" data-a="shops">Chỉ shop</button></div>' +
      '<div class="adm-form-grid">' +
      '<div class="adm-field span2"><label>Tiêu đề</label><input id="ntTitle"></div>' +
      '<div class="adm-field"><label>Loại</label><select id="ntKind"><option value="system">Hệ thống</option><option value="promo">Khuyến mãi</option><option value="order">Đơn hàng</option></select></div>' +
      '<div class="adm-field span3"><label>Nội dung thông báo…</label><textarea id="ntBody" rows="3"></textarea></div>' +
      '<div class="adm-field span3"><button type="button" class="btn btn-primary" id="ntSend">Gửi thông báo</button></div>' +
      "</div></div>" +
      '<div class="adm-card"><div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>Loại</th><th>Tiêu đề</th><th>Nội dung</th><th>Audience</th><th>Thời gian</th><th></th>" +
      "</tr></thead><tbody>" +
      ((data.items || []).length
        ? data.items
            .map(
              (n) =>
                '<tr data-id="' +
                n.id +
                '"><td>' +
                esc(n.kind) +
                "</td><td><b>" +
                esc(n.title) +
                "</b></td><td>" +
                esc(n.body).slice(0, 120) +
                "</td><td>" +
                esc(n.audience) +
                "</td><td>" +
                fmtTime(n.createdAt) +
                '</td><td><button type="button" class="btn btn-danger btn-sm js-del">Xóa</button></td></tr>'
            )
            .join("")
        : '<tr><td colspan="6" class="adm-empty">Chưa có thông báo</td></tr>') +
      "</tbody></table></div></div>";

    let audience = "all";
    document.getElementById("ntAud")?.querySelectorAll(".adm-pill").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll("#ntAud .adm-pill").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        audience = b.getAttribute("data-a");
      });
    });
    document.getElementById("ntSend")?.addEventListener("click", async () => {
      await api("/admin/notifications", {
        method: "POST",
        body: JSON.stringify({
          audience,
          title: document.getElementById("ntTitle").value.trim(),
          body: document.getElementById("ntBody").value.trim(),
          kind: document.getElementById("ntKind").value
        })
      });
      toast("Đã gửi thông báo");
      renderNotifications(body);
    });
    body.querySelectorAll(".js-del").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await api("/admin/notifications/" + btn.closest("tr").getAttribute("data-id"), {
          method: "DELETE"
        });
        renderNotifications(body);
      });
    });
  }

  async function renderBlog(body) {
    const sitePosts = getSharePosts();
    const f = state.blog || { q: "", status: "all", locale: "all", category: "all" };
    state.blog = f;
    const qs = new URLSearchParams({
      q: f.q,
      status: f.status,
      locale: f.locale,
      category: f.category
    });
    const data = await api("/admin/blog?" + qs.toString());
    const c = data.counts || { total: 0, published: 0, draft: 0 };
    const catOpts = [{ v: "all", t: "Mọi chuyên mục" }].concat(
      (data.categories || []).map((x) => ({
        v: x.category,
        t: x.category + " (" + x.n + ")"
      }))
    );

    body.innerHTML =
      '<div class="adm-hint">Đồng bộ <b>' +
      sitePosts.length +
      " bài</b> từ mục Chia sẻ trên website vào admin. Có thể sửa / ẩn (draft) sau khi sync.</div>" +
      '<div class="adm-grid adm-grid-3">' +
      stat("Tổng bài (DB)", c.total) +
      stat("Published", c.published, "pos") +
      stat("Draft", c.draft, c.draft ? "warn" : "") +
      "</div>" +
      '<div class="adm-card"><div class="adm-card-head"><h2>Blog / Viết bài</h2><div class="adm-actions" style="margin:0">' +
      '<button type="button" class="btn btn-primary" id="blogSync">Đồng bộ từ website (' +
      sitePosts.length +
      ")</button>" +
      '<button type="button" class="btn btn-outline" id="blogNew">Bài mới</button></div></div>' +
      '<div class="adm-filters">' +
      '<input class="adm-search" id="blogQ" placeholder="Tìm tiêu đề, slug, chuyên mục…" value="' +
      esc(f.q) +
      '">' +
      filterSelect(
        "blogStatus",
        "Status",
        [
          { v: "all", t: "Tất cả" },
          { v: "published", t: "published" },
          { v: "draft", t: "draft" }
        ],
        f.status
      ) +
      filterSelect(
        "blogLoc",
        "Locale",
        [
          { v: "all", t: "Tất cả" },
          { v: "vi", t: "vi" },
          { v: "en", t: "en" }
        ],
        f.locale
      ) +
      filterSelect("blogCat", "Chuyên mục", catOpts, f.category) +
      '<button type="button" class="btn btn-outline" id="blogApply">Lọc</button></div>' +
      '<div id="blogForm" class="hidden adm-compose" style="margin-top:14px">' +
      "<h3 id=\"bFormTitle\">Bài mới</h3>" +
      '<input type="hidden" id="bId">' +
      '<div class="adm-field"><label>Ngôn ngữ</label>' +
      '<select id="bLoc"><option value="vi">vi</option><option value="en">en</option></select></div>' +
      '<div class="adm-field"><label>Tiêu đề</label><input id="bTitle" placeholder="Tiêu đề bài viết"></div>' +
      '<div class="adm-field"><label>Slug</label><input id="bSlug" placeholder="tu-dong-tu-tieu-de"></div>' +
      '<div class="adm-field"><label>Excerpt</label><input id="bExcerpt" placeholder="Tóm tắt ngắn"></div>' +
      '<div class="adm-field"><label>Nội dung</label>' +
      '<div class="adm-toolbar" id="bToolbar">' +
      '<button type="button" data-wrap="h2">H2</button>' +
      '<button type="button" data-wrap="h3">H3</button>' +
      '<button type="button" data-wrap="p">P</button>' +
      '<button type="button" data-wrap="ul">List</button>' +
      '<button type="button" data-wrap="ol">1.</button>' +
      '<button type="button" data-wrap="a">Link</button></div>' +
      '<textarea id="bContent" rows="12" placeholder="<p>…</p>"></textarea></div>' +
      '<div class="adm-field"><label>Chèn ảnh + alt</label>' +
      '<div class="adm-file-row">' +
      '<input type="file" id="bImgFile" accept="image/*">' +
      '<input id="bImgAlt" placeholder="alt text" style="max-width:180px">' +
      '<button type="button" class="btn btn-outline btn-sm" id="bImgInsert">Chèn</button></div>' +
      '<input id="bImage" placeholder="URL ảnh đại diện / chèn vào bài" style="margin-top:8px">' +
      '<img id="bImgPreview" class="adm-preview-img hidden" alt="" style="margin-top:8px"></div>' +
      '<div class="adm-field"><label>SEO title <span class="cnt" id="bMetaTitleCnt">0/60</span></label>' +
      '<input id="bMetaTitle" placeholder="Để trống = dùng tiêu đề"></div>' +
      '<div class="adm-field"><label>Meta description <span class="cnt" id="bMetaDescCnt">0/155</span></label>' +
      '<textarea id="bMetaDesc" rows="2" placeholder="Mô tả SERP / Open Graph"></textarea></div>' +
      '<div class="adm-field"><label>Canonical URL</label>' +
      '<input id="bCanon" placeholder="/vi/chia-se/slug-bai"></div>' +
      '<div class="adm-field"><label>OG image URL</label><input id="bOg" placeholder="Để trống = dùng ảnh đại diện"></div>' +
      '<div class="adm-field"><label>Upload OG file</label><div class="adm-file-row">' +
      '<input type="file" id="bOgFile" accept="image/*">' +
      '<button type="button" class="btn btn-outline btn-sm" id="bOgUp">Upload</button></div></div>' +
      '<div class="adm-field"><label>Category slug</label><input id="bCat" placeholder="tin-tuc-ai"></div>' +
      '<div class="adm-field"><label>Category label</label><input id="bCatLabel" placeholder="Tin tức AI"></div>' +
      '<div class="adm-field"><label>Keywords</label><input id="bKeywords" placeholder="từ khóa, cách nhau bởi dấu phẩy"></div>' +
      '<div class="adm-compose-actions">' +
      '<button type="button" class="btn btn-outline" id="bDraft">Lưu nháp</button>' +
      '<button type="button" class="btn btn-primary" id="bPublish">Publish</button>' +
      '<button type="button" class="btn btn-ghost" id="bCancel">Huỷ</button></div></div>' +
      '<div class="adm-table-wrap" style="margin-top:14px"><table class="adm-table"><thead><tr>' +
      "<th>Tiêu đề</th><th>Chuyên mục</th><th>Locale</th><th>Slug</th><th>Status</th><th></th>" +
      "</tr></thead><tbody>" +
      ((data.items || []).length
        ? data.items
            .map(
              (p) =>
                '<tr data-id="' +
                p.id +
                '"><td><span class="adm-cell-main">' +
                esc(p.title) +
                '</span><span class="adm-cell-sub">' +
                esc((p.excerpt || "").slice(0, 80)) +
                "</span></td><td>" +
                esc(p.category || "—") +
                "</td><td>" +
                esc(p.locale) +
                "</td><td>" +
                esc(p.slug) +
                "</td><td>" +
                (p.status === "published"
                  ? '<span class="adm-tag ok">published</span>'
                  : '<span class="adm-tag warn">draft</span>') +
                '</td><td><div class="adm-row-actions">' +
                '<button type="button" class="btn btn-outline btn-sm js-edit">Sửa</button>' +
                '<button type="button" class="btn btn-danger btn-sm js-del">Xóa</button></div></td></tr>'
            )
            .join("")
        : '<tr><td colspan="6" class="adm-empty">Chưa có bài trong DB — bấm <b>Đồng bộ từ website</b></td></tr>') +
      "</tbody></table></div></div>";

    const form = document.getElementById("blogForm");
    let slugManual = false;
    let editExtras = { readTime: "", publishedDate: null };

    function syncImgPreview() {
      const url = document.getElementById("bImage")?.value.trim();
      const img = document.getElementById("bImgPreview");
      if (!img) return;
      if (url) {
        img.src = url;
        img.classList.remove("hidden");
      } else img.classList.add("hidden");
    }

    function showForm(post) {
      form.classList.remove("hidden");
      slugManual = Boolean(post && post.slug);
      document.getElementById("bFormTitle").textContent = post ? "Sửa bài" : "Bài mới";
      document.getElementById("bId").value = post ? post.id : "";
      document.getElementById("bTitle").value = post ? post.title : "";
      document.getElementById("bMetaTitle").value = post ? post.metaTitle || "" : "";
      document.getElementById("bSlug").value = post ? post.slug : "";
      document.getElementById("bLoc").value = post ? post.locale : "vi";
      document.getElementById("bCat").value = post ? post.category || "" : "";
      document.getElementById("bCatLabel").value = post ? post.categoryLabel || "" : "";
      document.getElementById("bExcerpt").value = post ? post.excerpt || "" : "";
      document.getElementById("bMetaDesc").value = post
        ? post.metaDescription || post.excerpt || ""
        : "";
      document.getElementById("bKeywords").value = post ? post.keywords || "" : "";
      document.getElementById("bImage").value = post ? post.image || "" : "";
      document.getElementById("bOg").value = post ? post.ogImage || "" : "";
      document.getElementById("bCanon").value = post ? post.canonicalPath || "" : "";
      document.getElementById("bContent").value = post ? post.content || "" : "";
      editExtras = {
        readTime: post ? post.readTime || "" : "",
        publishedDate: post && post.publishedDate ? post.publishedDate : null
      };
      syncImgPreview();
      document.getElementById("bMetaTitle")?.dispatchEvent(new Event("input"));
      document.getElementById("bMetaDesc")?.dispatchEvent(new Event("input"));
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    wireSeoCounter("bMetaTitle", "bMetaTitleCnt", 60);
    wireSeoCounter("bMetaDesc", "bMetaDescCnt", 155);

    async function savePost(status) {
      const id = document.getElementById("bId").value;
      const title = document.getElementById("bTitle").value.trim();
      let slug = document.getElementById("bSlug").value.trim();
      if (!slug && title) slug = slugifyText(title);
      if (!title || !slug) return toast("Cần tiêu đề và slug");
      const payload = {
        title,
        slug,
        locale: document.getElementById("bLoc").value,
        status,
        category: document.getElementById("bCat").value.trim(),
        categoryLabel: document.getElementById("bCatLabel").value.trim(),
        excerpt: document.getElementById("bExcerpt").value.trim(),
        metaTitle: document.getElementById("bMetaTitle").value.trim(),
        metaDescription: document.getElementById("bMetaDesc").value.trim(),
        keywords: document.getElementById("bKeywords").value.trim(),
        image: document.getElementById("bImage").value.trim(),
        ogImage: document.getElementById("bOg").value.trim(),
        canonicalPath: document.getElementById("bCanon").value.trim(),
        readTime: editExtras.readTime || "",
        publishedDate:
          status === "published"
            ? editExtras.publishedDate || new Date().toISOString().slice(0, 10)
            : editExtras.publishedDate,
        content: document.getElementById("bContent").value
      };
      if (id) {
        await api("/admin/blog/" + id, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/admin/blog", { method: "POST", body: JSON.stringify(payload) });
      }
      toast(status === "published" ? "Đã publish lên website" : "Đã lưu nháp");
      renderBlog(body);
    }

    async function doSync() {
      if (!sitePosts.length) return toast("Không tải được SHARE_POSTS từ website");
      const payload = sitePosts.map((p) => ({
        title: p.title,
        slug: p.slug,
        content: p.body || "",
        excerpt: p.excerpt || "",
        metaTitle: p.title,
        metaDescription: p.excerpt || "",
        keywords: p.keywords || "",
        category: p.cat || "",
        categoryLabel: p.catLabel || "",
        image: p.image || "",
        ogImage: p.image || "",
        canonicalPath: "/vi/chia-se/" + p.slug,
        readTime: p.readTime || "",
        publishedDate: p.date || null,
        locale: "vi",
        status: "published"
      }));
      const r = await api("/admin/blog/sync", {
        method: "POST",
        body: JSON.stringify({ posts: payload })
      });
      toast("Đã đồng bộ " + (r.upserted || 0) + " bài lên DB / website");
      renderBlog(body);
    }

    if (!c.total && sitePosts.length) {
      doSync().catch(() => {});
    }

    document.getElementById("blogApply")?.addEventListener("click", () => {
      state.blog = {
        q: document.getElementById("blogQ").value.trim(),
        status: document.getElementById("blogStatus").value,
        locale: document.getElementById("blogLoc").value,
        category: document.getElementById("blogCat").value
      };
      renderBlog(body);
    });
    document.getElementById("blogSync")?.addEventListener("click", async () => {
      if (!confirm("Đồng bộ " + sitePosts.length + " bài từ Chia sẻ vào admin/DB?")) return;
      await doSync();
    });
    document.getElementById("blogNew")?.addEventListener("click", () => showForm(null));
    document.getElementById("bCancel")?.addEventListener("click", () => form.classList.add("hidden"));
    document.getElementById("bDraft")?.addEventListener("click", () => savePost("draft"));
    document.getElementById("bPublish")?.addEventListener("click", () => savePost("published"));

    document.getElementById("bTitle")?.addEventListener("input", () => {
      if (slugManual) return;
      document.getElementById("bSlug").value = slugifyText(
        document.getElementById("bTitle").value
      );
    });
    document.getElementById("bSlug")?.addEventListener("input", () => {
      slugManual = true;
    });
    document.getElementById("bImage")?.addEventListener("input", syncImgPreview);

    document.getElementById("bToolbar")?.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ta = document.getElementById("bContent");
        const kind = btn.getAttribute("data-wrap");
        if (kind === "h2") wrapTextarea(ta, "<h2>", "</h2>");
        else if (kind === "h3") wrapTextarea(ta, "<h3>", "</h3>");
        else if (kind === "p") wrapTextarea(ta, "<p>", "</p>");
        else if (kind === "ul") wrapTextarea(ta, "<ul>\n<li>", "</li>\n</ul>");
        else if (kind === "ol") wrapTextarea(ta, "<ol>\n<li>", "</li>\n</ol>");
        else if (kind === "a") {
          const href = prompt("URL liên kết", "https://");
          if (!href) return;
          wrapTextarea(ta, '<a href="' + href.replace(/"/g, "") + '">', "</a>");
        }
      });
    });

    document.getElementById("bImgInsert")?.addEventListener("click", async () => {
      const ta = document.getElementById("bContent");
      const alt = document.getElementById("bImgAlt").value.trim() || "";
      let url = document.getElementById("bImage").value.trim();
      const file = document.getElementById("bImgFile")?.files?.[0];
      try {
        if (file) {
          url = await uploadAdminFile(file);
          document.getElementById("bImage").value = url;
          syncImgPreview();
        }
        if (!url) return toast("Chọn file hoặc nhập URL ảnh");
        wrapTextarea(ta, '<p><img src="' + url.replace(/"/g, "") + '" alt="' + alt.replace(/"/g, "") + '"></p>\n', "");
        toast("Đã chèn ảnh");
      } catch (e) {
        toast(e.message || "Upload lỗi");
      }
    });

    document.getElementById("bOgUp")?.addEventListener("click", async () => {
      const file = document.getElementById("bOgFile")?.files?.[0];
      if (!file) return toast("Chọn file OG");
      try {
        const url = await uploadAdminFile(file);
        document.getElementById("bOg").value = url;
        toast("Đã upload OG");
      } catch (e) {
        toast(e.message || "Upload lỗi");
      }
    });

    body.querySelectorAll(".js-edit").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.closest("tr").getAttribute("data-id");
        const full = await api("/admin/blog/" + id);
        showForm(full.post);
      });
    });
    body.querySelectorAll(".js-del").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Xóa bài này?")) return;
        await api("/admin/blog/" + btn.closest("tr").getAttribute("data-id"), {
          method: "DELETE"
        });
        renderBlog(body);
      });
    });
  }

  async function renderUsers(body) {
    const data = await api("/admin/users");
    const st = data.stats || { users: data.users.length, totalBalance: 0 };
    body.innerHTML =
      '<div class="adm-grid adm-grid-3">' +
      stat("Tổng users", st.users) +
      stat("Tổng số dư ví", money(st.totalBalance), "pos") +
      stat("Trang này", data.users.length) +
      "</div>" +
      '<div class="adm-card"><div class="adm-filters">' +
      '<input class="adm-search" id="usrFilter" placeholder="Tìm tên, email, user id…">' +
      filterSelect(
        "usrRole",
        "Vai trò",
        [
          { v: "all", t: "Tất cả" },
          { v: "customer", t: "Customer" },
          { v: "admin", t: "Admin" }
        ],
        "all"
      ) +
      '<button type="button" class="btn btn-outline" id="usrApply">Lọc</button>' +
      '<button type="button" class="btn btn-ghost" id="goWalletFromUsers">Sang ví</button></div>' +
      '<div class="adm-table-wrap" style="margin-top:12px"><table class="adm-table"><thead><tr>' +
      "<th>User</th><th>Email</th><th>Vai trò</th><th>Số dư</th><th>Ngày tạo</th><th></th>" +
      '</tr></thead><tbody id="usrRows"></tbody></table></div></div>';

    function paint() {
      const needle = String(document.getElementById("usrFilter")?.value || "").toLowerCase();
      const role = document.getElementById("usrRole")?.value || "all";
      const list = (data.users || []).filter((u) => {
        if (role === "admin" && !u.isAdmin) return false;
        if (role === "customer" && u.isAdmin) return false;
        if (!needle) return true;
        return (
          u.email.toLowerCase().includes(needle) ||
          String(u.name || "").toLowerCase().includes(needle) ||
          String(u.id).includes(needle)
        );
      });
      document.getElementById("usrRows").innerHTML = list.length
        ? list
            .map(
              (u) =>
                '<tr><td><span class="adm-cell-main">' +
                esc(u.name || u.email.split("@")[0]) +
                '</span><span class="adm-cell-sub">' +
                esc(String(u.id).slice(0, 13)) +
                "…</span></td><td>" +
                esc(u.email) +
                "</td><td>" +
                (u.isAdmin
                  ? '<span class="adm-tag pink">admin</span>'
                  : '<span class="adm-tag">customer</span>') +
                '</td><td class="' +
                (u.balance > 0 ? "adm-money-pos" : "adm-money-zero") +
                '">' +
                money(u.balance) +
                "</td><td>" +
                fmtTime(u.createdAt) +
                '</td><td><button type="button" class="btn btn-outline btn-sm js-wal" data-id="' +
                u.id +
                '">Xem ví</button></td></tr>'
            )
            .join("")
        : '<tr><td colspan="6" class="adm-empty">Không có user / không khớp lọc</td></tr>';
      document.querySelectorAll(".js-wal").forEach((btn) => {
        btn.addEventListener("click", () => setView("wallet"));
      });
    }
    paint();
    document.getElementById("usrApply")?.addEventListener("click", paint);
    document.getElementById("usrFilter")?.addEventListener("input", paint);
    document.getElementById("usrRole")?.addEventListener("change", paint);
    document.getElementById("goWalletFromUsers")?.addEventListener("click", () => setView("wallet"));
  }

  async function renderBlacklist(body) {
    const data = await api("/admin/blacklist");
    body.innerHTML =
      '<div class="adm-hint">User trong blacklist <b>không mua được hàng</b> (chặn tạo đơn). Thường dùng với tài khoản spam / lừa đảo.</div>' +
      '<div class="adm-card"><h2>Thêm user vào blacklist</h2><div class="adm-form-grid">' +
      '<div class="adm-field span2"><label>Thêm user vào blacklist</label>' +
      '<input id="blQ" placeholder="Tìm theo tên, email, user id…"></div>' +
      '<div class="adm-field span3"><label>Lý do (bắt buộc)</label>' +
      '<textarea id="blReason" rows="2" placeholder="VD: spam chat, lừa đảo hoàn tiền…"></textarea></div>' +
      '<div class="adm-field"><button type="button" class="btn btn-primary" id="blAdd">Thêm blacklist</button></div>' +
      "</div></div>" +
      '<div class="adm-card"><div class="adm-card-head"><input class="adm-search" id="blFilter" placeholder="Lọc blacklist theo tên / email…" style="max-width:320px">' +
      "<span class=\"adm-muted\">Đang blacklist: <b>" +
      (data.total || 0) +
      "</b></span></div>" +
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>User</th><th>Vai trò</th><th>Lý do</th><th>Thời điểm</th><th>Admin</th><th></th>" +
      '</tr></thead><tbody id="blRows"></tbody></table></div></div>';

    function paint(q) {
      const needle = String(q || "").toLowerCase();
      document.getElementById("blRows").innerHTML = (data.items || [])
        .filter(
          (i) =>
            !needle ||
            i.email.toLowerCase().includes(needle) ||
            String(i.name || "").toLowerCase().includes(needle)
        )
        .map(
          (i) =>
            '<tr data-id="' +
            i.id +
            '"><td><span class="adm-cell-main">' +
            esc(i.name || i.email.split("@")[0]) +
            '</span><span class="adm-cell-sub">' +
            esc(i.email) +
            "</span></td><td><span class=\"adm-tag\">Khách</span></td><td>" +
            esc(i.reason) +
            "</td><td>" +
            fmtTime(i.createdAt) +
            "</td><td>" +
            esc(i.adminEmail || "—") +
            '</td><td><button type="button" class="btn btn-danger btn-sm js-rm">Gỡ blacklist</button></td></tr>'
        )
        .join("") ||
        '<tr><td colspan="6" class="adm-empty">Chưa có ai trong blacklist</td></tr>';
      document.querySelectorAll("#blRows .js-rm").forEach((btn) => {
        btn.addEventListener("click", async () => {
          await api("/admin/blacklist/" + btn.closest("tr").getAttribute("data-id"), {
            method: "DELETE"
          });
          toast("Đã gỡ blacklist");
          renderBlacklist(body);
        });
      });
    }

    document.getElementById("blAdd")?.addEventListener("click", async () => {
      await api("/admin/blacklist", {
        method: "POST",
        body: JSON.stringify({
          query: document.getElementById("blQ").value.trim(),
          reason: document.getElementById("blReason").value.trim()
        })
      });
      toast("Đã thêm blacklist");
      renderBlacklist(body);
    });
    paint("");
    document.getElementById("blFilter")?.addEventListener("input", (e) => paint(e.target.value));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 50));
  } else {
    setTimeout(boot, 50);
  }
})();
