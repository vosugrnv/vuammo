/* Load published blog from API into SHARE_POSTS (mutates array in place). */
(function () {
  function apiBase() {
    try {
      if (window.VuammoApi && VuammoApi.base) return VuammoApi.base.replace(/\/$/, "");
    } catch (_) {}
    return "/api";
  }

  window.VuammoBlogReady = fetch(apiBase() + "/blog", { credentials: "same-origin" })
    .then(function (r) {
      return r.ok ? r.json() : { items: [] };
    })
    .then(function (data) {
      var items = (data && data.items) || [];
      if (!items.length || typeof SHARE_POSTS === "undefined") return items;
      SHARE_POSTS.splice.apply(SHARE_POSTS, [0, SHARE_POSTS.length].concat(items));
      if (typeof window !== "undefined") window.SHARE_POSTS = SHARE_POSTS;
      return items;
    })
    .catch(function () {
      return [];
    });
})();
