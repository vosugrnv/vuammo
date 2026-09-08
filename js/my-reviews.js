/* Trang đánh giá của tôi */
(function () {
  function money(n) {
    return window.VuammoApi ? VuammoApi.money(n) : String(n);
  }
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function formatDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("vi-VN");
    } catch (_) {
      return String(iso);
    }
  }

  async function init() {
    const mount = document.getElementById("myReviewsApp");
    if (!mount || !window.VuammoAuth || !window.VuammoApi) return;
    await VuammoAuth.refreshMe();
    if (!VuammoAuth.requireLogin("danh-gia-cua-toi.html")) return;

    mount.innerHTML = '<p class="dash-muted">Đang tải đánh giá…</p>';
    try {
      const data = await VuammoApi.api("/orders/reviews/mine");
      const list = data.reviews || [];
      if (!list.length) {
        mount.innerHTML =
          '<div class="myrev-empty">' +
          "<p>Bạn chưa gửi đánh giá nào.</p>" +
          '<a class="acct-btn acct-btn--primary" href="tai-khoan.html#orders">Xem đơn hàng</a>' +
          "</div>";
        return;
      }
      mount.innerHTML =
        '<p class="myrev-count">' +
        list.length +
        " đánh giá · mới nhất trước</p>" +
        '<ul class="myrev-list">' +
        list
          .map((rv) => {
            const stars = "★".repeat(Math.max(0, Math.min(5, Number(rv.rating) || 0)));
            return (
              '<li class="myrev-item">' +
              '<div class="myrev-top">' +
              '<span class="myrev-stars" aria-label="' +
              esc(String(rv.rating)) +
              ' sao">' +
              esc(stars) +
              "</span>" +
              '<time class="myrev-time">' +
              esc(formatDate(rv.createdAt)) +
              "</time></div>" +
              '<p class="myrev-product">' +
              esc(rv.productName || "Sản phẩm") +
              "</p>" +
              '<p class="myrev-body">' +
              esc(rv.body) +
              "</p>" +
              '<div class="myrev-meta">' +
              "<span>Đơn #" +
              esc(rv.orderCode) +
              "</span>" +
              '<a href="tai-khoan.html#orders">Xem đơn</a>' +
              "</div></li>"
            );
          })
          .join("") +
        "</ul>";
    } catch (err) {
      mount.innerHTML =
        '<p class="dash-error">' + esc(err.message || "Không tải được đánh giá") + "</p>";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
