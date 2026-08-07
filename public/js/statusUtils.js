(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.statusUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function normalizeStatus(status) { return (status || "Online").trim(); }

  function getStatusEmoji(status) {
    switch (normalizeStatus(status)) {
      case "Gaming": return "\uD83C\uDFAE";
      case "Chill": return "\uD83D\uDE0C";
      case "Idle": return "\uD83C\uDF19";
      case "DND": return "\u26D4";
      case "Invisible": return "\u26AA";
      default: return "\uD83D\uDFE2";
    }
  }

  function getStatusLabel(status) {
    switch (normalizeStatus(status)) {
      case "DND": return "Do Not Disturb";
      case "Gaming": return "Gaming";
      case "Chill": return "Chill";
      case "Invisible": return "Invisible";
      case "Idle": return "Idle";
      default: return "Online";
    }
  }

  function getStatusClass(status) {
    switch (normalizeStatus(status)) {
      case "Gaming": case "Online": return "online";
      case "Chill": case "Idle": return "idle";
      case "DND": return "dnd";
      default: return "offline";
    }
  }

  function isStatusNoteActive(note, expiresAt) {
    if (!note) return false;
    if (!expiresAt) return true;
    var expiryMs = new Date(expiresAt).getTime();
    return Number.isFinite(expiryMs) && expiryMs > Date.now();
  }

  function getStatusNoteText(note, expiresAt) {
    return isStatusNoteActive(note, expiresAt) ? note : "";
  }

  function getStatusBadgeText(status, note, expiresAt) {
    var base = getStatusEmoji(status) + " " + getStatusLabel(status);
    var activeNote = getStatusNoteText(note, expiresAt);
    return activeNote ? base + " \u2022 " + activeNote : base;
  }

  return { getStatusEmoji: getStatusEmoji, getStatusLabel: getStatusLabel, getStatusClass: getStatusClass, isStatusNoteActive: isStatusNoteActive, getStatusNoteText: getStatusNoteText, getStatusBadgeText: getStatusBadgeText };
});
