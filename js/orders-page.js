/* Orders table + dispute + review */
(function () {
  const statusLabel = {
    paid: "Đã thanh toán",
    delivered: "Đã giao / đang bảo vệ",
    disputed: "Đang khiếu nại",
    released: "Đã giải ngân",
    refunded: "Đã hoàn tiền"
  };

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(d) {
    try {
      return new Date(d).toLocaleString("vi-VN");
    } catch {
      return String(d || "");
    }
  }

  function canDispute(o) {
    return (
      ["paid", "delivered"].includes(o.status) &&
      o.holdUntil &&
      new Date(o.holdUntil) > new Date()
    );
  }

  function canReview(o) {
    return !o.reviewed && ["paid", "delivered", "disputed", "released"].includes(o.status);
  }

  async function init() {
    const mount = document.getElementById("ordersApp");
    if (!mount) return;
    await VuammoAuth.refreshMe();
    if (!VuammoAuth.requireLogin("don-hang.html")) return;

    const user = VuammoAuth.getUser();
    mount.innerHTML =
      '<div class="orders-head">' +
      "<h1>Đơn hàng của tôi</h1>" +
      "<p>" +
      escapeHtml(user.email) +
      " · Số dư: <strong>" +
      VuammoApi.money(user.balance) +
      '</strong> · <a href="nap-tien.html">Nạp tiền</a> · ' +
      '<a href="tai-khoan.html#orders">Dashboard</a> · ' +
      '<button type="button" class="linkish" id="logoutOrders">Đăng xuất</button></p>' +
      '<p class="orders-seo-note">Khiếu nại trong thời gian bảo vệ 3 ngày. Đánh giá sau nhận hàng giúp người mua khác và SEO trang sản phẩm.</p>' +
      "</div>" +
      '<div id="ordersList" class="orders-list">Đang tải...</div>' +
      '<div class="dash-modal" id="orderModal" hidden></div>';

    document.getElementById("logoutOrders")?.addEventListener("click", async () => {
      await VuammoAuth.logout();
      location.href = "tai-khoan.html";
    });

    await paint();
  }

  function closeModal() {
    const modal = document.getElementById("orderModal");
    if (!modal) return;
    modal.hidden = true;
    modal.innerHTML = "";
  }

  function openModal(html) {
    const modal = document.getElementById("orderModal");
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

  function receivedCell(o) {
    const lines = o.receivedLines || [];
    if (lines.length) {
      const text = lines.join(" · ");
      return (
        '<div class="dash-recv" title="' +
        escapeHtml(text) +
        '"><code>' +
        escapeHtml(text) +
        "</code></div>"
      );
    }
    if (o.deliveryNote) {
      return (
        '<span class="dash-recv-note">' +
        escapeHtml(String(o.deliveryNote).slice(0, 64)) +
        (o.deliveryNote.length > 64 ? "…" : "") +
        "</span>"
      );
    }
    return "—";
  }

  async function paint() {
    const list = document.getElementById("ordersList");
    try {
      const data = await VuammoApi.api("/orders");
      if (!data.orders.length) {
        list.innerHTML =
          '<div class="info-note"><p>Chưa có đơn nào.</p><a href="tat-ca-san-pham.html">Mua sắm ngay</a></div>';
        return;
      }
      const orders = data.orders;
      list.innerHTML =
        '<div class="dash-table-wrap"><table class="dash-orders-table">' +
        "<colgroup>" +
        '<col class="col-code"><col class="col-name"><col class="col-money"><col class="col-recv">' +
        '<col class="col-time"><col class="col-status"><col class="col-actions">' +
        "</colgroup>" +
        "<thead><tr>" +
        "<th>Mã đơn</th><th>Tên</th><th>Số tiền</th><th>Sản phẩm đã nhận</th><th>Thời gian đặt</th><th>Trạng thái</th><th>Thao tác</th>" +
        "</tr></thead><tbody>" +
        orders
          .map((o) => {
            const code =
              o.code || String(o.id).replace(/-/g, "").slice(0, 10).toUpperCase();
            const name = o.itemNames || "—";
            return (
              '<tr data-id="' +
              escapeHtml(o.id) +
              '"><td><b>#' +
              escapeHtml(code) +
              '</b></td><td class="cell-name" title="' +
              escapeHtml(name) +
              '">' +
              escapeHtml(name) +
              "</td><td><b>" +
              VuammoApi.money(o.total) +
              '</b></td><td class="cell-recv">' +
              receivedCell(o) +
              "</td><td>" +
              escapeHtml(formatDate(o.createdAt)) +
              '</td><td><span class="dash-status dash-status--' +
              escapeHtml(o.status) +
              '" title="' +
              escapeHtml(statusLabel[o.status] || o.status) +
              '">' +
              escapeHtml(statusLabel[o.status] || o.status) +
              '</span></td><td><div class="dash-order-actions">' +
              (canDispute(o)
                ? '<button type="button" class="dash-act dash-act--outline js-dispute">Khiếu nại</button>'
                : o.status === "disputed"
                  ? '<span class="dash-action-muted">Đã KN</span>'
                  : "") +
              (canReview(o)
                ? '<button type="button" class="dash-act dash-act--solid js-review">Đánh giá</button>'
                : o.reviewed
                  ? '<span class="dash-action-muted">Đã DG</span>'
                  : "") +
              '<button type="button" class="dash-act dash-act--ghost js-view">Xem</button>' +
              "</div></td></tr>"
            );
          })
          .join("") +
        "</tbody></table></div>";

      list.querySelectorAll("tr[data-id]").forEach((tr) => {
        const id = tr.getAttribute("data-id");
        const o = orders.find((x) => String(x.id) === id);
        if (!o) return;
        tr.querySelector(".js-view")?.addEventListener("click", () => showDetail(o));
        tr.querySelector(".js-dispute")?.addEventListener("click", () => showDispute(o));
        tr.querySelector(".js-review")?.addEventListener("click", () => showReview(o));
      });
    } catch (err) {
      list.innerHTML = "<p>" + escapeHtml(err.message) + "</p>";
    }
  }

  function showDetail(o) {
    const lines = (o.receivedLines || [])
      .map((l) => "<code>" + escapeHtml(l) + "</code>")
      .join("") || escapeHtml(o.deliveryNote || "Chưa có dữ liệu giao");
    openModal(
      '<div class="dash-modal-head"><h3>Chi tiết đơn #' +
        escapeHtml(o.code) +
        '</h3><button type="button" class="btn btn-ghost btn-sm" data-close>×</button></div>' +
        "<p><strong>Trạng thái:</strong> " +
        escapeHtml(statusLabel[o.status] || o.status) +
        "</p>" +
        "<p><strong>Sản phẩm:</strong> " +
        escapeHtml(o.itemNames || "—") +
        "</p>" +
        "<p><strong>Tổng:</strong> " +
        VuammoApi.money(o.total) +
        "</p>" +
        "<p><strong>Đặt lúc:</strong> " +
        escapeHtml(formatDate(o.createdAt)) +
        " · Bảo vệ đến: " +
        escapeHtml(formatDate(o.holdUntil)) +
        '</p><div class="dash-modal-recv"><p class="dash-modal-recv-title">Sản phẩm đã nhận</p>' +
        lines +
        '</div><div class="dash-modal-actions">' +
        (canDispute(o)
          ? '<button type="button" class="dash-act dash-act--outline" id="mDispute">Khiếu nại</button>'
          : "") +
        (canReview(o)
          ? '<button type="button" class="dash-act dash-act--solid" id="mReview">Đánh giá</button>'
          : "") +
        "</div>"
    );
    document.getElementById("mDispute")?.addEventListener("click", () => showDispute(o));
    document.getElementById("mReview")?.addEventListener("click", () => showReview(o));
  }

  function showDispute(o) {
    openModal(
      '<div class="dash-modal-head"><h3>Khiếu nại #' +
        escapeHtml(o.code) +
        '</h3><button type="button" class="btn btn-ghost btn-sm" data-close>×</button></div>' +
        "<p>Bảo vệ đến <strong>" +
        escapeHtml(formatDate(o.holdUntil)) +
        "</strong>. Mô tả rõ vấn đề (≥ 5 ký tự).</p>" +
        '<form id="disputeForm"><textarea id="disputeReason" rows="4" required minlength="5" placeholder="Mô tả vấn đề..."></textarea>' +
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
        paint();
      } catch (err) {
        VuammoApi.showToast(err.message || "Không gửi được");
      }
    });
  }

  function showReview(o) {
    const first = (o.items || [])[0] || {};
    openModal(
      '<div class="dash-modal-head"><h3>Đánh giá #' +
        escapeHtml(o.code) +
        '</h3><button type="button" class="btn btn-ghost btn-sm" data-close>×</button></div>' +
        "<p><strong>" +
        escapeHtml(first.name || o.itemNames || "") +
        '</strong></p><p class="orders-seo-note">Nội dung đánh giá công khai trên trang sản phẩm (schema Review / AggregateRating).</p>' +
        '<form id="reviewForm"><div class="dash-stars" id="starPick">' +
        [1, 2, 3, 4, 5]
          .map(
            (n) =>
              '<button type="button" class="dash-star" data-n="' +
              n +
              '">★</button>'
          )
          .join("") +
        '</div><input type="hidden" id="reviewRating" value="5">' +
        '<textarea id="reviewBody" rows="4" required minlength="10" placeholder="Chất lượng, giao hàng, hỗ trợ… (≥ 10 ký tự)"></textarea>' +
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
        paint();
      } catch (err) {
        VuammoApi.showToast(err.message || "Không gửi được");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 60));
  } else {
    setTimeout(init, 60);
  }
})();
