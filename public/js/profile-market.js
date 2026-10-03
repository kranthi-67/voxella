(function () {
  "use strict";
  var Vx = window.Vx, h = Vx.h;
  Vx.initShell({ active: "profile" });

  var params = new URLSearchParams(location.search);
  var USERNAME = params.get("username");
  if (!USERNAME && Vx.username) { location.replace("profile.html?username=" + encodeURIComponent(Vx.username)); return; }
  var main = document.getElementById("profileMain");
  if (!USERNAME || !main) return;

  var SPECIALTIES = Vx.ART_TYPES;
  var isOwner = Vx.username && Vx.username.toLowerCase() === USERNAME.toLowerCase();
  var user = null, tab = "works";
  var content = h("div");

  main.appendChild(h("div", { class: "skel", style: "height:190px;margin-bottom:18px" }));

  Vx.api("/api/profile/" + encodeURIComponent(USERNAME)).then(function (data) {
    main.textContent = "";
    if (!data.success) {
      main.appendChild(h("div", { class: "vxCard empty" }, h("h3", { text: "Profile not found" }), h("p", { text: data.message || "This account may not exist." })));
      return;
    }
    user = data.user;
    build();
  });

  function build() {
    var seller = user.userType === "seller";
    var summary = h("div", { class: "vxCard pmSummary" });
    var top = h("div", { class: "top" },
      h("p", { class: "pmTagline", text: user.tagline || (seller ? "Artist on VOXELLA" : "Member of VOXELLA") }),
      seller ? h("span", { class: "vxBadge", text: "Artist" }) : h("span", { class: "vxTag", text: "Buyer" }),
      seller && user.commissionsOpen ? h("span", { class: "vxBadge ok", text: "Open for commissions" }) : null);
    summary.appendChild(top);
    var stats = h("div", { class: "pmStats" },
      h("div", { class: "pmStat" }, h("b", { text: user.ratingCount ? Number(user.ratingAverage).toFixed(1) + " ★" : "New" }), h("span", { text: user.ratingCount ? user.ratingCount + " reviews" : "No reviews yet" })),
      h("div", { class: "pmStat" }, h("b", { id: "pmWorks", text: "-" }), h("span", { text: "Works" })),
      h("div", { class: "pmStat" }, h("b", { text: String(user.xp || 0) }), h("span", { text: "XP" })),
      h("div", { class: "pmStat" }, h("b", { text: String((user.trophies || []).length) }), h("span", { text: "Trophies" })));
    summary.appendChild(stats);
    if ((user.specialties || []).length) {
      summary.appendChild(h("div", { class: "chipRow" }, user.specialties.map(function (s) { return h("span", { class: "vxTag", text: Vx.label(s) }); })));
    }
    if (isOwner) {
      summary.appendChild(h("div", { class: "vxRow", style: "margin-top:16px;flex-wrap:wrap" },
        h("button", { class: "vxBtn soft sm", type: "button", onclick: openSettings }, Vx.icon("settings"), "Artist settings"),
        seller ? h("button", { class: "vxBtn primary sm", type: "button", onclick: function () { Vx.openCreate("artwork"); } }, Vx.icon("plus"), "Add artwork") : null,
        h("button", { class: "vxBtn line sm", type: "button", onclick: function () { Vx.openCreate("post"); } }, Vx.icon("image"), "New post")));
    }
    var mobileLayout = window.matchMedia("(max-width: 520px)");
    var profileContent = document.querySelector(".profileContent");
    var profileActions = document.getElementById("profileActions");
    function placeStats() {
      if (mobileLayout.matches && profileContent && profileActions) {
        profileContent.insertBefore(stats, profileActions);
      } else {
        summary.insertBefore(stats, summary.children[1] || null);
      }
    }
    placeStats();
    mobileLayout.addEventListener("change", placeStats);
    main.appendChild(summary);

    var tabs = h("div", { class: "tabs pmTabs" });
    var bW = h("button", { type: "button", text: "Works", class: "on" });
    var bP = h("button", { type: "button", text: "Posts" });
    tabs.appendChild(bW); tabs.appendChild(bP);
    bW.addEventListener("click", function () { tab = "works"; bW.classList.add("on"); bP.classList.remove("on"); loadTab(); });
    bP.addEventListener("click", function () { tab = "posts"; bP.classList.add("on"); bW.classList.remove("on"); loadTab(); });
    main.appendChild(tabs);
    main.appendChild(content);
    loadTab();
  }

  function loadTab() {
    content.textContent = "";
    if (tab === "works") {
      var grid = h("div", { class: "pmGrid" }, Vx.skeletons(3, "", 280));
      content.appendChild(grid);
      Vx.api("/api/artworks?seller=" + encodeURIComponent(USERNAME) + "&limit=24").then(function (data) {
        grid.textContent = "";
        var works = data.success ? data.artworks : [];
        var count = document.getElementById("pmWorks"); if (count) count.textContent = String(data.success ? data.total : 0);
        if (isOwner && user.userType === "seller") {
          grid.appendChild(h("button", { class: "pmAdd", type: "button", onclick: function () { Vx.openCreate("artwork"); } }, Vx.icon("plus"), "Add artwork"));
        }
        works.forEach(function (w) { grid.appendChild(Vx.artCard(w, { hideSeller: true })); });
        if (!works.length && !(isOwner && user.userType === "seller")) {
          content.textContent = "";
          content.appendChild(h("div", { class: "vxCard empty" }, h("div", { class: "ic" }, Vx.icon("image")), h("h3", { text: user.userType === "seller" ? "No artwork yet" : "Buyer account" }),
            h("p", { text: user.userType === "seller" ? "This artist hasn't published any work yet." : "Buyers don't publish artwork. Check the Posts tab for what they've shared." })));
        }
      });
    } else {
      var col = h("div", { class: "postsCol" }, Vx.skeletons(1, "", 320));
      content.appendChild(col);
      Vx.api("/api/posts?author=" + encodeURIComponent(USERNAME) + "&limit=10").then(function (data) {
        col.textContent = "";
        if (!data.success || !data.posts.length) {
          col.appendChild(h("div", { class: "vxCard empty" }, h("div", { class: "ic" }, Vx.icon("image")), h("h3", { text: "No posts yet" }),
            h("p", { text: isOwner ? "Share your work, process or news with the community." : "Nothing posted yet." }),
            isOwner ? h("button", { class: "vxBtn primary", type: "button", text: "Create a post", onclick: function () { Vx.openCreate("post"); } }) : null));
          return;
        }
        data.posts.forEach(function (p) { col.appendChild(Vx.renderPost(p)); });
      });
    }
  }

  function openSettings() {
    var type = user.userType === "seller" ? "seller" : "buyer";
    var tagline = h("input", { class: "vxInput", maxlength: "80", value: user.tagline || "", placeholder: "e.g. Fantasy illustrator & character designer" });
    var open = h("input", { type: "checkbox" }); open.checked = !!user.commissionsOpen;
    var chosen = new Set(user.specialties || []);
    var chips = h("div", { class: "chipRow" });
    function drawChips() {
      chips.textContent = "";
      SPECIALTIES.forEach(function (s) {
        var on = chosen.has(s);
        chips.appendChild(h("button", { class: "vxChip" + (on ? " on" : ""), type: "button", text: Vx.label(s), onclick: function () {
          if (chosen.has(s)) chosen.delete(s); else if (chosen.size >= 5) { Vx.toast("Pick up to 5 specialties.", "bad"); return; } else chosen.add(s);
          drawChips();
        } }));
      });
    }
    drawChips();
    var typeBtns = h("div", { class: "tabs" });
    var bB = h("button", { type: "button", text: "Buyer" }), bS = h("button", { type: "button", text: "Artist" });
    function drawType() { bB.classList.toggle("on", type === "buyer"); bS.classList.toggle("on", type === "seller"); artistBox.hidden = type !== "seller"; }
    bB.addEventListener("click", function () { type = "buyer"; drawType(); });
    bS.addEventListener("click", function () { type = "seller"; drawType(); });
    typeBtns.appendChild(bB); typeBtns.appendChild(bS);
    var artistBox = h("div", { style: "margin-top:18px" },
      h("div", { class: "field" }, h("label", { text: "Tagline" }), tagline),
      h("div", { class: "field" }, h("label", { text: "Specialties (up to 5)" }), chips),
      h("label", { class: "switchRow" }, open, h("span", {}, h("strong", { text: "Open for commissions" }), h("div", { class: "vxMuted", text: "Shows an Open badge on your profile and in search." }))));
    var error = h("div", { class: "err", hidden: true });
    var save = h("button", { class: "vxBtn primary", type: "button", text: "Save" });
    var cancel = h("button", { class: "vxBtn soft", type: "button", text: "Cancel" });
    var m = Vx.modal({ title: "Account & artist settings", body: h("div", {}, error, h("div", { class: "field" }, h("label", { text: "Account type" }), typeBtns), artistBox), footer: [cancel, save] });
    drawType();
    cancel.addEventListener("click", m.close);
    save.addEventListener("click", function () {
      error.hidden = true; save.disabled = true;
      var payload = { userType: type };
      if (type === "seller") { payload.tagline = tagline.value.trim(); payload.specialties = Array.from(chosen); payload.commissionsOpen = open.checked; }
      Vx.api("/api/profile/update", { method: "PUT", json: payload }).then(function (data) {
        if (!data.success) { save.disabled = false; error.textContent = data.message || "Could not save."; error.hidden = false; return; }
        m.close(); Vx.toast("Saved."); setTimeout(function () { location.reload(); }, 500);
      });
    });
  }
})();
