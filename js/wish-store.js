/* Wishlist localStorage for Vua MMO */
(function () {
  const KEY = "vuammo_wish_v1";

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    syncBadges();
    window.dispatchEvent(new CustomEvent("vuammo:wish", { detail: items }));
  }

  function syncBadges() {
    const n = read().length;
    ["wishBadge", "wishBadgeTop"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(n);
    });
  }

  function has(id) {
    return read().some((x) => String(x.id) === String(id));
  }

  function toggle(item) {
    if (!item || item.id == null) return false;
    const id = String(item.id);
    let items = read();
    const exists = items.some((x) => String(x.id) === id);
    if (exists) {
      items = items.filter((x) => String(x.id) !== id);
      write(items);
      return false;
    }
    items.unshift({
      id,
      name: item.name || "Sản phẩm",
      price: Number(item.price || 0),
      regular: item.regular != null ? Number(item.regular) : null,
      image: item.image || "",
      seller: item.seller || "",
      rating: item.rating || 0
    });
    write(items.slice(0, 100));
    return true;
  }

  function remove(id) {
    write(read().filter((x) => String(x.id) !== String(id)));
  }

  function clear() {
    write([]);
  }

  window.WishStore = { KEY, read, write, has, toggle, remove, clear, syncBadges };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncBadges);
  } else {
    syncBadges();
  }
})();
