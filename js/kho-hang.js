/* Kho hàng — nhập tài khoản/key giao tự động (kiểu santhovn) */
(function () {
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function productLabel(id) {
    const sid = String(id);
    if (typeof RAW_PRODUCTS === "undefined") return "#" + sid;
    for (let i = 0; i < RAW_PRODUCTS.length; i++) {
      const p = RAW_PRODUCTS[i];
      if (String(p.id) === sid) return p.name + " (#" + sid + ")";
      const vs = p.variants || [];
      for (let j = 0; j < vs.length; j++) {
        if (String(vs[j].id) === sid) {
          return p.name + " — " + (vs[j].label || "") + " (#" + sid + ")";
        }
      }
    }
    return "#" + sid;
  }

  function buildProductOptions() {
    if (typeof RAW_PRODUCTS === "undefined") return "";
    const opts = [];
    RAW_PRODUCTS.slice(0, 800).forEach((p) => {
      const vs = p.variants && p.variants.length ? p.variants : null;
      if (vs) {
        vs.forEach((v) => {
          opts.push(
            '<option value="' +
              esc(v.id) +
              '">' +
              esc(p.name) +
              " — " +
              esc(v.label || "Gói") +
              " (#" +
              esc(v.id) +
              ")</option>"
          );
        });
      } else {
        opts.push(
          '<option value="' +
            esc(p.id) +
            '">' +
            esc(p.name) +
            " (#" +
            esc(p.id) +
            ")</option>"
        );
      }
    });
    return opts.join("");
  }

  async function loadList() {
    const box = document.getElementById("stockList");
    if (!box) return;
    box.innerHTML = "Đang tải tồn kho…";
    try {
      const data = await VuammoApi.api("/stock");
      if (!data.products.length) {
        box.innerHTML =
          '<div class="info-note"><p>Kho còn trống. Nhập dòng hàng ở form bên trên.</p></div>';
        return;
      }
      box.innerHTML =
        '<div class="stock-table-wrap"><table class="stock-table"><thead><tr>' +
        "<th>Mã / Sản phẩm</th><th>Còn</th><th>Đã bán</th><th>Tổng</th>" +
        "</tr></thead><tbody>" +
        data.products
          .map((row) => {
            return (
              "<tr><td><strong>#" +
              esc(row.product_id) +
              "</strong><br><span class=\"stock-muted\">" +
              esc(productLabel(row.product_id)) +
              "</span></td><td><b class=\"stock-ok\">" +
              row.available +
              "</b></td><td>" +
              row.sold +
              "</td><td>" +
              row.total +
              "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table></div>";
    } catch (err) {
      box.innerHTML = "<p>" + esc(err.message) + "</p>";
    }
  }

  async function init() {
    const mount = document.getElementById("stockApp");
    if (!mount) return;
    await VuammoAuth.refreshMe();
    if (!VuammoAuth.requireLogin("kho-hang.html")) return;

    const user = VuammoAuth.getUser();
    mount.innerHTML =
      '<div class="orders-head">' +
      "<h1>Kho hàng giao khách</h1>" +
      "<p>" +
      esc(user.email) +
      ' · Mỗi dòng = 1 tài khoản/key sẽ giao tự động khi khách thanh toán · ' +
      '<a href="tai-khoan.html#orders">Đơn hàng</a> · ' +
      '<a href="tai-khoan.html">Tài khoản</a></p></div>' +
      '<section class="stock-import cardish">' +
      "<h2>Nhập hàng vào kho</h2>" +
      '<p class="stock-help">Chọn đúng <strong>mã biến thể / sản phẩm</strong> (trùng id trong giỏ). Dán nhiều dòng, ví dụ:<br>' +
      "<code>user1|pass1|email1</code><br><code>KEY-XXXX-YYYY</code></p>" +
      '<form id="stockImportForm" class="stock-form">' +
      '<label>Sản phẩm / biến thể</label>' +
      '<select id="stockProductId" required>' +
      '<option value="">— Chọn —</option>' +
      buildProductOptions() +
      "</select>" +
      '<label>Hoặc nhập mã thủ công</label>' +
      '<input type="text" id="stockProductManual" placeholder="VD: 1189 (CapCut 1 tháng)">' +
      '<label>Token shop (tuỳ chọn)</label>' +
      '<input type="text" id="stockShopToken" placeholder="sellerToken nếu muốn gắn shop">' +
      "<label>Danh sách hàng (1 dòng = 1 đơn vị)</label>" +
      '<textarea id="stockLines" rows="10" placeholder="dán hàng vào đây…" required></textarea>' +
      '<button type="submit" class="btn btn-primary">Lưu vào kho</button>' +
      "</form>" +
      '<p id="stockImportMsg" class="stock-msg" hidden></p>' +
      "</section>" +
      '<section class="stock-list-sec">' +
      "<h2>Tồn kho hiện tại</h2>" +
      '<div id="stockList"></div></section>';

    const form = document.getElementById("stockImportForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const manual = document.getElementById("stockProductManual").value.trim();
      const selected = document.getElementById("stockProductId").value.trim();
      const productId = manual || selected;
      const text = document.getElementById("stockLines").value;
      const shopToken = document.getElementById("stockShopToken").value.trim();
      const msg = document.getElementById("stockImportMsg");
      if (!productId) {
        msg.hidden = false;
        msg.textContent = "Chọn hoặc nhập mã sản phẩm";
        return;
      }
      try {
        const data = await VuammoApi.api("/stock/import", {
          method: "POST",
          body: JSON.stringify({ productId, text, shopToken })
        });
        msg.hidden = false;
        msg.className = "stock-msg stock-msg-ok";
        msg.textContent =
          "Đã thêm " + data.added + " dòng. Tồn mã #" + data.productId + ": " + data.available;
        document.getElementById("stockLines").value = "";
        VuammoApi.showToast("Đã nhập kho");
        loadList();
      } catch (err) {
        msg.hidden = false;
        msg.className = "stock-msg stock-msg-err";
        msg.textContent = err.message || "Lỗi nhập kho";
      }
    });

    loadList();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 60));
  } else {
    setTimeout(init, 60);
  }
})();
