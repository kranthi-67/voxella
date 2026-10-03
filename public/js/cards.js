// Shared artwork / artist card builders (Explore, profile, artwork page)
(function () {
  "use strict";
  var Vx = window.Vx, h = Vx.h;

  Vx.artCard = function (art, opts) {
    opts = opts || {};
    var s = art.seller || {};
    var cover = Vx.safeUrl((art.images || [])[0]);
    var media = h("div", { class: "artMedia" },
      cover ? h("img", { src: cover, alt: art.title || "Artwork", loading: "lazy" }) : null,
      h("div", { class: "shade" }),
      art.category === "3d-model" ? h("span", { class: "artBadge" }, Vx.icon("cube"), " 3D") : (art.category ? h("span", { class: "artBadge", text: Vx.label(art.category) }) : null),
      art.forSale ? h("span", { class: "artPrice", text: Vx.money(art.price) }) : null);
    var meta = h("div", { class: "artMeta" }, h("div", { class: "artTitle", text: art.title }));
    if (!opts.hideSeller) {
      meta.appendChild(h("div", { class: "artBy" }, Vx.avatar(s, "xs"), h("span", { class: "nm", text: s.displayName || s.username || "" }), Vx.stars(s.ratingAverage, s.ratingCount)));
    }
    return h("a", { class: "art", href: "artwork.html?id=" + encodeURIComponent(art._id) }, media, meta);
  };

  Vx.artistCard = function (a) {
    var banner = Vx.safeUrl(a.banner);
    var thumbs = h("div", { class: "acThumbs" });
    for (var i = 0; i < 3; i++) {
      var url = Vx.safeUrl((a.previews || [])[i]);
      thumbs.appendChild(url ? h("img", { src: url, alt: "", loading: "lazy" }) : h("div", { class: "ph" }));
    }
    var chips = h("div", { class: "chipRow" }, (a.specialties || []).slice(0, 3).map(function (sp) { return h("span", { class: "vxTag", text: Vx.label(sp) }); }));
    return h("a", { class: "artistCard", href: "profile.html?username=" + encodeURIComponent(a.username) },
      h("div", { class: "acBanner", style: banner ? "background-image:url('" + banner.replace(/'/g, "%27") + "')" : "background:" + Vx.gradientFor(a.username) }),
      h("div", { class: "acBody" },
        Vx.avatar(a),
        h("h3", {}, a.displayName || a.username, a.commissionsOpen ? h("span", { class: "vxBadge ok", text: "Open" }) : null),
        h("p", { class: "tg", text: a.tagline || ("@" + a.username) }),
        h("div", { class: "vxRow", style: "gap:14px;flex-wrap:wrap" }, Vx.stars(a.ratingAverage, a.ratingCount), h("span", { class: "vxRate", text: (a.artworkCount || 0) + (a.artworkCount === 1 ? " work" : " works") })),
        chips.childNodes.length ? h("div", { style: "margin-top:10px" }, chips) : null,
        thumbs));
  };

  Vx.skeletons = function (n, cls, height) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) frag.appendChild(h("div", { class: "skel " + (cls || ""), style: "height:" + (height || 300) + "px" }));
    return frag;
  };
})();
