// ==========================================================
// VOXELLA shell: shared helpers + the top bar / mobile tab bar
// Every marketplace page loads this first.
// ==========================================================
(function () {
  "use strict";

  var TOKEN = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  var USERNAME = localStorage.getItem("username") || sessionStorage.getItem("username") || "";
  var DEFAULT_AVATAR = "assets/defaultavatar.png";

  var Vx = window.Vx = { token: TOKEN, username: USERNAME, me: null, DEFAULT_AVATAR: DEFAULT_AVATAR };

  // Art types, grouped for the pickers (keep in sync with config/marketplace.js)
  Vx.ART_TYPE_GROUPS = [
    { key: "traditional", title: "Traditional", items: ["traditional-art", "sketching", "watercolor", "oil-painting", "calligraphy", "sculpture"] },
    { key: "digital", title: "Digital", items: ["digital-art", "illustration", "character-design", "concept-art", "pixel-art", "animation"] },
    { key: "design", title: "Design", items: ["logo-design", "graphic-design", "ui-design"] },
    { key: "3d", title: "3D", items: ["3d-modeling", "3d-sculpting"] }
  ];
  Vx.ART_TYPES = Vx.ART_TYPE_GROUPS.reduce(function (all, g) { return all.concat(g.items); }, []);

  // ---------- tiny DOM builder (never uses innerHTML for user text) ----------
  function append(el, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
  }
  Vx.h = function (tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === "class") el.className = value;
      else if (key === "text") el.textContent = value;
      else if (key.slice(0, 2) === "on") el.addEventListener(key.slice(2), value);
      else if (key === "style") el.style.cssText = value;
      else el.setAttribute(key, value === true ? "" : value);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };
  var h = Vx.h;

  // ---------- icons (static SVG, safe to use innerHTML) ----------
  var ICONS = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    message: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.2A6.5 6.5 0 0 1 21.5 20"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    star: '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    video: '<rect x="2" y="5" width="14" height="14" rx="3"/><path d="m16 10 6-3v10l-6-3"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    cube: '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    brush: '<path d="M9.1 11.9 18 3l3 3-8.9 8.9"/><path d="M9 13.5c-2.5 0-4 1.6-4 4 0 1.6-.8 2.7-2 3.5 3.5.9 8-.3 8-4a3.5 3.5 0 0 0-2-3.5z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  };
  Vx.icon = function (name, extra) {
    var span = document.createElement("span");
    span.style.display = "inline-flex";
    span.innerHTML = '<svg class="vxSvg ' + (extra || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
    return span.firstChild;
  };

  // ---------- small utilities ----------
  Vx.safeUrl = function (url) {
    url = String(url || "");
    if (/^https?:\/\//i.test(url) || /^\/[^/]/.test(url) || /^assets\//.test(url) || /^blob:/.test(url)) return url;
    return "";
  };
  Vx.timeAgo = function (date) {
    var seconds = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
    var steps = [[60, "s"], [60, "m"], [24, "h"], [7, "d"], [4.35, "w"], [12, "mo"], [Infinity, "y"]];
    var value = seconds;
    for (var i = 0; i < steps.length; i++) {
      if (value < steps[i][0]) return Math.floor(value) + steps[i][1] + " ago";
      value = value / steps[i][0];
    }
    return "";
  };
  Vx.money = function (amount) {
    var n = Number(amount) || 0;
    try { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n); }
    catch (_) { return "$" + n; }
  };
  var LABELS = { "3d-model": "3D model", "3d-modeling": "3D modeling", "3d-sculpting": "3D sculpting", "ui-design": "UI design" };
  Vx.label = function (slug) {
    slug = String(slug || "");
    if (LABELS[slug]) return LABELS[slug];
    var text = slug.replace(/-/g, " ");
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  Vx.gradientFor = function (seed) {
    var hash = 0; seed = String(seed || "x");
    for (var i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    var hue = 18 + (hash % 40), hue2 = (hue + 28 + (hash >> 3) % 40) % 360;
    return "linear-gradient(135deg,hsl(" + hue + " 55% 30%),hsl(" + hue2 + " 60% 45%))";
  };
  Vx.avatar = function (user, size) {
    var img = h("img", { class: "vxAv " + (size || ""), alt: "", loading: "lazy", src: Vx.safeUrl(user && user.avatar) || DEFAULT_AVATAR });
    img.onerror = function () { img.onerror = null; img.src = DEFAULT_AVATAR; };
    return img;
  };
  Vx.stars = function (average, count) {
    if (!count) return h("span", { class: "vxRate", text: "New" });
    return h("span", { class: "vxRate" }, Vx.icon("star", "fill"), h("b", { text: Number(average || 0).toFixed(1) }), "(" + count + ")");
  };

  // ---------- network ----------
  Vx.api = function (path, opts) {
    opts = opts || {};
    var headers = Object.assign({}, opts.headers || {});
    if (TOKEN) headers.Authorization = "Bearer " + TOKEN;
    var body = opts.body;
    if (opts.json !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(opts.json); }
    return fetch(path, { method: opts.method || "GET", headers: headers, body: body })
      .then(function (res) { return res.json().catch(function () { return { success: false, message: "Unexpected server response." }; }); })
      .catch(function () { return { success: false, message: "Network error. Check your connection." }; });
  };
  Vx.upload = function (url, formData, onProgress) {
    return new Promise(function (resolve) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      if (TOKEN) xhr.setRequestHeader("Authorization", "Bearer " + TOKEN);
      xhr.upload.onprogress = function (e) { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      xhr.onload = function () {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch (_) { resolve({ success: false, message: "Unexpected server response." }); }
      };
      xhr.onerror = function () { resolve({ success: false, message: "Network error. Check your connection." }); };
      xhr.send(formData);
    });
  };
  Vx.loadMe = function () {
    if (!TOKEN) return Promise.resolve(null);
    if (Vx.me) return Promise.resolve(Vx.me);
    return Vx.api("/api/auth/me").then(function (data) {
      if (data && data.success) Vx.me = data.user;
      return Vx.me;
    });
  };
  Vx.requireLogin = function (message) {
    if (TOKEN) return true;
    Vx.toast(message || "Please log in first.", "bad");
    setTimeout(function () { window.location.href = "login.html"; }, 900);
    return false;
  };
  Vx.logout = function () {
    ["username", "token"].forEach(function (k) { localStorage.removeItem(k); sessionStorage.removeItem(k); });
    window.location.href = "login.html";
  };
  Vx.messageUser = function (username) {
    if (!Vx.requireLogin("Please log in to send a message.")) return;
    Vx.api("/api/chat/private", { method: "POST", json: { target: username } }).then(function (data) {
      if (!data.success) { Vx.toast(data.message || "Could not open the chat.", "bad"); return; }
      window.location.href = "chat.html?chatId=" + encodeURIComponent(data.chatId);
    });
  };

  // ---------- toast ----------
  Vx.toast = function (message, kind) {
    var box = document.querySelector(".vxToasts");
    if (!box) { box = h("div", { class: "vxToasts", role: "status", "aria-live": "polite" }); document.body.appendChild(box); }
    var el = h("div", { class: "vxToast" + (kind === "bad" ? " bad" : ""), text: message });
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, 3600);
  };

  // ---------- modal ----------
  Vx.modal = function (opts) {
    var overlay = h("div", { class: "vxOverlay" });
    var closeBtn = h("button", { class: "vxIconBtn", type: "button", "aria-label": "Close" }, Vx.icon("x"));
    var modal = h("div", { class: "vxModal" + (opts.wide ? " wide" : ""), role: "dialog", "aria-modal": "true", "aria-label": opts.title },
      h("header", {}, h("h2", { text: opts.title }), closeBtn),
      h("div", { class: "body" }, opts.body),
      opts.footer ? h("footer", {}, opts.footer) : null);
    overlay.appendChild(modal);
    function onKey(e) { if (e.key === "Escape") close(); }
    function close() {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      overlay.remove();
      if (opts.onClose) opts.onClose();
    }
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.body.appendChild(overlay);
    return { close: close, el: modal };
  };

  // ---------- lightbox ----------
  Vx.lightbox = function (urls, start) {
    var index = start || 0;
    var img = h("img", { alt: "" });
    var box = h("div", { class: "lightbox" });
    function show() { img.src = Vx.safeUrl(urls[index]); }
    function close() { document.removeEventListener("keydown", onKey); box.remove(); document.body.style.overflow = ""; }
    function step(d) { index = (index + d + urls.length) % urls.length; show(); }
    function onKey(e) { if (e.key === "Escape") close(); if (e.key === "ArrowLeft" && urls.length > 1) step(-1); if (e.key === "ArrowRight" && urls.length > 1) step(1); }
    box.appendChild(img);
    box.appendChild(h("button", { class: "close", type: "button", "aria-label": "Close", onclick: close }, Vx.icon("x")));
    if (urls.length > 1) {
      box.appendChild(h("button", { class: "nav prev", type: "button", "aria-label": "Previous", onclick: function () { step(-1); } }, Vx.icon("chevL")));
      box.appendChild(h("button", { class: "nav next", type: "button", "aria-label": "Next", onclick: function () { step(1); } }, Vx.icon("chevR")));
    }
    box.addEventListener("mousedown", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.body.appendChild(box);
    show();
  };

  // ---------- header + mobile tabs ----------
  Vx.initShell = function (opts) {
    opts = opts || {};
    var active = opts.active || "";

    // Members only: no guest access
    if (!TOKEN) { window.location.replace("login.html"); return; }
    // First time here? Finish setup (buyer/artist + art types) before anything else.
    if (!opts.onboarding) {
      Vx.loadMe().then(function (me) {
        if (me === null && !Vx.me) { Vx.logout(); return; }
        if (me && !me.onboarded) window.location.replace("onboarding.html");
      });
    }
    document.body.classList.add("vx");

    function navLink(key, href, icon, text) {
      var a = h("a", { href: href, class: active === key ? "on" : "" }, Vx.icon(icon), text);
      return a;
    }
    var msgDot = h("i", { class: "vxDot", hidden: true });
    var msgLink = h("a", { href: "my-chats.html", class: active === "messages" ? "on" : "" }, Vx.icon("message"), "Messages", msgDot);

    var search = h("form", { class: "vxSearch", role: "search" }, Vx.icon("search"),
      h("input", { type: "search", name: "q", placeholder: "Search artists and artwork", "aria-label": "Search", autocomplete: "off" }));
    search.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = search.q.value.trim();
      window.location.href = "explore.html" + (q ? "?q=" + encodeURIComponent(q) : "");
    });

    var themeBtn = h("button", { class: "vxIconBtn", type: "button", "aria-label": "Switch between dark and cream mode" }, Vx.icon("sun"));
    themeBtn.addEventListener("click", function () {
      if (window.setAppearance) window.setAppearance(document.documentElement.dataset.appearance === "white" ? "dark" : "white");
    });

    var right = h("div", { class: "vxRight" }, themeBtn);
    var mobileTabs = h("nav", { class: "vxTabs", "aria-label": "Main" });

    function menuItem(icon, text, onClick, href) {
      var inner = [Vx.icon(icon), text];
      return href ? h("a", { href: href }, inner) : h("button", { type: "button", onclick: onClick }, inner);
    }

    function buildLoggedIn() {
      var createBtn = h("button", { class: "vxBtn primary sm", type: "button" }, Vx.icon("plus"), "Create");
      var createMenu = h("div", { class: "vxMenu", hidden: true });
      var wrap = h("div", { class: "vxMenuWrap" }, createBtn, createMenu);
      function openCreate(kind) {
        createMenu.hidden = true;
        Vx.loadMe().then(function (me) {
          if (!window.VxCompose) { Vx.toast("Still loading, try again.", "bad"); return; }
          if (kind === "post") window.VxCompose.post(me);
          else if (me && me.userType === "seller") window.VxCompose.artwork(me);
          else window.VxCompose.becomeArtist(me);
        });
      }
      Vx.openCreate = openCreate;
      createMenu.appendChild(menuItem("image", "New post", function () { openCreate("post"); }));
      createMenu.appendChild(menuItem("brush", "New artwork", function () { openCreate("artwork"); }));
      createBtn.addEventListener("click", function (e) { e.stopPropagation(); createMenu.hidden = !createMenu.hidden; accountMenu.hidden = true; });

      var chipImg = Vx.avatar(null, "sm");
      var chipName = h("span", { text: USERNAME });
      var userBtn = h("button", { class: "vxUser", type: "button" }, chipImg, chipName);
      var accountMenu = h("div", { class: "vxMenu", hidden: true },
        menuItem("user", "My profile", null, "profile.html?username=" + encodeURIComponent(USERNAME)),
        menuItem("message", "Messages", null, "my-chats.html"),
        menuItem("users", "People & groups", null, "friends.html"),
        h("hr"),
        menuItem("logout", "Log out", function () { if (confirm("Log out of VOXELLA?")) Vx.logout(); }));
      var uWrap = h("div", { class: "vxMenuWrap" }, userBtn, accountMenu);
      userBtn.addEventListener("click", function (e) { e.stopPropagation(); accountMenu.hidden = !accountMenu.hidden; createMenu.hidden = true; });
      document.addEventListener("click", function () { createMenu.hidden = true; accountMenu.hidden = true; });
      right.appendChild(wrap);
      right.appendChild(uWrap);

      Vx.loadMe().then(function (me) {
        if (!me) return;
        chipImg.src = Vx.safeUrl(me.avatar) || DEFAULT_AVATAR;
        chipName.textContent = me.displayName || USERNAME;
      });
    }

    buildLoggedIn();

    var header = h("header", { class: "vxHeader" }, h("div", { class: "in" },
      h("a", { class: "vxBrand", href: "dashboard.html" }, h("span", { class: "vxMark", text: "V" }), "VOXELLA"),
      search,
      h("nav", { class: "vxNav", "aria-label": "Main" },
        navLink("feed", "dashboard.html", "home", "Feed"),
        navLink("explore", "explore.html", "compass", "Explore"),
        msgLink,
        navLink("people", "friends.html", "users", "People")),
      right));
    document.body.insertBefore(header, document.body.firstChild);

    // mobile bottom tabs
    var tabMsgDot = h("i", { class: "vxDot", hidden: true });
    function tab(key, href, icon, text) { return h("a", { href: href, class: active === key ? "on" : "" }, Vx.icon(icon), text); }
    var plus = h("button", { class: "plus", type: "button", "aria-label": "Create" }, Vx.icon("plus"));
    plus.addEventListener("click", function () {
      if (!TOKEN) { Vx.requireLogin("Log in to share your work."); return; }
      Vx.loadMe().then(function (me) {
        var chooser = h("div", { class: "stack" },
          h("button", { class: "vxBtn soft block", type: "button", onclick: function () { m.close(); window.VxCompose.post(me); } }, Vx.icon("image"), "New post"),
          h("button", { class: "vxBtn soft block", type: "button", onclick: function () { m.close(); if (me && me.userType === "seller") window.VxCompose.artwork(me); else window.VxCompose.becomeArtist(me); } }, Vx.icon("brush"), "New artwork"));
        var m = Vx.modal({ title: "Create", body: chooser });
      });
    });
    mobileTabs.appendChild(tab("feed", "dashboard.html", "home", "Feed"));
    mobileTabs.appendChild(tab("explore", "explore.html", "compass", "Explore"));
    mobileTabs.appendChild(plus);
    mobileTabs.appendChild(h("a", { href: "my-chats.html", class: active === "messages" ? "on" : "" }, Vx.icon("message"), "Chats", tabMsgDot));
    mobileTabs.appendChild(tab("profile", TOKEN ? "profile.html?username=" + encodeURIComponent(USERNAME) : "login.html", "user", TOKEN ? "Profile" : "Log in"));
    document.body.appendChild(mobileTabs);

    // unread messages dot
    function refreshUnread() {
      if (!TOKEN) return;
      Vx.api("/api/chat/list").then(function (data) {
        var unread = !!(data && data.success && (data.chats || []).some(function (c) { return c.unreadCount > 0; }));
        msgDot.hidden = !unread; tabMsgDot.hidden = !unread;
      });
    }
    refreshUnread();
    setInterval(refreshUnread, 20000);
  };
})();
