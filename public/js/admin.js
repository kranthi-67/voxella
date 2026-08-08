const token = localStorage.getItem("token") || sessionStorage.getItem("token");
const list = document.getElementById("adminList");
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
function text(el, value) { const p = document.createElement("p"); p.textContent = value; el.appendChild(p); }
async function load() {
  const data = await fetch("/api/admin/overview", { headers }).then((r) => r.json());
  if (!data.success) { list.textContent = data.message || "Administrator access required."; return; }
  list.replaceChildren();
  data.users.forEach((user) => {
    const card = document.createElement("article"); card.className = "card";
    const heading = document.createElement("h2"); heading.textContent = user.displayName || user.username; card.appendChild(heading);
    text(card, `@${user.username} · ${user.email}`); text(card, `Reports: ${user.reportCount}${user.banReason ? ` · Reason: ${user.banReason}` : ""}`);
    if (user.reports.length) text(card, user.reports.map((r) => `${r.reportedBy}: ${r.reason || "No reason"}`).join(" | "));
    const button = document.createElement("button"); button.className = user.isBanned ? "secondary" : "primary"; button.textContent = user.isBanned ? "Unban account" : "Ban account";
    button.onclick = async () => { const reason = user.isBanned ? "" : prompt("Ban reason (optional):", ""); if (reason === null) return; const result = await fetch("/api/admin/ban", { method: "POST", headers, body: JSON.stringify({ email: user.email, banned: !user.isBanned, reason }) }).then(r => r.json()); alert(result.message); if (result.success) load(); };
    card.appendChild(button); list.appendChild(card);
  });
}
load();
