// ==========================================================
// Renders one post card (used by the feed and by profiles)
// ==========================================================
(function () {
  "use strict";
  var Vx = window.Vx, h = Vx.h;

  function mediaBlock(post) {
    var items = post.media || [];
    if (items.length === 1 && items[0].type === "video") {
      return h("div", { class: "media one" }, h("video", { src: Vx.safeUrl(items[0].url), controls: true, playsinline: true, preload: "metadata" }));
    }
    var urls = items.filter(function (m) { return m.type === "image"; }).map(function (m) { return m.url; });
    var shown = urls.slice(0, 4);
    var cls = urls.length === 1 ? "one" : urls.length === 2 ? "two" : urls.length === 3 ? "three" : "many";
    var box = h("div", { class: "media " + cls });
    shown.forEach(function (url, i) {
      var img = h("img", { src: Vx.safeUrl(url), alt: "Post image " + (i + 1), loading: "lazy" });
      var cell = h("button", { class: "mc", type: "button", "aria-label": "Open image", onclick: function () { Vx.lightbox(urls, i); } }, img);
      if (i === 3 && urls.length > 4) cell.appendChild(h("span", { class: "more", text: "+" + (urls.length - 4) }));
      box.appendChild(cell);
    });
    return box;
  }

  Vx.renderPost = function (post, opts) {
    opts = opts || {};
    var a = post.author || {};
    var profileHref = "profile.html?username=" + encodeURIComponent(a.username || "");
    var isOwner = Vx.username && a.username && Vx.username.toLowerCase() === String(a.username).toLowerCase();

    var head = h("div", { class: "postHead" },
      h("a", { href: profileHref }, Vx.avatar(a)),
      h("div", { class: "who" },
        h("div", { class: "nm" },
          h("a", { href: profileHref, text: a.displayName || a.username || "Unknown" }),
          a.userType === "seller" ? h("span", { class: "vxBadge", text: "Artist" }) : null,
          a.userType === "seller" && a.commissionsOpen ? h("span", { class: "vxBadge ok", text: "Open for commissions" }) : null),
        h("div", { class: "sub", text: "@" + (a.username || "") + " · " + Vx.timeAgo(post.createdAt) })));

    var card = h("article", { class: "vxCard post" }, head);

    if (isOwner) {
      var del = h("button", { class: "vxIconBtn", type: "button", "aria-label": "Delete post", title: "Delete post" }, Vx.icon("trash"));
      del.addEventListener("click", function () {
        if (!confirm("Delete this post? This cannot be undone.")) return;
        Vx.api("/api/posts/" + encodeURIComponent(post._id), { method: "DELETE" }).then(function (data) {
          if (!data.success) { Vx.toast(data.message || "Could not delete the post.", "bad"); return; }
          card.remove(); Vx.toast("Post deleted.");
          if (opts.onDeleted) opts.onDeleted(post);
        });
      });
      head.appendChild(del);
    }

    if (post.caption) card.appendChild(h("div", { class: "postCaption", text: post.caption }));
    card.appendChild(mediaBlock(post));

    if (post.artwork && post.artwork._id) {
      var w = post.artwork;
      card.appendChild(h("a", { class: "tagged", href: "artwork.html?id=" + encodeURIComponent(w._id) },
        h("img", { src: Vx.safeUrl((w.images || [])[0]), alt: "", loading: "lazy" }),
        h("div", { class: "vxGrow" }, h("div", { class: "vxMuted", style: "font-size:12px", text: "Tagged artwork" }), h("div", { class: "t", text: w.title })),
        w.forSale ? h("span", { class: "vxBadge", text: Vx.money(w.price) }) : h("span", { class: "vxTag", text: "Portfolio" })));
    }

    var likeCount = h("span", { text: post.likeCount ? String(post.likeCount) : "Like" });
    var likeBtn = h("button", { class: "actBtn" + (post.liked ? " liked" : ""), type: "button", "aria-pressed": post.liked ? "true" : "false" }, Vx.icon("heart"), likeCount);
    likeBtn.addEventListener("click", function () {
      if (!Vx.requireLogin("Log in to like posts.")) return;
      var wasLiked = likeBtn.classList.contains("liked");
      var base = (parseInt(likeCount.textContent, 10) || 0);
      likeBtn.classList.toggle("liked", !wasLiked);
      likeCount.textContent = String(Math.max(0, base + (wasLiked ? -1 : 1))) === "0" ? "Like" : String(Math.max(0, base + (wasLiked ? -1 : 1)));
      Vx.api("/api/posts/" + encodeURIComponent(post._id) + "/like", { method: "POST" }).then(function (data) {
        if (!data.success) { likeBtn.classList.toggle("liked", wasLiked); likeCount.textContent = base ? String(base) : "Like"; Vx.toast(data.message || "Could not like this post.", "bad"); return; }
        likeBtn.classList.toggle("liked", data.liked);
        likeCount.textContent = data.likeCount ? String(data.likeCount) : "Like";
      });
    });
    var actions = h("div", { class: "postActions" }, likeBtn);
    if (!isOwner && a.username) {
      actions.appendChild(h("button", { class: "actBtn", type: "button", onclick: function () { Vx.messageUser(a.username); } }, Vx.icon("message"), a.userType === "seller" ? "Message artist" : "Message"));
    }
    actions.appendChild(h("a", { class: "actBtn", href: profileHref, style: "margin-left:auto" }, Vx.icon("user"), "Profile"));
    card.appendChild(actions);
    return card;
  };
})();
