(function () {
  "use strict";
  var Vx = window.Vx, h = Vx.h;
  Vx.initShell({ active: "feed" });

  var postsBox = document.getElementById("posts");
  var moreBtn = document.getElementById("more");
  var page = 1, loading = false, mode = "forYou";

  function renderComposer(me) {
    var box = document.getElementById("composer");
    box.textContent = "";
    var fake = h("button", { class: "fake", type: "button", text: me && me.userType === "seller" ? "Share your latest work…" : "Share something with the community…" });
    fake.addEventListener("click", function () { Vx.openCreate("post"); });
    var card = h("div", { class: "vxCard composer" }, Vx.avatar(me), fake,
      h("button", { class: "vxIconBtn", type: "button", "aria-label": "Add photo or video", onclick: function () { Vx.openCreate("post"); } }, Vx.icon("image")));
    box.appendChild(card);
  }

  function emptyFeed() {
    var cta = h("button", { class: "vxBtn primary", type: "button", text: "Create the first post", onclick: function () { Vx.openCreate("post"); } });
    return h("div", { class: "vxCard empty" }, h("div", { class: "ic" }, Vx.icon("image")), h("h3", { text: "Nothing here yet" }),
      h("p", { text: "Posts from artists and buyers show up here. Be the first to share some work." }), cta);
  }

  function loadPosts(reset) {
    if (loading) return;
    loading = true; moreBtn.hidden = true;
    if (reset) { page = 1; postsBox.textContent = ""; postsBox.appendChild(Vx.skeletons(2, "", 360)); }
    Vx.api("/api/posts?feed=" + mode + "&page=" + page + "&limit=8").then(function (data) {
      if (reset) postsBox.textContent = "";
      loading = false;
      if (!data.success) { postsBox.appendChild(h("div", { class: "vxCard empty" }, h("h3", { text: "Could not load the feed" }), h("p", { text: data.message || "Try again in a moment." }))); return; }
      if (!data.posts.length && page === 1) { postsBox.appendChild(emptyFeed()); return; }
      data.posts.forEach(function (p) { postsBox.appendChild(Vx.renderPost(p)); });
      moreBtn.hidden = !data.hasMore;
    });
  }
  moreBtn.addEventListener("click", function () { page += 1; loadPosts(false); });
  var tabForYou = document.getElementById("tabForYou"), tabLatest = document.getElementById("tabLatest");
  function setMode(next) {
    if (mode === next) return;
    mode = next;
    tabForYou.classList.toggle("on", mode === "forYou");
    tabLatest.classList.toggle("on", mode === "latest");
    loadPosts(true);
  }
  tabForYou.addEventListener("click", function () { setMode("forYou"); });
  tabLatest.addEventListener("click", function () { setMode("latest"); });
  window.VxOnPosted = function () { loadPosts(true); };

  Vx.loadMe().then(renderComposer);
  renderComposer(null);
  loadPosts(true);

  Vx.api("/api/artists?open=1&limit=5").then(function (data) {
    var box = document.getElementById("openArtists");
    if (!data.success || !data.artists.length) { box.appendChild(h("p", { class: "vxMuted", style: "margin:0", text: "No artists have opened commissions yet." })); return; }
    data.artists.forEach(function (a) {
      box.appendChild(h("a", { class: "sideArtist", href: "profile.html?username=" + encodeURIComponent(a.username) }, Vx.avatar(a, "sm"),
        h("div", { class: "vxGrow" }, h("div", { class: "t", text: a.displayName || a.username }), h("div", { class: "s", text: a.tagline || "@" + a.username })),
        Vx.stars(a.ratingAverage, a.ratingCount)));
    });
  });
})();
