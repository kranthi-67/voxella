(function () {
  var mode = "dark";
  try { mode = localStorage.getItem("appearance") || "dark"; } catch (e) {}
  if (mode !== "white") mode = "dark";           // "white" = the soft cream mode
  document.documentElement.dataset.appearance = mode;
  window.setAppearance = function (value) {
    value = value === "white" ? "white" : "dark";
    try { localStorage.setItem("appearance", value); } catch (e) {}
    document.documentElement.dataset.appearance = value;
  };
})();
