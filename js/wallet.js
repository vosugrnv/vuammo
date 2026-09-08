/* Top-up page logic */
(function () {
  const PRESETS = [50000, 100000, 200000, 500000, 1000000];

  async function init() {
    const mount = document.getElementById("topupApp");
    if (!mount || !window.VuammoAuth || !window.VuammoApi) return;

    const user = await VuammoAuth.refreshMe();
    if (!user) {
      mount.innerHTML =
        '<div class="topup-locked">' +
        '<div class="topup-locked-icon" aria-hidden="true">🔒</div>' +
        "<h2>Đăng nhập để nạp ví</h2>" +
        "<p>Số dư ví dùng để thanh toán đơn hàng trên Vua MMO. Đăng nhập hoặc tạo tài khoản miễn phí để tiếp tục.</p>" +
        '<div class="topup-locked-actions">' +
        '<a class="btn btn-primary topup-cta" href="tai-khoan.html?next=nap-tien.html">Đăng nhập / Đăng ký</a>' +
        '<a class="btn btn-outline" href="hinh-thuc-thanh-toan.html">Xem hình thức thanh toán</a>' +
        "</div></div>";
      return;
    }

    mount.innerHTML =
      '<div class="topup-layout">' +
      '<section class="topup-card topup-card--main">' +
      '<div class="topup-balance-card">' +
      '<p class="topup-balance-label">Số dư ví hiện tại</p>' +
      '<p class="topup-balance-value" id="topupBalance">' +
      VuammoApi.money(user.balance) +
      "</p>" +
      '<p class="topup-balance-hint">Nạp ví · cộng tự động khi thanh toán thành công</p>' +
      "</div>" +
      '<form class="topup-form" id="topupForm">' +
      '<p class="topup-section-title">Chọn số tiền nạp</p>' +
      '<div class="topup-presets" id="topupPresets"></div>' +
      '<label class="topup-field-label" for="topupAmount">Hoặc nhập số tiền (₫)</label>' +
      '<div class="topup-amount-wrap">' +
      '<input id="topupAmount" type="number" min="1000" step="1000" value="100000" required>' +
      "<span>₫</span></div>" +
      '<button type="submit" class="btn btn-primary topup-cta" id="topupSubmit">Tạo mã nạp ví</button>' +
      "</form>" +
      '<div class="topup-result" id="topupResult" hidden></div>' +
      "</section>" +
      '<aside class="topup-card topup-card--side">' +
      '<h2 class="topup-side-title">Lịch sử ví gần đây</h2>' +
      '<ul class="topup-ledger-list" id="ledgerList"><li class="topup-ledger-empty">Đang tải...</li></ul>' +
      '<a class="topup-side-link" href="tai-khoan.html#orders">Xem đơn hàng →</a>' +
      "</aside></div>";

    const presets = document.getElementById("topupPresets");
    PRESETS.forEach((n, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "topup-preset" + (n === 100000 ? " active" : "");
      b.textContent = VuammoApi.money(n);
      b.addEventListener("click", () => {
        document.getElementById("topupAmount").value = String(n);
        presets.querySelectorAll(".topup-preset").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
      });
      presets.appendChild(b);
      if (i === 1) b.classList.add("active");
    });

    document.getElementById("topupForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const amount = Number(document.getElementById("topupAmount").value);
      const btn = document.getElementById("topupSubmit");
      btn.disabled = true;
      btn.textContent = "Đang tạo...";
      const result = document.getElementById("topupResult");
      try {
        const data = await VuammoApi.api("/wallet/topup", {
          method: "POST",
          body: JSON.stringify({ amount })
        });
        const t = data.topup;
        result.hidden = false;
        if (t.status === "paid") {
          result.innerHTML =
            '<div class="topup-success"><strong>Nạp thành công</strong><p>Đã cộng ' +
            VuammoApi.money(t.amount) +
            " vào ví.</p></div>";
          await VuammoAuth.refreshMe();
          document.getElementById("topupBalance").textContent = VuammoApi.money(
            VuammoAuth.getUser().balance
          );
        } else {
          result.innerHTML =
            '<div class="topup-pending"><strong>Đã tạo giao dịch #' +
            t.orderCode +
            "</strong><p>Số tiền: " +
            VuammoApi.money(t.amount) +
            "</p>" +
            (t.checkoutUrl
              ? '<a class="btn btn-primary topup-cta" href="' +
                t.checkoutUrl +
                '" target="_blank" rel="noopener">Mở trang thanh toán</a>'
              : "") +
            '<button type="button" class="btn btn-outline" id="syncTopupBtn">Tôi đã thanh toán — kiểm tra lại</button></div>';
          document.getElementById("syncTopupBtn")?.addEventListener("click", () =>
            syncTopup(t.orderCode)
          );
          if (t.checkoutUrl) window.open(t.checkoutUrl, "_blank");
        }
        loadLedger();
      } catch (err) {
        VuammoApi.showToast(err.message || "Không tạo được giao dịch");
      } finally {
        btn.disabled = false;
        btn.textContent = "Tạo mã nạp ví";
      }
    });

    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    if (code && (params.get("topup") === "ok" || params.get("topup") === "mock")) {
      await syncTopup(code);
    }
    loadLedger();
  }

  async function syncTopup(code) {
    try {
      const data = await VuammoApi.api("/wallet/topup/" + code + "/sync");
      await VuammoAuth.refreshMe();
      const bal = document.getElementById("topupBalance");
      if (bal && VuammoAuth.getUser()) {
        bal.textContent = VuammoApi.money(VuammoAuth.getUser().balance);
      }
      const result = document.getElementById("topupResult");
      if (result) {
        result.hidden = false;
        result.innerHTML =
          '<div class="topup-success"><strong>Trạng thái: ' +
          (data.topup?.status || "?") +
          "</strong><p>Số dư: " +
          VuammoApi.money(data.balance) +
          "</p></div>";
      }
      VuammoApi.showToast(
        data.topup?.status === "paid" ? "Đã cộng tiền vào ví" : "Giao dịch chưa thanh toán"
      );
      loadLedger();
    } catch (err) {
      VuammoApi.showToast(err.message || "Không đồng bộ được");
    }
  }

  async function loadLedger() {
    const list = document.getElementById("ledgerList");
    if (!list) return;
    try {
      const data = await VuammoApi.api("/wallet/ledger");
      if (!data.items.length) {
        list.innerHTML = '<li class="topup-ledger-empty">Chưa có giao dịch.</li>';
        return;
      }
      const labels = {
        topup: "Nạp tiền",
        purchase: "Mua hàng",
        refund: "Hoàn tiền",
        release: "Giải ngân"
      };
      list.innerHTML = data.items
        .map((it) => {
          const sign = it.amount >= 0 ? "+" : "";
          return (
            "<li><div><span class=\"topup-ledger-type\">" +
            (labels[it.type] || it.type) +
            '</span></div><strong class="' +
            (it.amount >= 0 ? "amt-plus" : "amt-minus") +
            '">' +
            sign +
            VuammoApi.money(it.amount) +
            "</strong></li>"
          );
        })
        .join("");
    } catch {
      list.innerHTML = '<li class="topup-ledger-empty">Không tải được lịch sử.</li>';
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 50));
  } else {
    setTimeout(init, 50);
  }
})();
