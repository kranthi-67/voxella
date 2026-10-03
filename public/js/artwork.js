(function () {
  "use strict";
  var Vx = window.Vx, h = Vx.h;
  Vx.initShell({ active: "explore" });

  var id = new URLSearchParams(location.search).get("id");
  var box = document.getElementById("content");
  box.appendChild(h("div", { class: "awLayout" }, h("div", { class: "skel", style: "height:520px" }), h("div", { class: "skel", style: "height:420px" })));

  function notFound(message) {
    box.textContent = "";
    box.appendChild(h("div", { class: "vxCard empty" }, h("div", { class: "ic" }, Vx.icon("image")), h("h3", { text: "Artwork not found" }),
      h("p", { text: message || "It may have been removed by the artist." }), h("a", { class: "vxBtn primary", href: "explore.html", text: "Back to Explore" })));
  }
  if (!id) { notFound("No artwork was selected."); return; }

  Promise.all([Vx.api("/api/artworks/" + encodeURIComponent(id)), Vx.loadMe()]).then(function (res) {
    var data = res[0], me = res[1];
    if (!data.success) { notFound(data.message); return; }
    render(data.artwork, me);
  });

  function render(a, me) {
    var s = a.seller || {};
    document.title = a.title + " | VOXELLA";
    var images = (a.images || []).map(Vx.safeUrl).filter(Boolean);
    var isOwner = me && s.username && me.username === s.username;

    var mainImg = h("img", { alt: a.title, src: images[0] || "" });
    mainImg.style.cursor = "zoom-in";
    mainImg.addEventListener("click", function () { Vx.lightbox(images, current); });
    var current = 0;
    var thumbs = h("div", { class: "awThumbs" });
    function select(i) {
      current = i; mainImg.src = images[i];
      Array.prototype.forEach.call(thumbs.children, function (b, k) { b.classList.toggle("on", k === i); });
    }
    images.forEach(function (url, i) {
      thumbs.appendChild(h("button", { type: "button", class: i === 0 ? "on" : "", "aria-label": "Image " + (i + 1), onclick: function () { select(i); } }, h("img", { src: url, alt: "" })));
    });
    var stage = h("div", { class: "awStage" }, h("div", { class: "main" }, mainImg), images.length > 1 ? thumbs : null);

    var profileHref = "profile.html?username=" + encodeURIComponent(s.username || "");
    var seller = h("a", { class: "sellerBox", href: profileHref }, Vx.avatar(s, "lg"),
      h("div", { class: "vxGrow" }, h("div", { style: "font-weight:700", text: s.displayName || s.username }), h("div", { class: "vxMuted", style: "font-size:13px", text: "@" + s.username }),
        h("div", { style: "margin-top:4px" }, Vx.stars(s.ratingAverage, s.ratingCount))),
      s.commissionsOpen ? h("span", { class: "vxBadge ok", text: "Open" }) : null);

    var info = h("aside", { class: "vxCard awInfo" },
      h("span", { class: "vxTag", text: Vx.label(a.category) }),
      h("h1", { text: a.title }),
      a.forSale ? h("div", { class: "price" }, Vx.money(a.price), h("small", { text: "  USD" })) : h("div", { class: "price" }, h("small", { text: "Portfolio piece, not for sale" })),
      seller);

    var actions = h("div", { class: "stack" });
    if (isOwner) {
      actions.appendChild(h("button", { class: "vxBtn line block", type: "button", onclick: function () {
        Vx.api("/api/artworks/" + encodeURIComponent(a._id), { method: "PUT", json: { featured: !a.featured } }).then(function (d) {
          if (!d.success) { Vx.toast(d.message || "Could not update.", "bad"); return; }
          a.featured = !a.featured; Vx.toast(a.featured ? "Pinned to your profile." : "Unpinned."); this.textContent = a.featured ? "Unpin from profile" : "Pin to profile";
        }.bind(this));
      }, text: a.featured ? "Unpin from profile" : "Pin to profile" }));
      actions.appendChild(h("button", { class: "vxBtn danger block", type: "button", onclick: function () {
        if (!confirm("Delete this artwork? This cannot be undone.")) return;
        Vx.api("/api/artworks/" + encodeURIComponent(a._id), { method: "DELETE" }).then(function (d) {
          if (!d.success) { Vx.toast(d.message || "Could not delete.", "bad"); return; }
          Vx.toast("Artwork deleted."); setTimeout(function () { location.href = "profile.html?username=" + encodeURIComponent(s.username); }, 600);
        });
      }, text: "Delete artwork" }));
    } else {
      actions.appendChild(h("button", { class: "vxBtn primary block", type: "button", onclick: function () { Vx.messageUser(s.username); } }, Vx.icon("message"), a.forSale ? "Message artist to buy" : "Message artist"));
      actions.appendChild(h("a", { class: "vxBtn line block", href: profileHref, text: "View profile" }));
      if (a.forSale) info.appendChild(h("p", { class: "note", text: "" }));
    }
    info.appendChild(actions);
    if (!isOwner && a.forSale) info.appendChild(h("p", { class: "note", text: "Secure checkout is coming soon. For now, message the artist to agree on details before paying." }));
    if (a.description) info.appendChild(h("p", { class: "awDesc", text: a.description }));
    if ((a.tags || []).length) info.appendChild(h("div", { class: "chipRow", style: "margin-top:16px" }, a.tags.map(function (t) { return h("a", { class: "vxTag", href: "explore.html?q=" + encodeURIComponent(t), text: "#" + t }); })));
    info.appendChild(h("p", { class: "note", text: (a.views || 0) + " views · posted " + Vx.timeAgo(a.createdAt) }));

    box.textContent = "";
    box.appendChild(h("div", { class: "awLayout" }, stage, info));

    Vx.api("/api/artworks?seller=" + encodeURIComponent(s.username) + "&limit=5").then(function (d) {
      if (!d.success) return;
      var others = d.artworks.filter(function (x) { return x._id !== a._id; }).slice(0, 4);
      if (!others.length) return;
      document.getElementById("moreTitle").textContent = "More from " + (s.displayName || s.username);
      var grid = document.getElementById("moreGrid");
      others.forEach(function (x) { grid.appendChild(Vx.artCard(x, { hideSeller: true })); });
      document.getElementById("moreWork").hidden = false;
    });
  }
})();
