const token = localStorage.getItem("token") || sessionStorage.getItem("token");
const backBtn = document.getElementById("backBtn");
const createGroupBtn = document.getElementById("createGroupBtn");
const chatList = document.getElementById("chatList");
const chatFilter = document.getElementById("chatFilter");
const DEFAULT_AVATAR = "assets/defaultavatar.png";
const DEFAULT_BANNER = "assets/defaultbanner.png";

if (!token) {
  alert("Please log in to view your chats.");
  window.location.href = "login.html";
}

const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

function addText(parent, tag, value, className) {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  parent.appendChild(element);
  return element;
}

function createFriendCard(friend, chat) {
  const card = document.createElement("article");
  card.className = "card profileCard chatCard";
  card.dataset.search = `${friend.displayName || ""} ${friend.username || ""} ${chat?.lastMessage?.text || ""}`.toLowerCase();
  if (chat?.unreadCount) card.classList.add("hasUnread");

  const banner = document.createElement("div");
  banner.className = "profileBanner";
  banner.style.backgroundImage = `url("${friend.banner || DEFAULT_BANNER}")`;
  card.appendChild(banner);

  const content = document.createElement("div");
  content.className = "profileContent";
  const avatar = document.createElement("img");
  avatar.src = friend.avatar || DEFAULT_AVATAR;
  avatar.className = "cardAvatar";
  avatar.alt = `${friend.displayName || friend.username}'s profile picture`;
  avatar.onerror = () => { avatar.src = DEFAULT_AVATAR; };
  content.appendChild(avatar);
  addText(content, "h2", friend.displayName || friend.username);
  addText(content, `p`, `@${friend.username}${chat?.unreadCount ? ` · ${chat.unreadCount} new` : ""}`, "usernameText");

  if (chat) {
    const lastSender = chat.lastMessage?.sender === localStorage.getItem("username") ? "You" : chat.lastMessage?.sender || "System";
    addText(content, "p", `${lastSender}: ${chat.lastMessage?.text || "No messages yet."}`, "chatPreview");
  } else {
    addText(content, "p", friend.bio || "No messages yet — say hello.", "chatPreview");
  }

  const actions = document.createElement("div");
  actions.className = "profileActions";
  const open = document.createElement("button");
  open.className = "primary";
  open.textContent = chat ? "Open Chat" : "Start Chat";
  open.onclick = async () => {
    if (chat) {
      window.location.href = `chat.html?chatId=${encodeURIComponent(chat._id)}`;
      return;
    }
    const response = await fetch("/api/chat/private", { method: "POST", headers: authHeaders, body: JSON.stringify({ target: friend.username }) });
    const result = await response.json();
    if (!result.success) return alert(result.message || "Unable to start chat.");
    window.location.href = `chat.html?chatId=${encodeURIComponent(result.chatId)}`;
  };
  const profile = document.createElement("button");
  profile.className = "secondary";
  profile.textContent = "Profile";
  profile.onclick = () => { window.location.href = `profile.html?username=${encodeURIComponent(friend.username)}`; };
  actions.append(open, profile);
  content.appendChild(actions);
  card.appendChild(content);
  return card;
}

function createGroupCard(chat) {
  const card = document.createElement("article"); card.className = "card chatCard";
  addText(card, "h2", chat.title || "Group chat");
  addText(card, "p", `${chat.participants.length} members · ${chat.lastMessage?.text || "No messages yet."}`, "chatPreview");
  const button = document.createElement("button"); button.className = "primary"; button.textContent = "Open Group"; button.onclick = () => { window.location.href = `chat.html?chatId=${encodeURIComponent(chat._id)}`; }; card.appendChild(button); return card;
}

async function loadChats() {
  try {
    const [chatResponse, friendsResponse] = await Promise.all([
      fetch("/api/chat/list", { headers: authHeaders }),
      fetch("/api/friends/list", { headers: authHeaders })
    ]);
    const chatData = await chatResponse.json();
    const friendsData = await friendsResponse.json();
    if (!chatData.success || !friendsData.success) throw new Error("Unable to load your chats.");

    const directChats = chatData.chats.filter((chat) => chat.type === "private");
    const groupChats = chatData.chats.filter((chat) => chat.type === "group");
    const chatsByFriend = new Map(directChats.map((chat) => [chat.friend.username, chat]));
    chatList.replaceChildren();
    if (new URLSearchParams(window.location.search).get("tab") === "groups") { groupChats.forEach((chat) => chatList.appendChild(createGroupCard(chat))); if (!groupChats.length) addText(chatList, "p", "No group chats yet.", "emptyState"); return; }
    if (!friendsData.friends.length) {
      addText(chatList, "p", "No friends yet. Find friends first to begin a direct message.", "emptyState");
      return;
    }

    friendsData.friends
      .sort((a, b) => (chatsByFriend.has(b.username) - chatsByFriend.has(a.username)) || a.displayName.localeCompare(b.displayName))
      .forEach((friend) => chatList.appendChild(createFriendCard(friend, chatsByFriend.get(friend.username))));
    groupChats.forEach((chat) => chatList.appendChild(createGroupCard(chat)));
  } catch (error) {
    chatList.replaceChildren();
    addText(chatList, "p", error.message || "Unable to load your chats.", "emptyState");
  }
}

backBtn.addEventListener("click", () => { window.location.href = "dashboard.html"; });
createGroupBtn.addEventListener("click", async () => {
  try {
    const data = await fetch("/api/friends/list", { headers: authHeaders }).then((response) => response.json());
    if (!data.success || !data.friends.length) return alert("Add a friend before creating a group.");
    const choices = data.friends.map((friend) => friend.username).join(", ");
    const title = prompt("Group name:", "New group");
    if (title === null) return;
    const selected = prompt(`Add friends by username, separated by commas:\n${choices}`, "");
    if (selected === null) return;
    const members = selected.split(",").map((name) => name.trim().toLowerCase()).filter(Boolean);
    const response = await fetch("/api/chat/group", { method: "POST", headers: authHeaders, body: JSON.stringify({ title, members }) });
    const result = await response.json();
    if (!result.success) return alert(result.message || "Unable to create group.");
    window.location.href = `chat.html?chatId=${encodeURIComponent(result.chatId)}`;
  } catch (error) { alert("Unable to create group."); }
});
chatFilter.addEventListener("input", () => {
  const query = chatFilter.value.trim().toLowerCase();
  chatList.querySelectorAll(".chatCard").forEach((card) => {
    card.hidden = !!query && !card.dataset.search.includes(query);
  });
});
loadChats();
