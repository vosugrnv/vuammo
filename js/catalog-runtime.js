/* Merge CMS products/shops from API into static catalog arrays */
(function () {
  function apiBase() {
    try {
      if (window.VuammoApi && VuammoApi.base) return VuammoApi.base.replace(/\/$/, "");
    } catch (_) {}
    return "/api";
  }

  function mergeProducts(items) {
    if (!items || !items.length) return;
    if (typeof RAW_PRODUCTS === "undefined" || !Array.isArray(RAW_PRODUCTS)) return;
    const byId = new Map(RAW_PRODUCTS.map((p) => [String(p.id), p]));
    items.forEach((p) => {
      const id = String(p.id);
      if (byId.has(id)) {
        Object.assign(byId.get(id), p);
      } else {
        RAW_PRODUCTS.unshift(p);
        byId.set(id, p);
      }
    });
    if (typeof window !== "undefined") window.RAW_PRODUCTS = RAW_PRODUCTS;
  }

  function mergeShops(items) {
    if (!items || !items.length) return;
    if (typeof VUAMMO_SHOPS === "undefined" || !Array.isArray(VUAMMO_SHOPS)) return;
    const byTok = new Map(VUAMMO_SHOPS.map((s) => [String(s.token), s]));
    items.forEach((s) => {
      const t = String(s.token);
      if (byTok.has(t)) Object.assign(byTok.get(t), s);
      else {
        VUAMMO_SHOPS.unshift(s);
        byTok.set(t, s);
      }
    });
    if (typeof window !== "undefined") window.VUAMMO_SHOPS = VUAMMO_SHOPS;
  }

  window.VuammoCatalogReady = fetch(apiBase() + "/catalog/extra", {
    credentials: "same-origin"
  })
    .then(function (r) {
      return r.ok ? r.json() : { products: [], shops: [] };
    })
    .then(function (data) {
      mergeProducts(data.products || []);
      mergeShops(data.shops || []);
      return data;
    })
    .catch(function () {
      return { products: [], shops: [] };
    });
})();
