(function () {

  "use strict";

  var DEFAULT_AVATAR = "assets/defaultavatar.png";
  var DEFAULT_BANNER = "assets/defaultbanner.png";

  // TEMPORARY: until real sessions/auth are wired in, the profile
  // being viewed/edited comes from ?username= in the URL, e.g.
  // profile.html?username=alex
  // Swap this for req.user / a session call once auth is ready.

  var USERNAME = new URLSearchParams(window.location.search).get("username");
  var CURRENT_USER = localStorage.getItem("username") || sessionStorage.getItem("username");
  var TOKEN = localStorage.getItem("token") || sessionStorage.getItem("token") || "";

  var els = {};
  var user = null; // last profile loaded from the server
  var currentUser = null;
  var authHeaders = {
    Authorization: TOKEN ? "Bearer " + TOKEN : "",
    "Content-Type": "application/json"
  };

  function qs(id) { return document.getElementById(id); }

  function cacheEls() {

    els.bannerImage = qs("bannerImage");
    els.avatar = qs("avatar");
    els.displayName = qs("displayName");
    els.username = qs("username");
    els.pronouns = qs("pronouns");
    els.status = qs("status");
    els.bio = qs("bio");
    els.themeBadge = qs("themeBadge");
    els.joinedAt = qs("joinedAt");
    els.backgroundLayer = qs("backgroundLayer");

    els.editProfile = qs("editProfile");
    els.messageProfile = qs("messageProfile");
    els.friendToggle = qs("friendToggle");
    els.blockProfile = qs("blockProfile");
    els.reportProfile = qs("reportProfile");
    els.quickEditBanner = qs("quickEditBanner");
    els.quickEditAvatar = qs("quickEditAvatar");

    els.editOverlay = qs("editOverlay");
    els.closeEdit = qs("closeEdit");
    els.cancelEdit = qs("cancelEdit");
    els.saveEdit = qs("saveEdit");

    els.bannerPreview = qs("bannerPreview");
    els.avatarPreview = qs("avatarPreview");
    els.backgroundPreview = qs("backgroundPreview");
    els.bannerFileInput = qs("bannerFileInput");
    els.avatarFileInput = qs("avatarFileInput");
    els.backgroundFileInput = qs("backgroundFileInput");

    els.inputDisplayName = qs("inputDisplayName");
    els.inputUsername = qs("inputUsername");
    els.inputPronouns = qs("inputPronouns");
    els.inputStatus = qs("inputStatus");
    els.inputStatusNote = qs("inputStatusNote");
    els.inputStatusNoteDuration = qs("inputStatusNoteDuration");
    els.inputTheme = qs("inputTheme");
    els.inputAura = qs("inputAura");
    els.themeGallery = qs("themeGallery");
    els.inputAppearance = qs("inputAppearance");
    els.appearanceChoices = qs("appearanceChoices");
    els.inputBio = qs("inputBio");

    els.toast = qs("toast");

  }

  function showToast(msg, isError) {

    els.toast.textContent = msg;
    els.toast.classList.toggle("error", !!isError);
    els.toast.classList.add("show");

    clearTimeout(showToast._t);

    showToast._t = setTimeout(function () {

      els.toast.classList.remove("show");

    }, 2400);

  }

  /* ---------------- Server calls ---------------- */

  function fetchProfile() {

    return fetch("/api/profile/" + encodeURIComponent(USERNAME))
      .then(function (res) { return res.json(); })
      .then(function (data) {

        if (!data.success) throw new Error(data.message || "Could not load profile");

        return data.user;

      });

  }

  function saveProfileFields(fields) {

    return fetch("/api/profile/update", {

      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify(fields)

    }).then(function (res) { return res.json(); });

  }

  function fetchCurrentUser() {
    if (!TOKEN) return Promise.resolve(null);
    return fetch("/api/auth/me", { headers: authHeaders })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        return data.success ? data.user : null;
      })
      .catch(function () {
        return null;
      });
  }

  function uploadMedia(file, type) {

    var formData = new FormData();

    // username/type must be appended before the file — Cloudinary's
    // storage engine reads req.body.type while it's still parsing
    // the multipart stream, so field order matters here.

    formData.append("type", type);
    formData.append("image", file);

    return fetch("/api/profile/upload", {

      method: "POST",
      headers: TOKEN ? { Authorization: "Bearer " + TOKEN } : {},
      body: formData

    }).then(function (res) { return res.json(); });

  }

  /* ---------------- Rendering ---------------- */

  function render() {

    els.bannerImage.src = user.banner || DEFAULT_BANNER;
    els.avatar.src = user.avatar || DEFAULT_AVATAR;
    els.avatar.parentElement.className = `aura-${String(user.aura || "Crimson").toLowerCase()}`;

    els.displayName.textContent = user.displayName || user.username;
    els.username.textContent = "@" + user.username;
    els.pronouns.textContent = user.pronouns || "";
    els.bio.textContent = user.bio || "";

    var statusClass = statusUtils.getStatusClass(user.status);

    els.status.className = statusClass;
    els.status.textContent = statusUtils.getStatusBadgeText(user.status, user.statusNote, user.statusNoteExpiresAt);

    els.themeBadge.textContent = user.theme || "";

    els.joinedAt.textContent = user.createdAt ?
      "Joined " + new Date(user.createdAt).toLocaleDateString() : "";

    els.backgroundLayer.className = "";

    if (user.theme) {
      var themeName = user.theme.trim().toLowerCase();
      var validThemes = [
        "crimson",
        "galaxy",
        "ocean",
        "forest",
        "sunset",
        "amoled",
        "glass",
        "midnight",
        "nebula",
        "aurora",
        "pixel",
        "synthwave",
        "matrix",
        "candy",
        "solar",
        "frost",
        "cyber",
        "sakura",
        "volcano",
        "monsoon",
        "ember",
        "prism", "neon arena", "phantom", "kawaii", "shonen", "mecha"
      ];
      if (validThemes.includes(themeName)) {
        els.backgroundLayer.classList.add("theme-" + themeName);
      } else {
        els.backgroundLayer.classList.add("theme-crimson");
      }
    }

    if (user.profileBackground) {

      els.backgroundLayer.style.backgroundImage = `url(${user.profileBackground})`;
      els.backgroundLayer.style.backgroundSize = "cover";
      els.backgroundLayer.style.backgroundPosition = "center";

    } else {

      els.backgroundLayer.style.backgroundImage = "";

    }

    var isOwner = user.username === CURRENT_USER;
    var isFriend = currentUser && Array.isArray(currentUser.friends) && currentUser.friends.includes(user.username);

    els.editProfile.textContent = "Edit Profile";
    els.editProfile.style.display = isOwner ? "inline-flex" : "none";
    els.messageProfile.style.display = isOwner ? "none" : "inline-flex";
    els.friendToggle.style.display = isOwner ? "none" : "inline-flex";
    els.blockProfile.style.display = isOwner ? "none" : "inline-flex";
    els.reportProfile.style.display = isOwner ? "none" : "inline-flex";
    els.quickEditBanner.style.display = isOwner ? "" : "none";
    els.quickEditAvatar.style.display = isOwner ? "" : "none";

    if (!isOwner) {
      els.friendToggle.textContent = isFriend ? "Remove Friend" : "Add Friend";
    }

  }

  /* ---------------- Edit panel ---------------- */

  function openEdit() {

    els.bannerPreview.src = user.banner || DEFAULT_BANNER;
    els.avatarPreview.src = user.avatar || DEFAULT_AVATAR;
    els.backgroundPreview.src = user.profileBackground || DEFAULT_BANNER;

    els.inputDisplayName.value = user.displayName || "";
    els.inputUsername.value = user.username || "";
    els.inputPronouns.value = user.pronouns || "";
    els.inputStatus.value = user.status || "Online";
    els.inputStatusNote.value = statusUtils.getStatusNoteText(user.statusNote, user.statusNoteExpiresAt);
    els.inputStatusNoteDuration.value = "24h";
    els.inputTheme.value = user.theme || "Crimson";
    els.inputAura.value = user.aura || "Crimson";
    renderThemeGallery();
    els.inputAppearance.value = localStorage.getItem("appearance") || "dark";
    els.appearanceChoices.querySelectorAll(".appearanceChoice").forEach(function (choice) {
      choice.classList.toggle("selected", choice.dataset.appearance === els.inputAppearance.value);
      choice.onclick = function () {
        els.inputAppearance.value = choice.dataset.appearance;
        els.appearanceChoices.querySelectorAll(".appearanceChoice").forEach(function (item) { item.classList.toggle("selected", item === choice); });
        setAppearance(choice.dataset.appearance);
      };
    });
    els.inputBio.value = user.bio || "";

    els.editOverlay.classList.add("open");

  }

  function renderThemeGallery() {
    var names = Array.from(els.inputTheme.options).map(function (option) { return option.value; });
    els.themeGallery.replaceChildren();
    names.forEach(function (name) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "themeChoice theme-" + name.toLowerCase();
      button.textContent = name;
      button.classList.toggle("selected", name === els.inputTheme.value);
      button.onclick = function () {
        els.inputTheme.value = name;
        els.themeGallery.querySelectorAll(".themeChoice").forEach(function (choice) { choice.classList.toggle("selected", choice.textContent === name); });
      };
      els.themeGallery.appendChild(button);
    });
    els.inputTheme.onchange = function () {
      var selected = els.inputTheme.value;
      els.themeGallery.querySelectorAll(".themeChoice").forEach(function (choice) { choice.classList.toggle("selected", choice.textContent === selected); });
    };
  }

  function closeEdit() {

    els.editOverlay.classList.remove("open");

  }

  function refreshAfterServerChange() {

    return fetchProfile().then(function (fresh) {

      user = fresh;
      render();

    });

  }

  function wireImagePicker(target) {

    var fileInput;
    var previewEl;
    var fallback;
    var field;

    if (target === "banner") {
      fileInput = els.bannerFileInput;
      previewEl = els.bannerPreview;
      fallback = DEFAULT_BANNER;
      field = "banner";
    } else if (target === "background") {
      fileInput = els.backgroundFileInput;
      previewEl = els.backgroundPreview;
      fallback = "";
      field = "background";
    } else {
      fileInput = els.avatarFileInput;
      previewEl = els.avatarPreview;
      fallback = DEFAULT_AVATAR;
      field = "avatar";
    }

    fileInput.addEventListener("change", function () {

      var file = fileInput.files && fileInput.files[0];

      fileInput.value = "";

      if (!file) return;

      previewEl.style.opacity = ".5";

      uploadMedia(file, field)

        .then(function (data) {

          if (!data.success) throw new Error(data.message || "Upload failed");

          previewEl.src = data.url;

          return refreshAfterServerChange();

        })

        .then(function () {

          var label = field === "banner" ? "Banner" : field === "background" ? "Background" : "Avatar";
          showToast(label + " updated");

        })

        .catch(function (err) {

          showToast(err.message || "Upload failed", true);

        })

        .finally(function () {

          previewEl.style.opacity = "1";

        });

    });

    return { fallback: fallback, field: field, previewEl: previewEl };

  }

  function wirePickerButtons() {

    var banner = wireImagePicker("banner");
    var background = wireImagePicker("background");
    var avatar = wireImagePicker("avatar");

    document.querySelectorAll(".pickerBtn.upload").forEach(function (btn) {

      btn.addEventListener("click", function () {

        var target = btn.getAttribute("data-target");

        if (target === "banner") {
          els.bannerFileInput.click();
        } else if (target === "background") {
          els.backgroundFileInput.click();
        } else {
          els.avatarFileInput.click();
        }

      });

    });

    document.querySelectorAll(".pickerBtn.remove").forEach(function (btn) {

      btn.addEventListener("click", function () {

        var target = btn.getAttribute("data-target");
        var picker = target === "banner" ? banner : target === "background" ? background : avatar;
        var fields = {};

        if (picker.field === "background") {
          fields.profileBackground = "";
        } else {
          fields[picker.field] = "";
        }

        saveProfileFields(fields)

          .then(function (data) {

            if (!data.success) throw new Error(data.message || "Could not remove image");

            picker.previewEl.src = picker.fallback;

            return refreshAfterServerChange();

          })

          .then(function () {

            showToast((target === "banner" ? "Banner" : "Avatar") + " removed");

          })

          .catch(function (err) {

            showToast(err.message || "Could not remove image", true);

          });

      });

    });

  }

  function wireEvents() {

    els.quickEditBanner.addEventListener("click", openEdit);
    els.quickEditAvatar.addEventListener("click", openEdit);

    els.closeEdit.addEventListener("click", closeEdit);
    els.cancelEdit.addEventListener("click", closeEdit);

    els.editProfile.addEventListener("click", function () {
      if (user && user.username === CURRENT_USER) {
        openEdit();
      }
    });

    els.messageProfile.addEventListener("click", async function () {
      if (!TOKEN) {
        alert("Please log in to message users.");
        return;
      }
      const response = await fetch("/api/chat/private", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ target: user.username })
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.message);
        return;
      }
      window.location.href = `chat.html?chatId=${encodeURIComponent(data.chatId)}`;
    });

    els.friendToggle.addEventListener("click", function () {
      if (!TOKEN) {
        alert("Please log in to manage friends.");
        return;
      }
      var action = els.friendToggle.textContent === "Remove Friend" ? "remove" : "add";
      fetch(`/api/friends/${action}`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ username: user.username })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          alert(data.message);
          return fetchCurrentUser();
        })
        .then(function (meData) {
          currentUser = meData;
          render();
        })
        .catch(function (err) {
          console.error(err);
          alert("Unable to update friend status.");
        });
    });

    els.blockProfile.addEventListener("click", function () {
      if (!TOKEN) {
        alert("Please log in to block users.");
        return;
      }
      fetch("/api/friends/block", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ username: user.username })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          alert(data.message);
          return fetchCurrentUser();
        })
        .then(function (meData) {
          currentUser = meData;
          render();
        })
        .catch(function (err) {
          console.error(err);
          alert("Unable to block user.");
        });
    });

    els.reportProfile.addEventListener("click", function () {
      if (!TOKEN) {
        alert("Please log in to report users.");
        return;
      }
      var reason = prompt("Why are you reporting this user?");
      fetch("/api/friends/report", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ username: user.username, reason: reason || "" })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          alert(data.message);
        })
        .catch(function (err) {
          console.error(err);
          alert("Unable to submit report.");
        });
    });

    els.editOverlay.addEventListener("click", function (e) {

      if (e.target === els.editOverlay) closeEdit();

    });

    document.addEventListener("keydown", function (e) {

      if (e.key === "Escape" && els.editOverlay.classList.contains("open")) closeEdit();

    });

    els.saveEdit.addEventListener("click", function () {

      els.saveEdit.disabled = true;
      setAppearance(els.inputAppearance.value);

      saveProfileFields({

        displayName: els.inputDisplayName.value.trim(),
        pronouns: els.inputPronouns.value.trim(),
        status: els.inputStatus.value,
        statusNote: els.inputStatusNote.value.trim(),
        statusNoteDuration: els.inputStatusNoteDuration.value,
        theme: els.inputTheme.value,
        aura: els.inputAura.value,
        bio: els.inputBio.value.trim()

      })

        .then(function (data) {

          if (!data.success) throw new Error(data.message || "Could not save changes");

          return refreshAfterServerChange();

        })

        .then(function () {

          closeEdit();

          showToast("Profile saved");

        })

        .catch(function (err) {

          showToast(err.message || "Could not save changes", true);

        })

        .finally(function () {

          els.saveEdit.disabled = false;

        });

    });

    wirePickerButtons();

  }

  function init() {

    cacheEls();

    if (!USERNAME) {

      els.displayName.textContent = "No user specified";
      els.username.textContent = "Add ?username=yourname to the URL";

      return;

    }

    wireEvents();

    fetchCurrentUser()
      .then(function (me) {
        currentUser = me;
        return fetchProfile();
      })
      .then(function (data) {
        user = data;
        render();
        if (new URLSearchParams(window.location.search).get("settings") === "1" && user.username === CURRENT_USER) openEdit();
      })

      .catch(function (err) {

        els.displayName.textContent = "Couldn't load profile";
        els.username.textContent = "";

        showToast(err.message || "Failed to load profile", true);

      });

  }

  document.addEventListener("DOMContentLoaded", init);

})();
