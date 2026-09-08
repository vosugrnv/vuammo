/* Chat widget — Vua MMO support vs phòng chat từng shop */
(function () {
  const fab = document.getElementById("chatFabBtn");
  const panel = document.getElementById("chatPanel");
  const closeBtn = document.getElementById("chatCloseBtn");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const messages = document.getElementById("chatMessages");
  const badge = document.getElementById("chatFabBadge");
  const titleEl = document.querySelector(".chat-panel-title");
  const subEl = document.querySelector(".chat-panel-sub");
  const avatarEl = document.querySelector(".chat-panel-header .chat-avatar");
  if (!fab || !panel) return;

  const SUPPORT = {
    id: "vuammo_support",
    name: "Vua MMO",
    avatar: "images/logo-vuammo.png",
    subtitle: "Hỗ trợ sàn · thường trả lời trong vài phút",
    hello: "Xin chào 👋 Bạn cần Vua MMO hỗ trợ gì hôm nay?",
    replies: [
      "Cảm ơn bạn đã nhắn tin! Đội ngũ Vua MMO sẽ phản hồi trong ít phút.",
      "Bạn vui lòng cho mình xin thêm thông tin sản phẩm bạn đang quan tâm nhé.",
      "Vua MMO hỗ trợ 8:00 – 22:00 hàng ngày, kể cả cuối tuần. Bạn chờ mình chút nhé!"
    ]
  };

  let mode = SUPPORT;
  let persistKey = "vuammo_chat_v1_support";

  function visitorKey() {
    try {
      let k = localStorage.getItem("vuammo_visitor_key");
      if (!k) {
        k =
          "v_" +
          Math.random().toString(36).slice(2) +
          Date.now().toString(36);
        localStorage.setItem("vuammo_visitor_key", k);
      }
      return k;
    } catch (_) {
      return "anon";
    }
  }

  function channelOf() {
    return mode.id === SUPPORT.id ? "support" : "shop";
  }

  function syncServer(text, who) {
    const role = who === "user" ? "user" : channelOf() === "support" ? "support" : "shop";
    const payload = {
      roomId: mode.id,
      channel: channelOf(),
      visitorKey: visitorKey(),
      role: who === "user" ? "user" : role,
      body: text,
      shopToken: mode.id.indexOf("shop_") === 0 ? mode.id.replace(/^shop_/, "") : "",
      shopName: mode.id === SUPPORT.id ? "" : mode.name || ""
    };
    try {
      if (window.VuammoApi && typeof VuammoApi.api === "function") {
        VuammoApi.api("/chat/messages", {
          method: "POST",
          body: JSON.stringify(payload)
        }).catch(function () {});
      } else {
        fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload)
        }).catch(function () {});
      }
    } catch (_) {}
  }

  function shopModeFromEl(el) {
    const token = el.getAttribute("data-shop-token") || "";
    const name = el.getAttribute("data-shop-name") || "Shop";
    const avatar = el.getAttribute("data-shop-avatar") || "images/logo-vuammo.png";
    const room = el.getAttribute("data-shop-room") || ("shop_" + (token || name));
    return {
      id: room,
      name: name,
      avatar: avatar,
      subtitle: "Chat trực tiếp với shop · gian hàng trên Vua MMO",
      hello:
        "Xin chào! Bạn đang chat với gian hàng " +
        name +
        ". Cứ hỏi về sản phẩm, bảo hành hoặc giao tài khoản nhé.",
      replies: [
        "Shop " + name + " đã nhận tin. Mình check đơn/sản phẩm giúp bạn ngay.",
        "Bạn cần tư vấn gói nào của " + name + " ạ? Gửi giúp mình tên sản phẩm nhé.",
        "Cảm ơn bạn đã inbox shop " + name + ". Mình phản hồi trong giờ làm việc 8:00–22:00."
      ]
    };
  }

  function storageKey(roomId) {
    return "vuammo_chat_room_" + String(roomId || "support");
  }

  function applyHeader() {
    if (titleEl) titleEl.textContent = mode.name;
    if (subEl) {
      subEl.innerHTML =
        '<span class="chat-online-dot"></span>' +
        (mode.subtitle || "Thường trả lời trong vài phút");
    }
    if (avatarEl) {
      avatarEl.src = mode.avatar || SUPPORT.avatar;
      avatarEl.alt = mode.name;
    }
    if (fab) {
      fab.setAttribute(
        "aria-label",
        mode.id === SUPPORT.id ? "Chat trực tiếp với Vua MMO" : "Chat trực tiếp với shop " + mode.name
      );
      fab.classList.toggle("chat-fab--shop", mode.id !== SUPPORT.id);
    }
  }

  function clearMessages() {
    if (!messages) return;
    messages.innerHTML = "";
  }

  function appendMsg(text, who) {
    if (!messages) return;
    const el = document.createElement("div");
    el.className = "chat-msg chat-msg-" + (who === "user" ? "user" : "bot");
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function loadHistory() {
    clearMessages();
    try {
      const raw = localStorage.getItem(persistKey);
      const list = raw ? JSON.parse(raw) : null;
      if (Array.isArray(list) && list.length) {
        list.forEach((m) => appendMsg(m.text, m.who));
        return;
      }
    } catch (_) {}
    appendMsg(mode.hello, "bot");
    saveHistory();
  }

  function saveHistory() {
    if (!messages) return;
    try {
      const list = [...messages.querySelectorAll(".chat-msg")].map((el) => ({
        who: el.classList.contains("chat-msg-user") ? "user" : "bot",
        text: el.textContent || ""
      }));
      localStorage.setItem(persistKey, JSON.stringify(list.slice(-80)));
    } catch (_) {}
  }

  function openPanel() {
    applyHeader();
    loadHistory();
    panel.hidden = false;
    if (badge) badge.style.display = "none";
    if (input) input.focus();
  }

  function closePanel() {
    panel.hidden = true;
  }

  function openSupport() {
    mode = SUPPORT;
    persistKey = storageKey(SUPPORT.id);
    openPanel();
  }

  function openShopChat(cfg) {
    mode = cfg || SUPPORT;
    if (window.ShopsData && Array.isArray(window.ShopsData) && mode.id && mode.id.indexOf("shop_") === 0) {
      const token = mode.id.replace(/^shop_/, "");
      const found = window.ShopsData.find(
        (s) => String(s.token || s.id || "") === token || String(s.slug || "") === token
      );
      if (found) {
        if (found.avatar && (!mode.avatar || mode.avatar.indexOf("logo-vuammo") >= 0)) {
          mode.avatar = found.avatar;
        }
        if (found.name && mode.name === "Shop") mode.name = found.name;
      }
    }
    persistKey = storageKey(mode.id);
    openPanel();
  }

  fab.addEventListener("click", function () {
    // FAB luôn là kênh Vua MMO (hỗ trợ sàn)
    if (panel.hidden) openSupport();
    else if (mode.id !== SUPPORT.id) openSupport();
    else closePanel();
  });
  if (closeBtn) closeBtn.addEventListener("click", closePanel);

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const text = (input && input.value.trim()) || "";
      if (!text) return;
      appendMsg(text, "user");
      if (input) input.value = "";
      saveHistory();
      syncServer(text, "user");
      const replies = mode.replies || SUPPORT.replies;
      setTimeout(function () {
        const reply = replies[Math.floor(Math.random() * replies.length)];
        appendMsg(reply, "bot");
        saveHistory();
        syncServer(reply, "bot");
      }, 700);
    });
  }

  document.addEventListener("click", function (e) {
    const shopTrigger = e.target.closest(".js-open-shop-chat");
    if (shopTrigger) {
      e.preventDefault();
      openShopChat(shopModeFromEl(shopTrigger));
      return;
    }
    const supportTrigger = e.target.closest(".js-open-chat");
    if (supportTrigger) {
      e.preventDefault();
      openSupport();
    }
  });

  window.VuammoChat = {
    openSupport,
    openShop: openShopChat,
    close: closePanel
  };
})();
