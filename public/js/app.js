// Landing page: light/dark toggle
(function () {
  var btn = document.getElementById("themeToggle");
  if (!btn || !window.setAppearance) return;
  btn.addEventListener("click", function () {
    var now = document.documentElement.dataset.appearance === "white" ? "dark" : "white";
    window.setAppearance(now);
  });
})();
