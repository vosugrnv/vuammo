/* Checkout — trừ ví + mã khuyến mãi */
(function () {
  async function init() {
    const mount = document.getElementById("checkoutApp");
    if (!mount) return;

    await VuammoAuth.refreshMe();
    if (!VuammoAuth.requireLogin("thanh-toan.html")) return;

    const allItems = CartStore.read();
    const selected = CartStore.selectedItems ? CartStore.selectedItems() : allItems;
    const items = selected.length ? selected : allItems;
    if (!items.length) {
      mount.innerHTML =
        '<div class="info-note"><p>Giỏ hàng trống hoặc chưa chọn sản phẩm.</p><p><a href="tai-khoan.html#cart">Quay lại giỏ hàng</a></p></div>';
      return;
    }

    const user = VuammoAuth.getUser();
    const subtotal = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
    let promo = null; // { code, discount, pay, description, percent }

    let activePromos = [];
    try {
      const data = await VuammoApi.api("/promos/active");
      activePromos = data.items || [];
    } catch (_) {
      activePromos = [];
    }

    function payTotal() {
      return promo ? promo.pay : subtotal;
    }

    function paint() {
      const total = payTotal();
      const enough = user.balance >= total;
      mount.innerHTML =
        '<div class="checkout-layout">' +
        '<div class="checkout-items"><h2>Đơn hàng</h2><ul id="checkoutLines"></ul>' +
        '<div class="checkout-promo-box">' +
        "<h3>Mã khuyến mãi</h3>" +
        (activePromos.length
          ? '<p class="checkout-promo-hint">Mã đang mở — bấm để điền nhanh:</p><div class="checkout-promo-list" id="promoList"></div>'
          : '<p class="checkout-promo-hint">Hiện chưa có mã công khai. Bạn vẫn có thể nhập mã nếu được cấp.</p>') +
        '<div class="checkout-promo-form">' +
        '<input type="text" id="promoInput" placeholder="Nhập mã khuyến mãi" autocomplete="off" value="' +
        escapeHtml(promo ? promo.code : "") +
        '">' +
        '<button type="button" class="btn btn-outline" id="promoApply">Áp dụng</button>' +
        (promo
          ? '<button type="button" class="btn btn-ghost" id="promoClear">Gỡ mã</button>'
          : "") +
        "</div>" +
        '<p id="promoMsg" class="checkout-promo-msg' +
        (promo ? " ok" : "") +
        '">' +
        (promo
          ? "Đã áp dụng <b>" +
            escapeHtml(promo.code) +
            "</b>" +
            (promo.percent ? " (−" + promo.percent + "%)" : "") +
            (promo.description ? " — " + escapeHtml(promo.description) : "")
          : "") +
        "</p></div></div>" +
        '<aside class="checkout-side">' +
        "<h2>Thanh toán ví</h2>" +
        "<p>Số dư: <strong>" +
        VuammoApi.money(user.balance) +
        "</strong></p>" +
        '<div class="checkout-sum">' +
        "<div><span>Tạm tính</span><strong>" +
        VuammoApi.money(subtotal) +
        "</strong></div>" +
        (promo && promo.discount
          ? '<div class="checkout-sum-disc"><span>Giảm giá</span><strong>−' +
            VuammoApi.money(promo.discount) +
            "</strong></div>"
          : "") +
        '<div class="checkout-sum-pay"><span>Cần thanh toán</span><strong>' +
        VuammoApi.money(total) +
        "</strong></div></div>" +
        (enough
          ? '<button type="button" class="btn btn-primary" id="payBtn">Xác nhận trừ ví</button>'
          : '<div class="info-note"><p>Số dư không đủ' +
            (promo ? " (sau giảm giá)" : "") +
            ".</p>" +
            '<a class="btn btn-primary" href="nap-tien.html">Nạp thêm</a></div>') +
        '<p class="checkout-note">Tiền được giữ bảo vệ đơn 3 ngày. Bạn có thể khiếu nại trong thời gian này tại trang Đơn hàng.</p>' +
        "</aside></div>" +
        '<div id="checkoutMsg"></div>';

      document.getElementById("checkoutLines").innerHTML = items
        .map(
          (it) =>
            "<li><span>" +
            escapeHtml(it.name) +
            " × " +
            it.qty +
            "</span><strong>" +
            VuammoApi.money(it.price * it.qty) +
            "</strong></li>"
        )
        .join("");

      const list = document.getElementById("promoList");
      if (list) {
        list.innerHTML = activePromos
          .map((p) => {
            const label =
              escapeHtml(p.code) +
              " · −" +
              p.percent +
              "%" +
              (p.perUserLimit > 0 ? " · " + p.perUserLimit + " lần/TK" : "") +
              (p.description ? " — " + escapeHtml(p.description) : "");
            return (
              '<button type="button" class="checkout-promo-chip" data-code="' +
              escapeHtml(p.code) +
              '">' +
              label +
              "</button>"
            );
          })
          .join("");
        list.querySelectorAll(".checkout-promo-chip").forEach((btn) => {
          btn.addEventListener("click", () => {
            document.getElementById("promoInput").value = btn.getAttribute("data-code");
            applyPromo();
          });
        });
      }

      document.getElementById("promoApply")?.addEventListener("click", applyPromo);
      document.getElementById("promoClear")?.addEventListener("click", () => {
        promo = null;
        paint();
      });
      document.getElementById("promoInput")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          applyPromo();
        }
      });

      document.getElementById("payBtn")?.addEventListener("click", async () => {
        const btn = document.getElementById("payBtn");
        btn.disabled = true;
        btn.textContent = "Đang xử lý...";
        try {
          const body = { items };
          if (promo && promo.code) body.promoCode = promo.code;
          const data = await VuammoApi.api("/orders", {
            method: "POST",
            body: JSON.stringify(body)
          });
          const orderedIds = new Set(items.map((i) => String(i.id)));
          const remain = CartStore.read().filter((i) => !orderedIds.has(String(i.id)));
          CartStore.write(remain);
          if (CartStore.setSelectedIds) CartStore.setSelectedIds(remain.map((i) => String(i.id)));
          await VuammoAuth.refreshMe();
          document.getElementById("checkoutMsg").innerHTML =
            '<div class="info-note"><strong>Đặt hàng thành công!</strong>' +
            "<p>" +
            escapeHtml(data.order.deliveryNote || "") +
            '</p><p><a class="acct-btn acct-btn--primary" href="tai-khoan.html#orders">Xem đơn hàng</a></p></div>';
          mount.querySelector(".checkout-layout").hidden = true;
          VuammoApi.showToast("Đã trừ ví và tạo đơn");
        } catch (err) {
          if (err.status === 402) {
            document.getElementById("checkoutMsg").innerHTML =
              '<div class="info-note"><p>' +
              escapeHtml(err.message) +
              '</p><a class="btn btn-primary" href="nap-tien.html">Nạp thêm</a></div>';
          } else {
            VuammoApi.showToast(err.message || "Không tạo đơn được");
          }
          btn.disabled = false;
          btn.textContent = "Xác nhận trừ ví";
        }
      });
    }

    async function applyPromo() {
      const code = String(document.getElementById("promoInput")?.value || "").trim();
      const msg = document.getElementById("promoMsg");
      if (!code) {
        if (msg) {
          msg.className = "checkout-promo-msg err";
          msg.textContent = "Nhập mã khuyến mãi";
        }
        return;
      }
      try {
        const data = await VuammoApi.api("/promos/validate", {
          method: "POST",
          body: JSON.stringify({ code, amount: subtotal })
        });
        promo = {
          code: data.code,
          discount: data.discount,
          pay: data.pay,
          description: data.description || "",
          percent: data.percent
        };
        paint();
        VuammoApi.showToast("Đã áp dụng mã " + data.code);
      } catch (err) {
        promo = null;
        if (msg) {
          msg.className = "checkout-promo-msg err";
          msg.textContent = err.message || "Mã không hợp lệ";
        } else {
          VuammoApi.showToast(err.message || "Mã không hợp lệ");
        }
      }
    }

    paint();
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 60));
  } else {
    setTimeout(init, 60);
  }
})();
