/* ---------- Shared header/drawer/cart interactions (used by non-home pages) ---------- */
window.toggleWish = (btn) => {
  if (!btn) return;
  const item = {
    id: btn.dataset.wishId || btn.getAttribute("data-wish-id"),
    name: btn.dataset.wishName || "",
    price: Number(btn.dataset.wishPrice || 0),
    regular: btn.dataset.wishRegular ? Number(btn.dataset.wishRegular) : null,
    image: btn.dataset.wishImage || "",
    seller: btn.dataset.wishSeller || "",
    rating: btn.dataset.wishRating ? Number(btn.dataset.wishRating) : 0
  };
  if (!item.id) return;

  // Fallback nếu wish-store chưa load: ghi thẳng localStorage
  if (!window.WishStore) {
    const KEY = "vuammo_wish_v1";
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (!Array.isArray(list)) list = [];
    } catch (_) {
      list = [];
    }
    const id = String(item.id);
    const exists = list.some((x) => String(x.id) === id);
    if (exists) list = list.filter((x) => String(x.id) !== id);
    else {
      list.unshift({
        id,
        name: item.name || "Sản phẩm",
        price: Number(item.price || 0),
        regular: item.regular != null ? Number(item.regular) : null,
        image: item.image || "",
        seller: item.seller || "",
        rating: item.rating || 0
      });
    }
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
    btn.classList.toggle("active", !exists);
    ["wishBadge", "wishBadgeTop"].forEach((idEl) => {
      const badge = document.getElementById(idEl);
      if (badge) badge.textContent = String(list.length);
    });
    if (typeof showToast === "function") {
      showToast(!exists ? "Đã thêm vào wishlist" : "Đã bỏ khỏi wishlist");
    }
    return;
  }

  const on = WishStore.toggle(item);
  btn.classList.toggle("active", on);
  if (typeof showToast === "function") {
    showToast(on ? "Đã thêm vào wishlist" : "Đã bỏ khỏi wishlist");
  }
};

/* addToCart provided by cart-page.js / CartStore when loaded */

let toastTimer;
window.showToast = function showToast(msg){
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("show"), 2200);
};

const drawer = document.getElementById("drawer");
const backdrop = document.getElementById("drawerBackdrop");
function closeDrawer(){ drawer.classList.remove("open"); backdrop.classList.remove("open"); }
function openDrawer(){ drawer.classList.add("open"); backdrop.classList.add("open"); }
document.getElementById("menuBtn")?.addEventListener("click", openDrawer);
backdrop?.addEventListener("click", closeDrawer);
drawer?.querySelectorAll("a").forEach(a=>a.addEventListener("click", closeDrawer));
document.getElementById("catMenuBtn")?.addEventListener("click", openDrawer);
document.getElementById("sideNavToggle")?.addEventListener("click", openDrawer);

/* Gỡ pill tên+số dư cũ — không rebuild header (tránh phá dropdown) */
(function stripLegacyWalletPill() {
  const run = () => {
    document.querySelectorAll("#walletBalanceBadge, .wallet-balance-badge, #cartTotalTop").forEach((el) => el.remove());
    if (window.VuammoHeader && typeof VuammoHeader.sync === "function") VuammoHeader.sync();
  };
  run();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  window.addEventListener("vuammo:user", run);
})();

