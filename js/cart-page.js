/* Cart page + shared addToCart override */
(function () {
  function money(n) {
    return window.VuammoApi ? VuammoApi.money(n) : Number(n).toLocaleString("vi-VN") + "₫";
  }

  window.addToCart = function (itemOrName, maybePrice) {
    if (!window.CartStore) {
      if (window.VuammoApi) VuammoApi.showToast("Giỏ hàng chưa sẵn sàng");
      return;
    }
    let item;
    if (itemOrName && typeof itemOrName === "object") {
      item = itemOrName;
    } else {
      item = {
        id: "name:" + String(itemOrName),
        name: String(itemOrName),
        price: Number(maybePrice || 0) || 0,
        qty: 1
      };
    }
    if (!item.price || item.price <= 0) {
      VuammoApi?.showToast?.("Sản phẩm thiếu giá, không thêm được");
      return;
    }
    CartStore.addItem(item);
    VuammoApi?.showToast?.('Đã thêm "' + item.name + '" vào giỏ');
    if (document.getElementById("cartFilled")) renderCartPage();
  };

  function splitName(name) {
    const raw = String(name || "");
    const parts = raw.split(/\s[–—-]\s/);
    if (parts.length > 1) {
      return { title: parts[0].trim(), meta: parts.slice(1).join(" – ").trim() };
    }
    return { title: raw, meta: "" };
  }

  function renderCartPage() {
    const empty = document.getElementById("cartEmpty") || document.querySelector(".cart-empty");
    const filled = document.getElementById("cartFilled");
    if (!empty || !filled || !window.CartStore) return;

    const items = CartStore.read();
    if (!items.length) {
      empty.hidden = false;
      filled.hidden = true;
      filled.innerHTML = "";
      CartStore.setSelectedIds([]);
      return;
    }

    empty.hidden = true;
    filled.hidden = false;
    if (!sessionStorage.getItem(CartStore.SELECT_KEY)) CartStore.selectAll(true);
    const selected = new Set(CartStore.getSelectedIds());
    const allOn = items.every((i) => selected.has(String(i.id)));
    const selItems = items.filter((i) => selected.has(String(i.id)));
    const selCount = selItems.reduce((s, i) => s + (i.qty || 1), 0);
    const selTotal = selItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);

    filled.innerHTML =
      '<div class="cart-checkout-grid">' +
      '<div class="cart-panel">' +
      '<p class="cart-kicker">Giỏ hàng</p>' +
      "<h1>Giỏ hàng của bạn</h1>" +
      '<p class="cart-lead">Tick chọn món, chỉnh số lượng rồi nhấn Mua hàng — thanh toán bằng ví Vua MMO.</p>' +
      '<div class="scart-toolbar">' +
      '<label class="scart-check"><input type="checkbox" id="pageCartAll"' +
      (allOn ? " checked" : "") +
      "> Chọn tất cả (" +
      items.length +
      ")</label>" +
      '<button type="button" class="dash-act dash-act--ghost" id="pageCartDelSel"' +
      (selItems.length ? "" : " disabled") +
      ">Xóa đã chọn</button>" +
      '<a class="cart-continue" href="tat-ca-san-pham.html">← Tiếp tục mua sắm</a>' +
      "</div>" +
      '<ul class="scart-list" id="cartLines"></ul></div>' +
      '<aside class="cart-summary-card">' +
      "<h2>Thanh toán</h2>" +
      '<div class="cart-sum-row"><span>Đã chọn</span><strong>' +
      selCount +
      "</strong></div>" +
      '<div class="cart-sum-row cart-sum-row--total"><span>Tổng</span><strong id="cartPageTotal">' +
      money(selTotal) +
      "</strong></div>" +
      '<button type="button" class="btn btn-primary cart-checkout-btn" id="pageCartPay"' +
      (selItems.length ? "" : " disabled") +
      ">Mua hàng</button>" +
      '<p class="cart-sum-note">Thanh toán bằng số dư ví. Thiếu tiền? <a href="nap-tien.html">Nạp thêm</a></p>' +
      "</aside></div>";

    const list = document.getElementById("cartLines");
    list.innerHTML = items
      .map((it) => {
        const { title, meta } = splitName(it.name);
        const id = String(it.id);
        const on = selected.has(id);
        return (
          '<li class="scart-item' +
          (on ? " is-on" : "") +
          '" data-id="' +
          escapeHtml(id) +
          '">' +
          '<label class="scart-check scart-check--row"><input type="checkbox" class="js-pick"' +
          (on ? " checked" : "") +
          "></label>" +
          (it.image
            ? '<img class="scart-img" src="' +
              escapeHtml(it.image) +
              '" alt="" loading="lazy">'
            : '<div class="scart-img scart-img--empty"></div>') +
          '<div class="scart-info"><p class="scart-title">' +
          escapeHtml(title) +
          "</p>" +
          (meta ? '<p class="scart-meta">' + escapeHtml(meta) + "</p>" : "") +
          '<p class="scart-unit">Đơn giá: <b>' +
          money(it.price) +
          "</b></p></div>" +
          '<div class="scart-qty">' +
          '<button type="button" data-act="minus" aria-label="Giảm">−</button>' +
          '<span class="scart-qty-n">' +
          it.qty +
          "</span>" +
          '<button type="button" data-act="plus" aria-label="Tăng">+</button>' +
          "</div>" +
          '<div class="scart-line">' +
          money(it.price * it.qty) +
          "</div>" +
          '<button type="button" class="scart-del" data-act="remove">Xóa</button>' +
          "</li>"
        );
      })
      .join("");

    document.getElementById("pageCartAll")?.addEventListener("change", (e) => {
      CartStore.selectAll(!!e.target.checked);
      renderCartPage();
    });
    document.getElementById("pageCartDelSel")?.addEventListener("click", () => {
      if (!confirm("Xóa các sản phẩm đã chọn?")) return;
      CartStore.removeSelected();
      renderCartPage();
    });
    document.getElementById("pageCartPay")?.addEventListener("click", () => {
      if (!CartStore.selectedItems().length) return;
      location.href = "thanh-toan.html";
    });

    list.querySelectorAll(".scart-item").forEach((row) => {
      const id = row.getAttribute("data-id");
      row.querySelector(".js-pick")?.addEventListener("change", (e) => {
        CartStore.toggleSelected(id, e.target.checked);
        renderCartPage();
      });
      row.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const act = btn.getAttribute("data-act");
          const cur = CartStore.read().find((x) => String(x.id) === String(id));
          if (!cur) return;
          if (act === "minus") CartStore.setQty(id, Math.max(1, cur.qty - 1));
          if (act === "plus") CartStore.setQty(id, cur.qty + 1);
          if (act === "remove") CartStore.removeItem(id);
          renderCartPage();
        });
      });
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderTogether() {
    const grid = document.getElementById("cartSuggestGrid");
    if (!grid || typeof productCard !== "function" || typeof RAW_PRODUCTS === "undefined") return;
    const picks = RAW_PRODUCTS.filter((p) => p && p.image && p.price > 0).slice(40, 45);
    grid.innerHTML = picks.map(productCard).join("");
  }

  window.renderCartPage = renderCartPage;

  function boot() {
    CartStore?.syncBadges();
    renderCartPage();
    renderTogether();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
