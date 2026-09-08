/* Shared API client for Vua MMO wallet */
(function () {
  const TOKEN_KEY = "vuammo_token";

  function apiBase() {
    if (window.VUAMMO_API_BASE) return window.VUAMMO_API_BASE.replace(/\/$/, "");
    const { protocol, hostname, port } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://127.0.0.1:3100";
    }
    return protocol + "//" + hostname + (port ? ":" + port : "") + "/api";
  }

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (_) {}
  }

  async function api(path, options = {}) {
    const headers = Object.assign(
      { Accept: "application/json" },
      options.headers || {}
    );
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;

    const res = await fetch(apiBase() + path, {
      credentials: "include",
      ...options,
      headers
    });

    let data = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text || "Invalid response" };
    }

    if (!res.ok) {
      const err = new Error((data && data.error) || "Request failed");
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function money(n) {
    return Number(n || 0).toLocaleString("vi-VN") + "₫";
  }

  function showToast(msg) {
    if (typeof window.showToast === "function") {
      window.showToast(msg);
      return;
    }
    const t = document.getElementById("toast");
    if (!t) {
      alert(msg);
      return;
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  window.VuammoApi = { apiBase, api, getToken, setToken, money, showToast, TOKEN_KEY };
})();
