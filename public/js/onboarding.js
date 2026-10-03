(function () {
  "use strict";
  var Vx = window.Vx, h = Vx.h;
  Vx.initShell({ onboarding: true });
  // The onboarding page has no top bar; remove the injected header / tabs
  [".vxHeader", ".vxTabs"].forEach(function (sel) { var el = document.querySelector(sel); if (el) el.remove(); });

  var stage = document.getElementById("stage");
  var dots = document.getElementById("dots").children;
  var state = { role: "", picks: [] };

  function setDots(n) { Array.prototype.forEach.call(dots, function (d, i) { d.classList.toggle("on", i <= n); }); }
  function show(node, step) { stage.textContent = ""; stage.appendChild(node); setDots(step); window.scrollTo(0, 0); }

  Vx.loadMe().then(function (me) {
    if (me && me.onboarded) { window.location.replace("dashboard.html"); return; }
    stepRole(me);
  });

  // ---------- step 1: buyer or artist ----------
  function roleBox(kind, title, text, bullets) {
    var b = h("button", { class: "roleBox " + kind, type: "button" },
      h("div", { class: "art" }, h("i"), h("i"), h("i")),
      h("h2", { text: title }), h("p", { text: text }),
      h("ul", {}, bullets.map(function (t) { return h("li", { text: t }); })));
    b.addEventListener("click", function () { state.role = kind === "seller" ? "seller" : "buyer"; state.picks = []; stepTypes(); });
    return b;
  }
  function stepRole(me) {
    var first = me && me.displayName ? me.displayName.split(" ")[0] : "";
    show(h("div", { class: "obStep" },
      h("h1", { text: first ? "Welcome, " + first + "." : "Welcome to VOXELLA." }),
      h("p", { class: "lead", text: "How will you use VOXELLA? You can change this later in your profile." }),
      h("div", { class: "roleGrid" },
        roleBox("buyer", "I'm a buyer", "Discover artists and commission work you love.", ["A feed tuned to the art you like", "Message artists directly", "Rate artists after you receive your work"]),
        roleBox("seller", "I'm an artist", "Show your work and get commissioned.", ["A customizable profile and portfolio", "Earn XP, trophies and a verified badge", "Open commissions and get found"]))), 0);
  }

  // ---------- step 2: art types ----------
  function stepTypes() {
    var isSeller = state.role === "seller", max = isSeller ? 5 : 8;
    var count = h("span", { class: "obCount" });
    var next = h("button", { class: "vxBtn primary", type: "button", text: "Continue" });
    function refresh() {
      count.textContent = "";
      count.appendChild(h("b", { text: String(state.picks.length) })); count.appendChild(document.createTextNode(" of " + max + " selected"));
      next.disabled = state.picks.length === 0;
    }
    var panel = h("div", { class: "obPanel" });
    Vx.ART_TYPE_GROUPS.forEach(function (g) {
      panel.appendChild(h("div", { class: "groupTitle", text: g.title }));
      panel.appendChild(h("div", { class: "pickGrid" }, g.items.map(function (item) {
        var b = h("button", { class: "pick" + (state.picks.indexOf(item) > -1 ? " on" : ""), type: "button", text: Vx.label(item) });
        b.addEventListener("click", function () {
          var i = state.picks.indexOf(item);
          if (i > -1) state.picks.splice(i, 1);
          else if (state.picks.length >= max) { Vx.toast("You can pick up to " + max + ".", "bad"); return; }
          else state.picks.push(item);
          b.classList.toggle("on", state.picks.indexOf(item) > -1); refresh();
        });
        return b;
      })));
    });
    var back = h("button", { class: "vxBtn soft", type: "button", text: "Back", onclick: function () { stepRole(Vx.me); } });
    panel.appendChild(h("div", { class: "obBar" }, back, count, next));
    next.addEventListener("click", stepFinish);
    show(h("div", { class: "obStep" },
      h("h1", { text: isSeller ? "What do you create?" : "What art do you love?" }),
      h("p", { class: "lead", text: isSeller ? "Pick up to 5 art types. They appear on your profile so the right buyers can find you." : "Pick the styles you want to see more of. Your feed and recommendations will lean toward them." }),
      panel), 1);
    refresh();
  }

  // ---------- step 3: done ----------
  function stepFinish() {
    var go = h("button", { class: "vxBtn primary", type: "button", text: "Enter VOXELLA" });
    var error = h("div", { class: "err", hidden: true });
    var names = state.picks.slice(0, 3).map(function (p) { return Vx.label(p); });
    var preview = state.role === "seller" ? names.join(" · ") + " artist on VOXELLA." : "Looking for " + names.join(", ").toLowerCase() + " artists.";
    show(h("div", { class: "obStep obDone" },
      h("div", { class: "badge", text: state.role === "seller" ? "🎨" : "✨" }),
      h("h1", { text: "You're all set." }),
      h("p", { class: "lead", text: state.role === "seller" ? "Your artist profile is ready. Add your first artwork from the Create button." : "Your feed is ready. Follow artists, message them and commission work." }),
      h("div", { class: "bioBox" }, h("small", { text: "Your starting bio" }), preview),
      error, go), 2);
    go.addEventListener("click", function () {
      go.disabled = true; go.textContent = "Setting up…";
      Vx.api("/api/profile/onboarding", { method: "PUT", json: { userType: state.role, artTypes: state.picks } }).then(function (data) {
        if (!data.success) { go.disabled = false; go.textContent = "Enter VOXELLA"; error.textContent = data.message || "Could not finish setup."; error.hidden = false; return; }
        window.location.href = "dashboard.html";
      });
    });
  }
})();
