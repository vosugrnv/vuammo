/* Đăng ký làm người bán — form validate + toast */
(function () {
  const form = document.getElementById("sellerRegForm");
  if (!form) return;

  const errEl = document.getElementById("sellerFormError");

  function showError(msg) {
    if (!errEl) return;
    errEl.hidden = !msg;
    errEl.textContent = msg || "";
  }

  function toast(msg) {
    if (typeof showToast === "function") showToast(msg);
    else {
      const t = document.getElementById("toast");
      if (!t) {
        alert(msg);
        return;
      }
      t.textContent = msg;
      t.classList.add("show");
      setTimeout(() => t.classList.remove("show"), 2800);
    }
  }

  const phoneOk = (v) => /^0\d{8,10}$/.test(String(v).replace(/[\s.-]/g, ""));
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    showError("");

    const fullName = form.fullName.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    const shopName = form.shopName.value.trim();
    const category = form.category.value;
    const agree = form.agree.checked;

    if (!fullName || fullName.length < 2) {
      showError("Vui lòng nhập họ và tên.");
      form.fullName.focus();
      return;
    }
    if (!phoneOk(phone)) {
      showError("Số điện thoại/Zalo chưa hợp lệ (vd: 09xxxxxxxx).");
      form.phone.focus();
      return;
    }
    if (!emailOk(email)) {
      showError("Email chưa hợp lệ.");
      form.email.focus();
      return;
    }
    if (!shopName) {
      showError("Vui lòng nhập tên gian hàng.");
      form.shopName.focus();
      return;
    }
    if (!category) {
      showError("Vui lòng chọn nhóm hàng chính.");
      form.category.focus();
      return;
    }
    if (!agree) {
      showError("Bạn cần đồng ý điều khoản sử dụng.");
      form.agree.focus();
      return;
    }

    try {
      const payload = {
        fullName,
        phone,
        email,
        shopName,
        category,
        note: form.note.value.trim(),
        at: new Date().toISOString()
      };
      const prev = JSON.parse(localStorage.getItem("vuammo_seller_apps") || "[]");
      prev.push(payload);
      localStorage.setItem("vuammo_seller_apps", JSON.stringify(prev.slice(-20)));
    } catch (_) {}

    form.reset();
    toast("Đã gửi đăng ký. Vua MMO sẽ liên hệ sớm (demo).");
    form.querySelector(".seller-submit")?.blur();
  });

  const io =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((en) => {
              if (en.isIntersecting) {
                en.target.classList.add("is-in");
                io.unobserve(en.target);
              }
            });
          },
          { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
        )
      : null;

  document.querySelectorAll(".seller-reveal").forEach((el) => {
    if (io) io.observe(el);
    else el.classList.add("is-in");
  });

  const sticky = document.getElementById("sellerStickyCta");
  const formSec = document.getElementById("form-dang-ky");
  if (sticky && formSec && "IntersectionObserver" in window) {
    const hideWhenForm = new IntersectionObserver(
      ([en]) => {
        sticky.classList.toggle("is-hidden", en.isIntersecting);
      },
      { threshold: 0.15 }
    );
    hideWhenForm.observe(formSec);
  }
})();
