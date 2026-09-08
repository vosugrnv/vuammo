/* localStorage cart for Vua MMO */
(function () {
  const KEY = "vuammo_cart_v1";
  const SELECT_KEY = "vuammo_cart_selected_v1";

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
    const ids = new Set(items.map((i) => String(i.id)));
    setSelectedIds(getSelectedIds().filter((id) => ids.has(id)));
    syncBadges();
    window.dispatchEvent(new CustomEvent("vuammo:cart", { detail: items }));
  }

  function getSelectedIds() {
    try {
      const raw = sessionStorage.getItem(SELECT_KEY);
      const list = raw ? JSON.parse(raw) : null;
      if (Array.isArray(list)) return list.map(String);
    } catch (_) {}
    return read().map((i) => String(i.id));
  }

  function setSelectedIds(ids) {
    const uniq = [...new Set((ids || []).map(String))];
    sessionStorage.setItem(SELECT_KEY, JSON.stringify(uniq));
  }

  function isSelected(id) {
    return getSelectedIds().includes(String(id));
  }

  function toggleSelected(id, on) {
    const sid = String(id);
    let ids = getSelectedIds();
    const has = ids.includes(sid);
    if (on == null) on = !has;
    if (on && !has) ids.push(sid);
    if (!on && has) ids = ids.filter((x) => x !== sid);
    setSelectedIds(ids);
    return ids;
  }

  function selectAll(on) {
    setSelectedIds(on ? read().map((i) => String(i.id)) : []);
  }

  function selectedItems() {
    const ids = new Set(getSelectedIds());
    return read().filter((i) => ids.has(String(i.id)));
  }

  function selectedTotal() {
    return selectedItems().reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
  }

  function removeSelected() {
    const ids = new Set(getSelectedIds());
    write(read().filter((i) => !ids.has(String(i.id))));
    setSelectedIds([]);
  }

  function syncBadges() {
    const items = read();
    const count = items.reduce((s, i) => s + (i.qty || 1), 0);
    ["cartBadge", "cartBadgeTop"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(count);
    });
  }

  function addItem(item) {
    const items = read();
    const id = String(item.id);
    const qty = Math.max(1, Number(item.qty || 1));
    const existing = items.find((x) => String(x.id) === id);
    if (existing) {
      existing.qty = (existing.qty || 1) + qty;
      if (item.price != null) existing.price = Number(item.price);
      if (item.name) existing.name = item.name;
      if (item.image) existing.image = item.image;
    } else {
      items.push({
        id,
        name: item.name || "Sản phẩm",
        price: Number(item.price || 0),
        qty,
        image: item.image || ""
      });
    }
    write(items);
    toggleSelected(id, true);
    return items;
  }

  function setQty(id, qty) {
    const items = read();
    const it = items.find((x) => String(x.id) === String(id));
    if (!it) return items;
    it.qty = Math.max(1, Number(qty) || 1);
    write(items);
    return items;
  }

  function removeItem(id) {
    write(read().filter((x) => String(x.id) !== String(id)));
  }

  function clear() {
    write([]);
    setSelectedIds([]);
  }

  function total() {
    return read().reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
  }

  window.CartStore = {
    KEY,
    SELECT_KEY,
    read,
    write,
    addItem,
    setQty,
    removeItem,
    clear,
    total,
    syncBadges,
    getSelectedIds,
    setSelectedIds,
    isSelected,
    toggleSelected,
    selectAll,
    selectedItems,
    selectedTotal,
    removeSelected
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncBadges);
  } else {
    syncBadges();
  }
})();
