(function () {
  "use strict";
  var Vx = window.Vx, h = Vx.h;
  Vx.initShell({ active: "explore" });
  document.getElementById("bigSearchIcon").appendChild(Vx.icon("search"));

  var params = new URLSearchParams(location.search);
  var state = {
    tab: params.get("tab") === "artists" ? "artists" : "art",
    q: params.get("q") || "",
    category: params.get("category") || "",
    forSale: params.get("forSale") === "1",
    sort: params.get("sort") || "",
    open: params.get("open") === "1",
    specialty: params.get("specialty") || "",
    page: 1
  };
  var qInput = document.getElementById("q");
  var results = document.getElementById("results");
  var filters = document.getElementById("filters");
  var moreBtn = document.getElementById("more");
  var tabArt = document.getElementById("tabArt"), tabArtists = document.getElementById("tabArtists");
  var token = 0;
  qInput.value = state.q;

  var SPECIALTIES = ["digital-art", "illustration", "character-design", "concept-art", "pixel-art", "logo-design", "graphic-design", "ui-design", "animation", "3d-modeling", "3d-sculpting"];

  function syncUrl() {
    var p = new URLSearchParams();
    if (state.tab === "artists") p.set("tab", "artists");
    if (state.q) p.set("q", state.q);
    if (state.category) p.set("category", state.category);
    if (state.forSale) p.set("forSale", "1");
    if (state.sort) p.set("sort", state.sort);
    if (state.open) p.set("open", "1");
    if (state.specialty) p.set("specialty", state.specialty);
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p.toString() : ""));
  }

  function chip(text, on, onClick) {
    var b = h("button", { class: "vxChip" + (on ? " on" : ""), type: "button", text: text });
    b.addEventListener("click", onClick);
    return b;
  }
  function select(options, value, onChange) {
    var s = h("select", { class: "vxSelect" }, options.map(function (o) { return h("option", { value: o[0], text: o[1], selected: o[0] === value }); }));
    s.addEventListener("change", function () { onChange(s.value); });
    return s;
  }

  function renderFilters() {
    filters.textContent = "";
    tabArt.classList.toggle("on", state.tab === "art");
    tabArtists.classList.toggle("on", state.tab === "artists");
    if (state.tab === "art") {
      [["", "All"], ["drawing", "Drawing"], ["design", "Design"], ["3d-model", "3D models"]].forEach(function (c) {
        filters.appendChild(chip(c[1], state.category === c[0], function () { state.category = c[0]; run(); }));
      });
      filters.appendChild(chip("For sale", state.forSale, function () { state.forSale = !state.forSale; run(); }));
      var sortWrap = h("div", { class: "push" }, select([["", "Featured"], ["new", "Newest"], ["popular", "Most viewed"], ["price-low", "Price: low to high"], ["price-high", "Price: high to low"]], state.sort, function (v) { state.sort = v; run(); }));
      filters.appendChild(sortWrap);
    } else {
      filters.appendChild(chip("Open for commissions", state.open, function () { state.open = !state.open; run(); }));
      filters.appendChild(select([["", "All specialties"]].concat(SPECIALTIES.map(function (s) { return [s, Vx.label(s)]; })), state.specialty, function (v) { state.specialty = v; run(); }));
      filters.appendChild(h("div", { class: "push" }, select([["", "Top rated"], ["new", "Newest"]], state.sort === "new" ? "new" : "", function (v) { state.sort = v; run(); })));
    }
  }

  function emptyState() {
    var isArt = state.tab === "art";
    var cta = Vx.token
      ? (isArt ? h("button", { class: "vxBtn primary", type: "button", text: "Add your artwork", onclick: function () { Vx.openCreate("artwork"); } }) : null)
      : h("a", { class: "vxBtn primary", href: "signup.html", text: "Join as an artist" });
    return h("div", { class: "vxCard empty" }, h("div", { class: "ic" }, Vx.icon(isArt ? "image" : "brush")),
      h("h3", { text: isArt ? "No artwork found" : "No artists found" }),
      h("p", { text: state.q || state.category || state.open || state.specialty || state.forSale ? "Try removing a filter or searching for something else." : "Be the first to put your work here." }), cta);
  }

  function load(reset) {
    var mine = ++token;
    if (reset) { state.page = 1; results.textContent = ""; results.className = state.tab === "art" ? "artGrid" : "artistGrid"; results.appendChild(Vx.skeletons(8, "", state.tab === "art" ? 340 : 330)); }
    moreBtn.hidden = true;
    var url, qs = new URLSearchParams();
    qs.set("page", state.page); qs.set("limit", state.tab === "art" ? 16 : 12);
    if (state.q) qs.set("q", state.q);
    if (state.tab === "art") {
      if (state.category) qs.set("category", state.category);
      if (state.forSale) qs.set("forSale", "1");
      if (state.sort) qs.set("sort", state.sort);
      url = "/api/artworks?" + qs.toString();
    } else {
      if (state.open) qs.set("open", "1");
      if (state.specialty) qs.set("specialty", state.specialty);
      if (state.sort === "new") qs.set("sort", "new");
      url = "/api/artists?" + qs.toString();
    }
    Vx.api(url).then(function (data) {
      if (mine !== token) return;
      if (reset) results.textContent = "";
      if (!data.success) { results.className = ""; results.appendChild(h("div", { class: "vxCard empty" }, h("h3", { text: "Something went wrong" }), h("p", { text: data.message || "Try again in a moment." }))); return; }
      var list = state.tab === "art" ? data.artworks : data.artists;
      if (!list.length && state.page === 1) { results.className = ""; results.appendChild(emptyState()); return; }
      list.forEach(function (item) { results.appendChild(state.tab === "art" ? Vx.artCard(item) : Vx.artistCard(item)); });
      var more = state.tab === "art" ? (data.page * 16 < data.total) : data.hasMore;
      moreBtn.hidden = !more;
    });
  }

  function run() { syncUrl(); renderFilters(); load(true); }

  tabArt.addEventListener("click", function () { if (state.tab !== "art") { state.tab = "art"; state.sort = ""; run(); } });
  tabArtists.addEventListener("click", function () { if (state.tab !== "artists") { state.tab = "artists"; state.sort = ""; run(); } });
  document.getElementById("bigSearch").addEventListener("submit", function (e) { e.preventDefault(); state.q = qInput.value.trim(); run(); });
  moreBtn.addEventListener("click", function () { state.page += 1; load(false); });
  run();
})();
