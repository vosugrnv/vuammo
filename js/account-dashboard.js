/* Tài khoản thành viên — không sidebar, lọc đơn + phân trang */
(function () {
  const STATUS = {
    paid: "Đã thanh toán",
    delivered: "Đã giao / đang bảo vệ",
    disputed: "Đang khiếu nại",
    released: "Đã giải ngân",
    refunded: "Đã hoàn tiền"
  };
  const ORDER_PAGE = 50;
  const WALLET_PAGE = 12;

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function money(n) {
    return window.VuammoApi ? VuammoApi.money(n) : Number(n || 0).toLocaleString("vi-VN") + "₫";
  }

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("vi-VN");
    } catch {
      return String(iso);
    }
  }

  function tabFromHash() {
    const h = (location.hash || "").replace(/^#/, "");
    if (["profile", "orders", "cart", "wallet", "security"].includes(h)) return h;
    return "profile";
  }

  function setActiveTab(root, tab) {
    root.querySelectorAll("[data-acct-tab]").forEach((btn) => {
      const on = btn.getAttribute("data-acct-tab") === tab;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    root.querySelectorAll("[data-acct-panel]").forEach((panel) => {
      panel.hidden = panel.getAttribute("data-acct-panel") !== tab;
    });
    if (location.hash.replace(/^#/, "") !== tab) {
      history.replaceState(null, "", "#" + tab);
    }
  }

  function renderShell(user) {
    const name = user.name || String(user.email || "").split("@")[0];
    return (
      '<div class="acct" id="accountDash">' +
      '<div class="acct-hero">' +
      '<div class="acct-hero-main">' +
      avatarBlock(user, name) +
      '<div class="acct-hero-text">' +
      '<p class="acct-hero-kicker">Tài khoản thành viên</p>' +
      "<h2 class=\"acct-hero-name\">" +
      esc(name) +
      "</h2>" +
      '<p class="acct-hero-email">' +
      esc(user.email) +
      "</p>" +
      "</div></div>" +
      '<div class="acct-hero-side">' +
      '<div class="acct-bal-box">' +
      '<span class="acct-hero-bal-label">Số dư ví</span>' +
      '<strong id="acctHeroBal">' +
      money(user.balance) +
      "</strong>" +
      "</div>" +
      '<div class="acct-hero-actions">' +
      '<a class="acct-btn acct-btn--primary" href="nap-tien.html">Nạp tiền</a>' +
      '<a class="acct-btn acct-btn--ghost" href="tai-khoan.html#orders">Đơn hàng</a>' +
      "</div></div></div>" +
      '<nav class="acct-tabs" role="tablist" aria-label="Mục tài khoản">' +
      '<button type="button" class="acct-tab" role="tab" data-acct-tab="profile">Thông tin</button>' +
      '<button type="button" class="acct-tab" role="tab" data-acct-tab="orders">Đơn hàng</button>' +
      '<button type="button" class="acct-tab" role="tab" data-acct-tab="cart">Giỏ hàng</button>' +
      '<button type="button" class="acct-tab" role="tab" data-acct-tab="wallet">Ví &amp; nạp</button>' +
      '<button type="button" class="acct-tab" role="tab" data-acct-tab="security">Bảo mật</button>' +
      '<button type="button" class="acct-tab acct-tab--out" id="acctLogoutBtn">Đăng xuất</button>' +
      "</nav>" +
      '<div class="acct-body">' +
      '<section class="acct-panel" data-acct-panel="profile" hidden></section>' +
      '<section class="acct-panel" data-acct-panel="orders" hidden></section>' +
      '<section class="acct-panel" data-acct-panel="cart" hidden></section>' +
      '<section class="acct-panel" data-acct-panel="wallet" hidden></section>' +
      '<section class="acct-panel" data-acct-panel="security" hidden></section>' +
      "</div></div>"
    );
  }

  function avatarBlock(user, nameHint) {
    const name = nameHint || user.name || String(user.email || "").split("@")[0] || "?";
    const url = user.avatarUrl || "";
    const inner = url
      ? '<img src="' + esc(url) + '" alt="">'
      : esc(name.charAt(0).toUpperCase());
    const cls = url
      ? "acct-avatar acct-avatar--img acct-avatar--pick"
      : "acct-avatar acct-avatar--pick";
    return (
      '<div class="acct-avatar-wrap">' +
      '<button type="button" class="' +
      cls +
      '" id="acctHeroAvatar" title="Đổi ảnh đại diện">' +
      inner +
      "</button>" +
      '<input type="file" id="acctAvatarFile" accept="image/*" class="acct-file-input">' +
      '<button type="button" class="acct-avatar-change" id="acctAvatarChangeBtn">Đổi ảnh</button>' +
      "</div>"
    );
  }

  function paintHeroAvatar(user) {
    const wrap = document.getElementById("acctHeroAvatar");
    if (!wrap || !user) return;
    const name = user.name || String(user.email || "").split("@")[0] || "?";
    if (user.avatarUrl) {
      wrap.className = "acct-avatar acct-avatar--img acct-avatar--pick";
      wrap.innerHTML = '<img src="' + esc(user.avatarUrl) + '" alt="">';
    } else {
      wrap.className = "acct-avatar acct-avatar--pick";
      wrap.textContent = name.charAt(0).toUpperCase();
    }
  }

  function wireHeroAvatarUpload(root) {
    const fileInput = root.querySelector("#acctAvatarFile");
    const avatarBtn = root.querySelector("#acctHeroAvatar");
    const changeBtn = root.querySelector("#acctAvatarChangeBtn");
    if (!fileInput || fileInput.dataset.wired === "1") return;
    fileInput.dataset.wired = "1";

    function openPicker() {
      fileInput.value = "";
      fileInput.click();
    }

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ""));
        fr.onerror = () => reject(new Error("Không đọc được ảnh"));
        fr.readAsDataURL(file);
      });
    }

    function compressDataUrl(dataUrl, maxSide, quality) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (!w || !h) return resolve(dataUrl);
          const scale = Math.min(1, maxSide / Math.max(w, h));
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(dataUrl);
          ctx.drawImage(img, 0, 0, w, h);
          try {
            resolve(canvas.toDataURL("image/jpeg", quality));
          } catch (_) {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    }

    async function uploadAvatarFile(file) {
      if (!file) return;
      const type = String(file.type || "");
      const looksImage =
        type.startsWith("image/") ||
        /\.(jpe?g|png|webp|gif|heic|bmp)$/i.test(file.name || "");
      if (!looksImage) {
        VuammoApi.showToast("Chỉ chọn file ảnh");
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        VuammoApi.showToast("Ảnh quá lớn");
        return;
      }
      if (changeBtn) {
        changeBtn.disabled = true;
        changeBtn.textContent = "Đang tải…";
      }
      try {
        let dataUrl = await fileToDataUrl(file);
        dataUrl = await compressDataUrl(dataUrl, 512, 0.85);
        if (avatarBtn) {
          avatarBtn.className = "acct-avatar acct-avatar--img acct-avatar--pick";
          avatarBtn.innerHTML = '<img src="' + dataUrl + '" alt="">';
        }
        const data = await VuammoApi.api("/auth/avatar", {
          method: "POST",
          body: JSON.stringify({
            data: dataUrl,
            filename: (file.name || "avatar").replace(/\.[^.]+$/, "") + ".jpg"
          })
        });
        await VuammoAuth.refreshMe();
        const u = VuammoAuth.getUser() || data.user;
        paintHeroAvatar(u);
        if (VuammoAuth.renderHeaderUser) VuammoAuth.renderHeaderUser();
        VuammoApi.showToast("Đã cập nhật avatar");
      } catch (err) {
        console.error("avatar upload", err);
        VuammoApi.showToast(err.message || "Upload thất bại");
      } finally {
        if (changeBtn) {
          changeBtn.disabled = false;
          changeBtn.textContent = "Đổi ảnh";
        }
      }
    }

    avatarBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      openPicker();
    });
    changeBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      openPicker();
    });
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (file) uploadAvatarFile(file);
    });
  }

  function fillProfile(panel, user) {
    panel.innerHTML =
      "<h2>Thông tin tài khoản</h2>" +
      '<form class="dash-form" id="dashProfileForm">' +
      '<label for="dashName">Tên hiển thị</label>' +
      '<input id="dashName" type="text" maxlength="80" required value="' +
      esc(user.name || "") +
      '">' +
      "<label>Email</label>" +
      '<input type="email" value="' +
      esc(user.email) +
      '" disabled>' +
      "<label>Ngày tạo</label>" +
      '<input type="text" value="' +
      esc(formatDate(user.createdAt)) +
      '" disabled>' +
      '<button type="submit" class="acct-btn acct-btn--primary">Lưu tên hiển thị</button>' +
      "</form>";

    panel.querySelector("#dashProfileForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const displayName = document.getElementById("dashName").value.trim();
      try {
        const data = await VuammoApi.api("/auth/profile", {
          method: "PATCH",
          body: JSON.stringify({ name: displayName })
        });
        if (data.user) {
          await VuammoAuth.refreshMe();
          VuammoApi.showToast("Đã cập nhật tên hiển thị");
          const u = VuammoAuth.getUser();
          const hero = document.querySelector(".acct-hero-name");
          if (hero && u) hero.textContent = u.name || u.email.split("@")[0];
          paintHeroAvatar(u);
          if (VuammoAuth.renderHeaderUser) VuammoAuth.renderHeaderUser();
        }
      } catch (err) {
        VuammoApi.showToast(err.message || "Không lưu được");
      }
    });
  }

  function canDispute(o) {
    if (o.disputeStatus === "withdrawn") return false;
    if (o.disputeStatus === "open" || o.status === "disputed") return false;
    if (["resolved", "rejected"].includes(o.disputeStatus)) return false;
    return (
      ["paid", "delivered"].includes(o.status) &&
      o.holdUntil &&
      new Date(o.holdUntil) > new Date()
    );
  }
  function canWithdrawDispute(o) {
    return o.status === "disputed" && o.disputeStatus === "open";
  }
  function canReview(o) {
    return !o.reviewed && ["paid", "delivered", "disputed", "released"].includes(o.status);
  }
  function shopFromOrder(o) {
    const token = String(o.shopToken || "").trim();
    const name = String(o.shopName || "").trim() || "Shop";
    return { token, name };
  }

  function receivedCell(o) {
    const lines = o.receivedLines || [];
    if (lines.length) {
      const text = lines.join(" · ");
      return (
        '<div class="dash-recv" title="' + esc(text) + '"><code>' + esc(text) + "</code></div>"
      );
    }
    if (o.deliveryNote) {
      return (
        '<span class="dash-recv-note" title="' +
        esc(o.deliveryNote) +
        '">' +
        esc(String(o.deliveryNote).slice(0, 64)) +
        (o.deliveryNote.length > 64 ? "…" : "") +
        "</span>"
      );
    }
    return "—";
  }

  function renderPager(page, totalPages, idPrefix) {
    if (totalPages <= 1) return "";
    let html = '<div class="acct-pager" id="' + idPrefix + 'Pager">';
    html +=
      '<button type="button" class="dash-act dash-act--ghost" data-page="' +
      (page - 1) +
      '"' +
      (page <= 1 ? " disabled" : "") +
      ">Trước</button>";
    html +=
      '<span class="acct-pager-info">Trang ' + page + " / " + totalPages + "</span>";
    html +=
      '<button type="button" class="dash-act dash-act--ghost" data-page="' +
      (page + 1) +
      '"' +
      (page >= totalPages ? " disabled" : "") +
      ">Sau</button>";
    html += "</div>";
    return html;
  }

  async function fillOrders(panel) {
    panel.innerHTML =
      "<h2>Lịch sử đơn hàng</h2>" +
      '<p class="dash-lead">Khiếu nại trong thời gian bảo vệ · Đánh giá sau khi nhận hàng · Chat trực tiếp với shop.</p>' +
      '<div class="acct-filters">' +
      '<input type="search" id="ordSearch" class="acct-search" placeholder="Tìm mã đơn, tên SP, email giao…" autocomplete="off">' +
      '<select id="ordStatus" class="acct-select">' +
      '<option value="all">Tất cả trạng thái</option>' +
      '<option value="delivered">Đang bảo vệ</option>' +
      '<option value="disputed">Khiếu nại</option>' +
      '<option value="released">Đã giải ngân</option>' +
      '<option value="refunded">Hoàn tiền</option>' +
      '<option value="paid">Đã thanh toán</option>' +
      "</select>" +
      '<button type="button" class="dash-act dash-act--outline" id="ordApply">Lọc</button>' +
      '<a class="dash-act dash-act--ghost" href="danh-gia-cua-toi.html">Xem tất cả đánh giá</a>' +
      "</div>" +
      '<div class="dash-orders" id="ordBox">Đang tải...</div>' +
      '<div class="dash-modal" id="dashOrderModal" hidden></div>';

    const box = panel.querySelector("#ordBox");
    const modal = panel.querySelector("#dashOrderModal");
    let allOrders = [];
    let page = 1;

    function closeModal() {
      if (!modal) return;
      modal.hidden = true;
      modal.innerHTML = "";
    }
    function openModal(html) {
      if (!modal) return;
      modal.hidden = false;
      modal.innerHTML =
        '<div class="dash-modal-backdrop" data-close></div>' +
        '<div class="dash-modal-card" role="dialog" aria-modal="true">' +
        html +
        "</div>";
      modal.querySelectorAll("[data-close]").forEach((el) =>
        el.addEventListener("click", closeModal)
      );
    }

    function filtered() {
      const q = String(document.getElementById("ordSearch")?.value || "")
        .trim()
        .toLowerCase();
      const st = document.getElementById("ordStatus")?.value || "all";
      return allOrders.filter((o) => {
        if (st !== "all" && o.status !== st) return false;
        if (!q) return true;
        const code = String(o.code || "").toLowerCase();
        const name = String(o.itemNames || "").toLowerCase();
        const recv = (o.receivedLines || []).join(" ").toLowerCase();
        const note = String(o.deliveryNote || "").toLowerCase();
        return code.includes(q) || name.includes(q) || recv.includes(q) || note.includes(q);
      });
    }

    function paint() {
      const list = filtered();
      const totalPages = Math.max(1, Math.ceil(list.length / ORDER_PAGE));
      if (page > totalPages) page = totalPages;
      const slice = list.slice((page - 1) * ORDER_PAGE, page * ORDER_PAGE);

      if (!allOrders.length) {
        box.innerHTML =
          '<div class="dash-empty"><p>Chưa có đơn hàng.</p><a class="acct-btn acct-btn--primary" href="tat-ca-san-pham.html">Mua sắm ngay</a></div>';
        return;
      }
      if (!list.length) {
        box.innerHTML =
          '<div class="dash-empty"><p>Không có đơn khớp bộ lọc.</p></div>' +
          renderPager(page, totalPages, "ord");
        return;
      }

      box.innerHTML =
        '<p class="acct-result-meta">Hiển thị ' +
        slice.length +
        " / " +
        list.length +
        " đơn · mới nhất trước</p>" +
        '<div class="dash-table-wrap"><table class="dash-orders-table">' +
        "<colgroup>" +
        '<col class="col-code"><col class="col-name"><col class="col-money"><col class="col-recv">' +
        '<col class="col-time"><col class="col-status"><col class="col-actions">' +
        "</colgroup><thead><tr>" +
        "<th>Mã đơn</th><th>Tên</th><th>Số tiền</th><th>Sản phẩm đã nhận</th><th>Thời gian đặt</th><th>Trạng thái</th><th>Thao tác</th>" +
        "</tr></thead><tbody>" +
        slice
          .map((o) => {
            const code = o.code || String(o.id).replace(/-/g, "").slice(0, 10).toUpperCase();
            const name = o.itemNames || "—";
            return (
              '<tr data-id="' +
              esc(o.id) +
              '"><td class="cell-code"><b>#' +
              esc(code) +
              '</b></td><td class="cell-name" title="' +
              esc(name) +
              '">' +
              esc(name) +
              "</td><td><b>" +
              money(o.total) +
              '</b></td><td class="cell-recv">' +
              receivedCell(o) +
              '</td><td class="cell-time">' +
              esc(formatDate(o.createdAt)) +
              '</td><td><span class="dash-status dash-status--' +
              esc(o.status) +
              '" title="' +
              esc(STATUS[o.status] || o.status) +
              '">' +
              esc(STATUS[o.status] || o.status) +
              '</span></td><td class="cell-actions"><div class="dash-order-actions">' +
              (canDispute(o)
                ? '<button type="button" class="dash-act dash-act--outline js-dispute">Khiếu nại</button>'
                : canWithdrawDispute(o)
                  ? '<button type="button" class="dash-act dash-act--warn js-withdraw">Gỡ khiếu nại</button>'
                  : o.disputeStatus === "withdrawn"
                    ? '<span class="dash-action-muted" title="Đã gỡ — không khiếu nại lại">Đã gỡ KN</span>'
                    : "") +
              (canReview(o)
                ? '<button type="button" class="dash-act dash-act--solid js-review">Đánh giá</button>'
                : o.reviewed
                  ? '<button type="button" class="dash-act dash-act--ghost js-view-review">Đã đánh giá</button>'
                  : "") +
              (shopFromOrder(o).token
                ? '<button type="button" class="dash-act dash-act--chat js-chat">Chat</button>'
                : "") +
              '<button type="button" class="dash-act dash-act--ghost js-view">Xem</button>' +
              "</div></td></tr>"
            );
          })
          .join("") +
        "</tbody></table></div>" +
        renderPager(page, totalPages, "ord");

      box.querySelectorAll("#ordPager [data-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const p = Number(btn.getAttribute("data-page"));
          if (p >= 1 && p <= totalPages) {
            page = p;
            paint();
          }
        });
      });

      box.querySelectorAll("tr[data-id]").forEach((tr) => {
        const id = tr.getAttribute("data-id");
        const o = allOrders.find((x) => String(x.id) === id);
        if (!o) return;
        tr.querySelector(".js-view")?.addEventListener("click", () => showDetail(o));
        tr.querySelector(".js-dispute")?.addEventListener("click", () => showDispute(o));
        tr.querySelector(".js-withdraw")?.addEventListener("click", () => confirmWithdraw(o));
        tr.querySelector(".js-review")?.addEventListener("click", () => showReview(o));
        tr.querySelector(".js-view-review")?.addEventListener("click", () => showReviewReadonly(o));
        tr.querySelector(".js-chat")?.addEventListener("click", () => openOrderChat(o));
      });
    }

    function openOrderChat(o) {
      const shop = shopFromOrder(o);
      if (!shop.token) {
        VuammoApi.showToast("Đơn này chưa gắn shop để chat");
        return;
      }
      if (!window.VuammoChat || typeof VuammoChat.openShop !== "function") {
        VuammoApi.showToast("Chat chưa sẵn sàng trên trang này");
        return;
      }
      const roomId = "shop_" + shop.token;
      VuammoChat.openShop({
        id: roomId,
        name: shop.name,
        avatar: "images/logo-vuammo.png",
        subtitle: "Chat về đơn #" + (o.code || "") + " · gian hàng trên Vua MMO",
        hello:
          "Xin chào! Bạn đang chat với " +
          shop.name +
          " về đơn #" +
          (o.code || "") +
          ". Hãy mô tả vấn đề hoặc câu hỏi của bạn.",
        replies: [
          "Shop " + shop.name + " đã nhận tin về đơn #" + (o.code || "") + ". Mình check giúp bạn ngay.",
          "Bạn cần hỗ trợ gì thêm về đơn #" + (o.code || "") + " ạ?",
          "Cảm ơn bạn đã inbox. Shop phản hồi trong giờ 8:00–22:00."
        ]
      });
    }

    async function confirmWithdraw(o) {
      if (
        !confirm(
          "Gỡ khiếu nại đơn #" +
            (o.code || "") +
            "?\nSau khi gỡ, bạn sẽ không thể khiếu nại lại đơn này."
        )
      ) {
        return;
      }
      try {
        await VuammoApi.api("/orders/" + o.id + "/dispute/withdraw", {
          method: "POST",
          body: "{}"
        });
        VuammoApi.showToast("Đã gỡ khiếu nại");
        closeModal();
        await reload();
      } catch (err) {
        VuammoApi.showToast(err.message || "Không gỡ được");
      }
    }

    function showReviewReadonly(o) {
      const stars = "★".repeat(Math.max(0, Math.min(5, Number(o.reviewRating) || 0)));
      openModal(
        '<div class="dash-modal-head"><h3>Đánh giá của bạn</h3>' +
          '<button type="button" class="dash-act dash-act--ghost" data-close>×</button></div>' +
          "<p><strong>" +
          esc(o.itemNames || "Sản phẩm") +
          "</strong></p>" +
          '<p class="dash-review-stars">' +
          esc(stars) +
          " (" +
          esc(String(o.reviewRating || "")) +
          "/5)</p>" +
          '<div class="dash-review-body">' +
          esc(o.reviewBody || "—") +
          "</div>" +
          "<p class=\"dash-muted\">Gửi lúc " +
          esc(formatDate(o.reviewCreatedAt || o.createdAt)) +
          " · Không thể sửa đánh giá đã gửi.</p>" +
          '<div class="dash-modal-actions">' +
          '<a class="dash-act dash-act--solid" href="danh-gia-cua-toi.html">Xem tất cả đánh giá</a>' +
          '<button type="button" class="dash-act dash-act--ghost" data-close>Đóng</button>' +
          "</div>"
      );
    }

    function showDetail(o) {
      const lines =
        (o.receivedLines || []).map((l) => "<code>" + esc(l) + "</code>").join("") ||
        esc(o.deliveryNote || "Chưa có dữ liệu giao");
      openModal(
        '<div class="dash-modal-head"><h3>Chi tiết đơn #' +
          esc(o.code) +
          '</h3><button type="button" class="dash-act dash-act--ghost" data-close>×</button></div>' +
          "<p><strong>Trạng thái:</strong> " +
          esc(STATUS[o.status] || o.status) +
          "</p><p><strong>Sản phẩm:</strong> " +
          esc(o.itemNames || "—") +
          "</p><p><strong>Tổng:</strong> " +
          money(o.total) +
          (o.promoCode
            ? " · Mã " + esc(o.promoCode) + " (−" + money(o.discount) + ")"
            : "") +
          "</p><p><strong>Đặt lúc:</strong> " +
          esc(formatDate(o.createdAt)) +
          "</p><p><strong>Bảo vệ đến:</strong> " +
          esc(formatDate(o.holdUntil)) +
          '</p><div class="dash-modal-recv"><p class="dash-modal-recv-title">Sản phẩm đã nhận</p>' +
          lines +
          '</div><div class="dash-modal-actions">' +
          (canDispute(o)
            ? '<button type="button" class="dash-act dash-act--outline" id="modalDispute">Khiếu nại</button>'
            : "") +
          (canWithdrawDispute(o)
            ? '<button type="button" class="dash-act dash-act--warn" id="modalWithdraw">Gỡ khiếu nại</button>'
            : "") +
          (canReview(o)
            ? '<button type="button" class="dash-act dash-act--solid" id="modalReview">Đánh giá</button>'
            : "") +
          (o.reviewed
            ? '<button type="button" class="dash-act dash-act--ghost" id="modalViewReview">Đã đánh giá</button>'
            : "") +
          (shopFromOrder(o).token
            ? '<button type="button" class="dash-act dash-act--chat" id="modalChat">Chat shop</button>'
            : "") +
          "</div>"
      );
      document.getElementById("modalDispute")?.addEventListener("click", () => showDispute(o));
      document.getElementById("modalWithdraw")?.addEventListener("click", () => confirmWithdraw(o));
      document.getElementById("modalReview")?.addEventListener("click", () => showReview(o));
      document.getElementById("modalViewReview")?.addEventListener("click", () =>
        showReviewReadonly(o)
      );
      document.getElementById("modalChat")?.addEventListener("click", () => openOrderChat(o));
    }

    function showDispute(o) {
      openModal(
        '<div class="dash-modal-head"><h3>Khiếu nại #' +
          esc(o.code) +
          '</h3><button type="button" class="dash-act dash-act--ghost" data-close>×</button></div>' +
          "<p>Bảo vệ đến <strong>" +
          esc(formatDate(o.holdUntil)) +
          "</strong>. Mô tả rõ vấn đề (≥ 5 ký tự).</p>" +
          '<form id="disputeForm"><textarea id="disputeReason" rows="4" required minlength="5"></textarea>' +
          '<div class="dash-modal-actions"><button type="submit" class="dash-act dash-act--solid">Gửi khiếu nại</button>' +
          '<button type="button" class="dash-act dash-act--ghost" data-close>Hủy</button></div></form>'
      );
      document.getElementById("disputeForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await VuammoApi.api("/orders/" + o.id + "/dispute", {
            method: "POST",
            body: JSON.stringify({
              reason: document.getElementById("disputeReason").value.trim()
            })
          });
          VuammoApi.showToast("Đã gửi khiếu nại");
          closeModal();
          await reload();
        } catch (err) {
          VuammoApi.showToast(err.message || "Không gửi được");
        }
      });
    }

    function showReview(o) {
      const first = (o.items || [])[0] || {};
      openModal(
        '<div class="dash-modal-head"><h3>Đánh giá #' +
          esc(o.code) +
          '</h3><button type="button" class="dash-act dash-act--ghost" data-close>×</button></div>' +
          "<p><strong>" +
          esc(first.name || o.itemNames || "") +
          '</strong></p><p class="dash-lead">Chia sẻ trải nghiệm thật — đánh giá sẽ hiện trên trang sản phẩm.</p>' +
          '<form id="reviewForm"><div class="dash-stars" id="starPick">' +
          [1, 2, 3, 4, 5]
            .map(
              (n) =>
                '<button type="button" class="dash-star" data-n="' + n + '">★</button>'
            )
            .join("") +
          '</div><input type="hidden" id="reviewRating" value="5">' +
          '<textarea id="reviewBody" rows="4" required minlength="10" placeholder="≥ 10 ký tự"></textarea>' +
          '<div class="dash-modal-actions"><button type="submit" class="dash-act dash-act--solid">Gửi đánh giá</button>' +
          '<button type="button" class="dash-act dash-act--ghost" data-close>Hủy</button></div></form>'
      );
      const pick = document.getElementById("starPick");
      const paintStars = (n) => {
        document.getElementById("reviewRating").value = String(n);
        pick.querySelectorAll(".dash-star").forEach((btn) => {
          btn.classList.toggle("is-on", Number(btn.getAttribute("data-n")) <= n);
        });
      };
      paintStars(5);
      pick.querySelectorAll(".dash-star").forEach((btn) => {
        btn.addEventListener("click", () => paintStars(Number(btn.getAttribute("data-n"))));
      });
      document.getElementById("reviewForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await VuammoApi.api("/orders/" + o.id + "/review", {
            method: "POST",
            body: JSON.stringify({
              rating: Number(document.getElementById("reviewRating").value),
              body: document.getElementById("reviewBody").value.trim(),
              productId: first.id,
              productName: first.name
            })
          });
          VuammoApi.showToast("Cảm ơn bạn đã đánh giá");
          closeModal();
          await reload();
        } catch (err) {
          VuammoApi.showToast(err.message || "Không gửi được");
        }
      });
    }

    async function reload() {
      box.innerHTML = "Đang tải...";
      try {
        const data = await VuammoApi.api("/orders");
        allOrders = (data.orders || []).slice().sort((a, b) => {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        page = 1;
        paint();
      } catch (err) {
        box.innerHTML = '<p class="dash-error">' + esc(err.message) + "</p>";
      }
    }

    document.getElementById("ordApply")?.addEventListener("click", () => {
      page = 1;
      paint();
    });
    document.getElementById("ordSearch")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        page = 1;
        paint();
      }
    });
    document.getElementById("ordStatus")?.addEventListener("change", () => {
      page = 1;
      paint();
    });

    await reload();
  }

  function fillCart(panel) {
    function splitName(name) {
      const raw = String(name || "");
      const parts = raw.split(/\s[–—-]\s/);
      if (parts.length > 1) {
        return { title: parts[0].trim(), meta: parts.slice(1).join(" – ").trim() };
      }
      return { title: raw, meta: "" };
    }

    function paint() {
      if (!window.CartStore) {
        panel.innerHTML =
          "<h2>Giỏ hàng</h2><p class=\"dash-error\">Giỏ hàng chưa sẵn sàng.</p>";
        return;
      }
      const items = CartStore.read();
      if (!items.length) {
        CartStore.setSelectedIds([]);
        panel.innerHTML =
          "<h2>Giỏ hàng</h2>" +
          '<p class="dash-lead">Giỏ trống — khám phá tài khoản số đang bán chạy tại Vua MMO.</p>' +
          '<div class="dash-empty"><p>Giỏ hàng đang trống.</p>' +
          '<a class="acct-btn acct-btn--primary" href="tat-ca-san-pham.html">Tiếp tục mua sắm</a></div>';
        return;
      }

      const selected = new Set(CartStore.getSelectedIds());
      // Keep selection valid; default missing → select all once
      if (!sessionStorage.getItem(CartStore.SELECT_KEY)) {
        CartStore.selectAll(true);
        selected.clear();
        CartStore.getSelectedIds().forEach((id) => selected.add(id));
      }
      const allOn = items.every((i) => selected.has(String(i.id)));
      const selItems = items.filter((i) => selected.has(String(i.id)));
      const selCount = selItems.reduce((s, i) => s + (i.qty || 1), 0);
      const selTotal = selItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);

      panel.innerHTML =
        "<h2>Giỏ hàng</h2>" +
        '<p class="dash-lead">Tick chọn món cần mua, chỉnh số lượng rồi nhấn Mua hàng.</p>' +
        '<div class="scart">' +
        '<div class="scart-toolbar">' +
        '<label class="scart-check"><input type="checkbox" id="scartAll"' +
        (allOn ? " checked" : "") +
        '> Chọn tất cả <span>(' +
        items.length +
        ")</span></label>" +
        '<button type="button" class="dash-act dash-act--ghost" id="scartDelSel"' +
        (selItems.length ? "" : " disabled") +
        ">Xóa đã chọn</button>" +
        '<a class="scart-continue" href="tat-ca-san-pham.html">← Tiếp tục mua</a>' +
        "</div>" +
        '<ul class="scart-list">' +
        items
          .map((it) => {
            const { title, meta } = splitName(it.name);
            const id = String(it.id);
            const on = selected.has(id);
            return (
              '<li class="scart-item' +
              (on ? " is-on" : "") +
              '" data-id="' +
              esc(id) +
              '">' +
              '<label class="scart-check scart-check--row"><input type="checkbox" class="js-pick"' +
              (on ? " checked" : "") +
              "></label>" +
              (it.image
                ? '<img class="scart-img" src="' +
                  esc(it.image) +
                  '" alt="" loading="lazy">'
                : '<div class="scart-img scart-img--empty"></div>') +
              '<div class="scart-info"><p class="scart-title">' +
              esc(title) +
              "</p>" +
              (meta ? '<p class="scart-meta">' + esc(meta) + "</p>" : "") +
              '<p class="scart-unit">Đơn giá: <b>' +
              money(it.price) +
              "</b></p></div>" +
              '<div class="scart-qty" title="Số lượng">' +
              '<button type="button" class="js-minus" aria-label="Giảm">−</button>' +
              '<span class="scart-qty-n">' +
              (it.qty || 1) +
              "</span>" +
              '<button type="button" class="js-plus" aria-label="Tăng">+</button>' +
              "</div>" +
              '<div class="scart-line">' +
              money((it.price || 0) * (it.qty || 1)) +
              "</div>" +
              '<button type="button" class="scart-del js-del" aria-label="Xóa khỏi giỏ">Xóa</button>' +
              "</li>"
            );
          })
          .join("") +
        "</ul>" +
        '<div class="scart-foot">' +
        '<div class="scart-foot-left">' +
        '<label class="scart-check"><input type="checkbox" id="scartAll2"' +
        (allOn ? " checked" : "") +
        "> Chọn tất cả</label>" +
        '<span class="scart-foot-meta">Đã chọn <b>' +
        selCount +
        "</b> sản phẩm</span></div>" +
        '<div class="scart-foot-right">' +
        '<div class="scart-total">Tổng thanh toán <strong>' +
        money(selTotal) +
        "</strong></div>" +
        '<button type="button" class="acct-btn acct-btn--primary" id="scartPay"' +
        (selItems.length ? "" : " disabled") +
        ">Mua hàng</button>" +
        "</div></div></div>";

      const syncAll = (checked) => {
        CartStore.selectAll(!!checked);
        paint();
      };
      panel.querySelector("#scartAll")?.addEventListener("change", (e) =>
        syncAll(e.target.checked)
      );
      panel.querySelector("#scartAll2")?.addEventListener("change", (e) =>
        syncAll(e.target.checked)
      );
      panel.querySelector("#scartDelSel")?.addEventListener("click", () => {
        if (!CartStore.getSelectedIds().length) return;
        if (!confirm("Xóa các sản phẩm đã chọn khỏi giỏ?")) return;
        CartStore.removeSelected();
        paint();
        VuammoApi.showToast("Đã xóa sản phẩm đã chọn");
      });
      panel.querySelector("#scartPay")?.addEventListener("click", () => {
        if (!CartStore.selectedItems().length) {
          VuammoApi.showToast("Chọn ít nhất 1 sản phẩm");
          return;
        }
        location.href = "thanh-toan.html";
      });

      panel.querySelectorAll(".scart-item").forEach((row) => {
        const id = row.getAttribute("data-id");
        row.querySelector(".js-pick")?.addEventListener("change", (e) => {
          CartStore.toggleSelected(id, e.target.checked);
          paint();
        });
        row.querySelector(".js-minus")?.addEventListener("click", () => {
          const cur = CartStore.read().find((x) => String(x.id) === id);
          if (!cur) return;
          CartStore.setQty(id, Math.max(1, (cur.qty || 1) - 1));
          paint();
        });
        row.querySelector(".js-plus")?.addEventListener("click", () => {
          const cur = CartStore.read().find((x) => String(x.id) === id);
          if (!cur) return;
          CartStore.setQty(id, (cur.qty || 1) + 1);
          paint();
        });
        row.querySelector(".js-del")?.addEventListener("click", () => {
          CartStore.removeItem(id);
          paint();
          VuammoApi.showToast("Đã xóa khỏi giỏ");
        });
      });
    }

    paint();
  }

  async function fillWallet(panel, user) {
    panel.innerHTML =
      "<h2>Ví &amp; nạp tiền</h2>" +
      '<p class="dash-lead">Nạp ví để thanh toán tức thì. Ưu đãi thành viên — kiểm tra lịch sử giao dịch bên dưới.</p>' +
      '<div class="dash-wallet-card">' +
      '<div class="dash-wallet-row">' +
      '<div><p class="dash-wallet-label">Số dư hiện tại</p>' +
      '<p class="dash-wallet-value" id="dashWalletBal">' +
      money(user.balance) +
      "</p></div>" +
      '<div class="acct-hero-actions">' +
      '<a class="acct-btn acct-btn--primary" href="nap-tien.html">Nạp tiền</a>' +
      '<a class="acct-btn acct-btn--ghost" href="tai-khoan.html#orders">Đơn hàng</a>' +
      "</div></div></div>" +
      '<div class="acct-filters" style="margin-top:18px">' +
      '<input type="search" id="walSearch" class="acct-search" placeholder="Tìm loại giao dịch…" autocomplete="off">' +
      '<select id="walType" class="acct-select">' +
      '<option value="all">Tất cả loại</option>' +
      '<option value="topup">Nạp tiền</option>' +
      '<option value="purchase">Mua hàng</option>' +
      '<option value="refund">Hoàn / điều chỉnh</option>' +
      "</select>" +
      '<button type="button" class="dash-act dash-act--outline" id="walApply">Lọc</button>' +
      "</div>" +
      '<div id="walBox"><ul class="dash-ledger"><li>Đang tải...</li></ul></div>';

    const box = document.getElementById("walBox");
    let rows = [];
    let page = 1;

    function typeLabel(t) {
      const x = String(t || "").toLowerCase();
      if (x.includes("topup") || x.includes("nạp")) return "Nạp tiền";
      if (x.includes("purchase") || x.includes("mua")) return "Mua hàng";
      if (x.includes("refund") || x.includes("hoàn")) return "Hoàn / điều chỉnh";
      return t || "Giao dịch";
    }

    function filtered() {
      const q = String(document.getElementById("walSearch")?.value || "")
        .trim()
        .toLowerCase();
      const tp = document.getElementById("walType")?.value || "all";
      return rows.filter((row) => {
        const type = String(row.type || row.kind || "").toLowerCase();
        if (tp === "topup" && !(type.includes("topup") || type.includes("nạp"))) return false;
        if (tp === "purchase" && !(type.includes("purchase") || type.includes("mua")))
          return false;
        if (
          tp === "refund" &&
          !(type.includes("refund") || type.includes("hoàn") || type.includes("adjust"))
        )
          return false;
        if (!q) return true;
        return type.includes(q) || typeLabel(type).toLowerCase().includes(q);
      });
    }

    function paint() {
      const list = filtered();
      const totalPages = Math.max(1, Math.ceil(list.length / WALLET_PAGE));
      if (page > totalPages) page = totalPages;
      const slice = list.slice((page - 1) * WALLET_PAGE, page * WALLET_PAGE);
      if (!rows.length) {
        box.innerHTML = '<ul class="dash-ledger"><li class="dash-ledger-empty">Chưa có giao dịch ví.</li></ul>';
        return;
      }
      if (!list.length) {
        box.innerHTML =
          '<ul class="dash-ledger"><li class="dash-ledger-empty">Không khớp bộ lọc.</li></ul>';
        return;
      }
      box.innerHTML =
        '<p class="acct-result-meta">' +
        slice.length +
        " / " +
        list.length +
        " giao dịch</p>" +
        '<div class="dash-table-wrap"><table class="acct-wallet-table">' +
        "<thead><tr><th>Thời gian</th><th>Loại</th><th>Số tiền</th></tr></thead><tbody>" +
        slice
          .map((row) => {
            const amt = Number(row.amount != null ? row.amount : row.amount_cents || 0);
            const cls = amt >= 0 ? "amt-plus" : "amt-minus";
            return (
              "<tr><td>" +
              esc(formatDate(row.createdAt || row.created_at)) +
              "</td><td>" +
              esc(typeLabel(row.type || row.kind)) +
              '</td><td><strong class="' +
              cls +
              '">' +
              (amt >= 0 ? "+" : "−") +
              money(Math.abs(amt)) +
              "</strong></td></tr>"
            );
          })
          .join("") +
        "</tbody></table></div>" +
        renderPager(page, totalPages, "wal");

      box.querySelectorAll("#walPager [data-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const p = Number(btn.getAttribute("data-page"));
          if (p >= 1 && p <= totalPages) {
            page = p;
            paint();
          }
        });
      });
    }

    try {
      const data = await VuammoApi.api("/wallet/ledger");
      rows = (data.items || data.entries || data.ledger || []).slice().sort((a, b) => {
        return (
          new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)
        );
      });
      paint();
    } catch (err) {
      box.innerHTML = '<p class="dash-error">' + esc(err.message) + "</p>";
    }

    document.getElementById("walApply")?.addEventListener("click", () => {
      page = 1;
      paint();
    });
    document.getElementById("walSearch")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        page = 1;
        paint();
      }
    });
    document.getElementById("walType")?.addEventListener("change", () => {
      page = 1;
      paint();
    });
  }

  function fillSecurity(panel) {
    panel.innerHTML =
      "<h2>Bảo mật</h2>" +
      '<p class="dash-lead">Đổi mật khẩu định kỳ, không chia sẻ cho người khác.</p>' +
      '<form class="dash-form" id="dashPassForm">' +
      '<label for="dashPassCurrent">Mật khẩu hiện tại</label>' +
      '<input id="dashPassCurrent" type="password" autocomplete="current-password" required>' +
      '<label for="dashPassNew">Mật khẩu mới (tối thiểu 6 ký tự)</label>' +
      '<input id="dashPassNew" type="password" autocomplete="new-password" required minlength="6">' +
      '<label for="dashPassConfirm">Nhập lại mật khẩu mới</label>' +
      '<input id="dashPassConfirm" type="password" autocomplete="new-password" required minlength="6">' +
      '<button type="submit" class="acct-btn acct-btn--primary">Đổi mật khẩu</button>' +
      "</form>";

    panel.querySelector("#dashPassForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById("dashPassCurrent").value;
      const newPassword = document.getElementById("dashPassNew").value;
      const confirm = document.getElementById("dashPassConfirm").value;
      if (newPassword !== confirm) {
        VuammoApi.showToast("Mật khẩu nhập lại không khớp");
        return;
      }
      try {
        await VuammoApi.api("/auth/password", {
          method: "POST",
          body: JSON.stringify({ currentPassword, newPassword })
        });
        VuammoApi.showToast("Đã đổi mật khẩu");
        e.target.reset();
      } catch (err) {
        VuammoApi.showToast(err.message || "Không đổi được mật khẩu");
      }
    });
  }

  async function loadTab(root, tab, user) {
    const panel = root.querySelector('[data-acct-panel="' + tab + '"]');
    if (!panel) return;
    if (tab === "profile") fillProfile(panel, VuammoAuth.getUser() || user);
    else if (tab === "orders") await fillOrders(panel);
    else if (tab === "cart") fillCart(panel);
    else if (tab === "wallet") await fillWallet(panel, VuammoAuth.getUser() || user);
    else if (tab === "security") fillSecurity(panel);
  }

  async function mount(panelEl, user) {
    if (!panelEl || !user) return;
    panelEl.className = "account-grid account-grid--acct";
    panelEl.innerHTML = renderShell(user);
    const root = document.getElementById("accountDash");
    if (!root) return;

    const head = document.querySelector(".account-page-head");
    if (head) {
      head.innerHTML =
        '<p class="account-kicker">Tài khoản</p>' +
        "<h1>Tài khoản thành viên</h1>";
    }

    document.getElementById("acctLogoutBtn")?.addEventListener("click", async () => {
      await VuammoAuth.logout();
      VuammoApi.showToast("Đã đăng xuất");
      location.href = "tai-khoan.html";
    });

    wireHeroAvatarUpload(root);

    root.querySelectorAll("[data-acct-tab]").forEach((btn) => {
      if (btn.id === "acctLogoutBtn") return;
      btn.addEventListener("click", async () => {
        const tab = btn.getAttribute("data-acct-tab");
        setActiveTab(root, tab);
        await loadTab(root, tab, user);
      });
    });

    window.addEventListener("hashchange", async () => {
      const tab = tabFromHash();
      setActiveTab(root, tab);
      await loadTab(root, tab, user);
    });

    const tab = tabFromHash();
    setActiveTab(root, tab);
    await loadTab(root, tab, user);
  }

  window.VuammoAccountDash = { mount };
})();
