(function () {
  const mode = localStorage.getItem("appearance") || "dark";
  document.documentElement.dataset.appearance = mode;
  const style = document.createElement("style");
  style.textContent = `html[data-appearance="white"] body{background:#f5f7fb!important;color:#172033!important}html[data-appearance="white"] .dashboard,html[data-appearance="white"] .chatContainer,html[data-appearance="white"] .card:not(.profileCard){background:#fff!important;color:#172033!important;border-color:#dce3ed!important}html[data-appearance="white"] #profileCard{border-color:#dce3ed!important}html[data-appearance="white"] .topBar,html[data-appearance="white"] .inputArea,html[data-appearance="white"] #status{background:#eef2f7!important;color:#334155!important}html[data-appearance="white"] input,html[data-appearance="white"] textarea,html[data-appearance="white"] select{background:#fff!important;color:#172033!important;border-color:#cbd5e1!important}html[data-appearance="white"] .msgText{background:#e8edf5!important;color:#172033!important}`;
  document.head.appendChild(style);
  window.setAppearance = function (value) { localStorage.setItem("appearance", value); document.documentElement.dataset.appearance = value; };
})();
