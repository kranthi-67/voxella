// ==========================================================
// Create flows: new post, new artwork, "become an artist"
// ==========================================================
(function () {
  "use strict";
  var Vx = window.Vx, h = Vx.h;
  var MAX_IMAGE = 10 * 1024 * 1024, MAX_VIDEO = 40 * 1024 * 1024;
  var CATEGORIES = [["drawing", "Drawing / illustration"], ["design", "Design"], ["3d-model", "3D model"]];

  // A file picker with drag & drop and previews. Returns { el, files() , clear() }
  function filePicker(opts) {
    var list = [];
    var input = h("input", { type: "file", accept: opts.accept, multiple: true, hidden: true });
    var previews = h("div", { class: "previews" });
    var drop = h("div", { class: "drop", tabindex: "0", role: "button" },
      Vx.icon("upload"), h("strong", { text: opts.title }), h("span", { class: "vxMuted", text: opts.hint }));
    var root = h("div", {}, drop, input, previews);
    var onChange = opts.onChange || function () {};

    function render() {
      previews.textContent = "";
      list.forEach(function (file, i) {
        var url = URL.createObjectURL(file);
        var media = file.type.indexOf("video/") === 0
          ? h("video", { src: url, muted: true, playsinline: true, preload: "metadata" })
          : h("img", { src: url, alt: "" });
        previews.appendChild(h("div", { class: "pv" }, media,
          h("button", { type: "button", "aria-label": "Remove", onclick: function () { list.splice(i, 1); render(); onChange(list); } }, Vx.icon("x"))));
      });
      drop.style.display = list.length >= opts.max ? "none" : "";
    }
    function add(files) {
      Array.prototype.forEach.call(files, function (file) {
        var isVideo = file.type.indexOf("video/") === 0, isImage = file.type.indexOf("image/") === 0;
        if (!(isImage || (isVideo && opts.video))) { Vx.toast("Unsupported file: " + file.name, "bad"); return; }
        if (isVideo && file.size > MAX_VIDEO) { Vx.toast("Videos can be up to 40 MB.", "bad"); return; }
        if (isImage && file.size > MAX_IMAGE) { Vx.toast("Photos can be up to 10 MB.", "bad"); return; }
        if (list.length >= opts.max) { Vx.toast("You can add up to " + opts.max + " files.", "bad"); return; }
        if (opts.video && ((isVideo && list.length > 0) || (list.some(function (f) { return f.type.indexOf("video/") === 0; })))) {
          Vx.toast("A post can have up to 6 photos or one video, not both.", "bad"); return;
        }
        list.push(file);
      });
      render(); onChange(list);
    }
    drop.addEventListener("click", function () { input.click(); });
    drop.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    input.addEventListener("change", function () { add(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
    drop.addEventListener("drop", function (e) { add(e.dataTransfer.files); });
    return { el: root, files: function () { return list.slice(); } };
  }

  function field(label, control, hint) {
    return h("div", { class: "field" }, h("label", { text: label }), control, hint ? h("div", { class: "hint", text: hint }) : null);
  }

  // ---------------- New post ----------------
  function composePost(me) {
    if (!Vx.requireLogin("Log in to share your work.")) return;
    var caption = h("textarea", { class: "vxTextarea", maxlength: "1000", placeholder: "Tell people about this piece, your process, or that you're open for commissions…" });
    var picker = filePicker({ accept: "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime", max: 6, video: true, title: "Add photos or a video", hint: "Up to 6 photos (10 MB each) or 1 video (40 MB)" });
    var tagSelect = h("select", {}, h("option", { value: "", text: "No artwork tagged" }));
    var tagField = field("Tag one of your artworks (optional)", tagSelect);
    tagField.hidden = true;
    var error = h("div", { class: "err", hidden: true });
    var barFill = h("i"); var bar = h("div", { class: "bar", hidden: true }, barFill);
    var submit = h("button", { class: "vxBtn primary", type: "button", text: "Post" });
    var cancel = h("button", { class: "vxBtn soft", type: "button", text: "Cancel" });
    var body = h("div", {}, error, field("Caption", caption), picker.el, tagField, bar);
    var m = Vx.modal({ title: "New post", body: body, footer: [cancel, submit] });
    cancel.addEventListener("click", m.close);

    if (me && me.userType === "seller") {
      Vx.api("/api/artworks?seller=" + encodeURIComponent(me.username) + "&limit=24").then(function (data) {
        if (!data.success || !data.artworks.length) return;
        data.artworks.forEach(function (a) { tagSelect.appendChild(h("option", { value: a._id, text: a.title })); });
        tagField.hidden = false;
      });
    }

    submit.addEventListener("click", function () {
      error.hidden = true;
      var files = picker.files();
      if (!files.length) { error.textContent = "Add at least one photo or video."; error.hidden = false; return; }
      var fd = new FormData();
      fd.append("caption", caption.value.trim());
      if (tagSelect.value) fd.append("artworkId", tagSelect.value);
      files.forEach(function (f) { fd.append("media", f); });
      submit.disabled = true; submit.textContent = "Posting…"; bar.hidden = false;
      Vx.upload("/api/posts", fd, function (p) { barFill.style.width = Math.round(p * 100) + "%"; }).then(function (data) {
        if (!data.success) {
          submit.disabled = false; submit.textContent = "Post"; bar.hidden = true;
          error.textContent = data.message || "Could not publish your post."; error.hidden = false; return;
        }
        m.close(); Vx.toast("Posted!");
        if (window.VxOnPosted) window.VxOnPosted(); else setTimeout(function () { window.location.href = "dashboard.html"; }, 600);
      });
    });
  }

  // ---------------- New artwork ----------------
  function composeArtwork(me) {
    if (!Vx.requireLogin("Log in to add artwork.")) return;
    var title = h("input", { class: "vxInput", maxlength: "80", placeholder: "e.g. Ember Fox, character concept" });
    var category = h("select", {}, CATEGORIES.map(function (c) { return h("option", { value: c[0], text: c[1] }); }));
    var desc = h("textarea", { class: "vxTextarea", maxlength: "1000", placeholder: "What is it, what tools did you use, what can buyers do with it?" });
    var tags = h("input", { class: "vxInput", placeholder: "fantasy, fox, character (comma separated, up to 10)" });
    var forSale = h("input", { type: "checkbox" });
    var price = h("input", { class: "vxInput", type: "number", min: "0", max: "100000", step: "0.01", placeholder: "Price in USD" });
    var priceField = field("Price (USD)", price, "Payments are coming soon. Buyers will message you to arrange the sale.");
    priceField.hidden = true;
    forSale.addEventListener("change", function () { priceField.hidden = !forSale.checked; });
    var picker = filePicker({ accept: "image/jpeg,image/png,image/gif,image/webp", max: 8, title: "Add images of your work", hint: "Up to 8 images, 10 MB each. The first one is the cover." });
    var error = h("div", { class: "err", hidden: true });
    var barFill = h("i"); var bar = h("div", { class: "bar", hidden: true }, barFill);
    var submit = h("button", { class: "vxBtn primary", type: "button", text: "Publish artwork" });
    var cancel = h("button", { class: "vxBtn soft", type: "button", text: "Cancel" });
    var body = h("div", {}, error,
      field("Images", picker.el),
      field("Title", title),
      h("div", { class: "row2" }, field("Category", category), field("Tags", tags)),
      field("Description", desc),
      h("label", { class: "switchRow" }, forSale, h("span", {}, h("strong", { text: "This piece is for sale" }), h("div", { class: "vxMuted", text: "Leave off to show it as portfolio only." }))),
      h("div", { style: "height:14px" }), priceField, bar);
    var m = Vx.modal({ title: "New artwork", body: body, footer: [cancel, submit], wide: true });
    cancel.addEventListener("click", m.close);

    submit.addEventListener("click", function () {
      error.hidden = true;
      var files = picker.files();
      var problem = !files.length ? "Add at least one image." : !title.value.trim() ? "Give your artwork a title." :
        (forSale.checked && !(Number(price.value) >= 0 && price.value !== "")) ? "Enter a price." : "";
      if (problem) { error.textContent = problem; error.hidden = false; return; }
      var fd = new FormData();
      fd.append("title", title.value.trim());
      fd.append("category", category.value);
      fd.append("description", desc.value.trim());
      fd.append("tags", tags.value);
      fd.append("forSale", forSale.checked ? "true" : "false");
      if (forSale.checked) fd.append("price", price.value);
      files.forEach(function (f) { fd.append("images", f); });
      submit.disabled = true; submit.textContent = "Publishing…"; bar.hidden = false;
      Vx.upload("/api/artworks", fd, function (p) { barFill.style.width = Math.round(p * 100) + "%"; }).then(function (data) {
        if (!data.success) {
          submit.disabled = false; submit.textContent = "Publish artwork"; bar.hidden = true;
          error.textContent = data.message || "Could not publish your artwork."; error.hidden = false; return;
        }
        m.close(); Vx.toast("Artwork published!");
        setTimeout(function () { window.location.href = "artwork.html?id=" + encodeURIComponent(data.artwork._id); }, 500);
      });
    });
  }

  // ---------------- Become an artist ----------------
  function becomeArtist(me) {
    if (!Vx.requireLogin("Log in first.")) return;
    var go = h("button", { class: "vxBtn primary", type: "button", text: "Switch to artist account" });
    var cancel = h("button", { class: "vxBtn soft", type: "button", text: "Not now" });
    var body = h("div", {},
      h("p", { class: "vxMuted", text: "Artist accounts can publish artwork, open commissions and collect ratings. You can still browse, message and post as before." }),
      h("p", { class: "vxMuted", text: "You can switch back any time from your profile." }));
    var m = Vx.modal({ title: "Become an artist", body: body, footer: [cancel, go] });
    cancel.addEventListener("click", m.close);
    go.addEventListener("click", function () {
      go.disabled = true;
      Vx.api("/api/profile/update", { method: "PUT", json: { userType: "seller" } }).then(function (data) {
        if (!data.success) { go.disabled = false; Vx.toast(data.message || "Could not switch accounts.", "bad"); return; }
        if (Vx.me) Vx.me.userType = "seller";
        m.close(); Vx.toast("You're now an artist!");
        setTimeout(function () { composeArtwork(Vx.me || me); }, 400);
      });
    });
  }

  window.VxCompose = { post: composePost, artwork: composeArtwork, becomeArtist: becomeArtist };
})();
