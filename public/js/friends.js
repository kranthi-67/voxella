const token = localStorage.getItem("token") || sessionStorage.getItem("token");

if (!token) {
  alert("Please log in to search friends.");
  window.location.href = "login.html";
}

const searchBtn = document.getElementById("searchBtn");
const backBtn = document.getElementById("backBtn");
const blockedBtn = document.getElementById("blockedBtn");
const friendSearch = document.getElementById("friendSearch");
const resultsGrid = document.getElementById("resultsGrid");
let isBlockedView = false;

const authHeaders = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json"
};

function createCard(user, blocked) {
  const card = document.createElement("div");
  card.className = "card profileCard";
  const banner = document.createElement("div");
  banner.className = "profileBanner";
  banner.style.backgroundImage = `url("${user.banner || "assets/defaultbanner.png"}")`;
  card.appendChild(banner);
  const content = document.createElement("div");
  content.className = "profileContent";
  const avatar = document.createElement("img");
  avatar.src = user.avatar || "assets/defaultavatar.png";
  avatar.className = "cardAvatar";
  avatar.alt = `${user.displayName || user.username}'s profile picture`;
  avatar.onerror = () => { avatar.src = "assets/defaultavatar.png"; };
  const name = document.createElement("h2");
  name.textContent = user.displayName || user.username;
  const username = document.createElement("p");
  username.textContent = `@${user.username}`;
  const bio = document.createElement("p");
  bio.textContent = user.bio || "No bio yet.";
  const actions = document.createElement("div");
  actions.className = "profileActions";
  const profile = document.createElement("button");
  profile.className = "primary viewProfile";
  profile.textContent = "View Profile";
  actions.appendChild(profile);
  if (blocked) {
    const unblock = document.createElement("button");
    unblock.className = "secondary unblockUser";
    unblock.textContent = "Unblock";
    actions.appendChild(unblock);
  } else {
    const addFriend = document.createElement("button");
    addFriend.className = "secondary addFriend";
    addFriend.textContent = "Add Friend";
    actions.appendChild(addFriend);
  }
  content.append(avatar, name, username, bio, actions);
  card.appendChild(content);
  return card;
}

async function search() {
  const query = friendSearch.value.trim();
  resultsGrid.innerHTML = "";
  if (!query) return;

  const response = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`, {
    headers: authHeaders
  });
  const data = await response.json();
  if (!data.success) return;

  if (!data.users.length) {
    resultsGrid.innerHTML = "<div class='card'><p>No users found.</p></div>";
    return;
  }

  data.users.forEach((user) => {
    const card = createCard(user, false);
    card.querySelector(".viewProfile").onclick = () => {
      window.location.href = `profile.html?username=${encodeURIComponent(user.username)}`;
    };
    card.querySelector(".addFriend").onclick = async () => {
      const res = await fetch("/api/friends/add", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ username: user.username })
      });
      const result = await res.json();
      alert(result.message);
    };
    resultsGrid.appendChild(card);
  });
}

async function loadBlockedUsers() {
  resultsGrid.innerHTML = "";
  const response = await fetch("/api/friends/blocked", {
    headers: authHeaders
  });
  const data = await response.json();
  if (!data.success) return;

  if (!data.blocked.length) {
    resultsGrid.innerHTML = "<div class='card'><p>No blocked users.</p></div>";
    return;
  }

  data.blocked.forEach((user) => {
    const card = createCard(user, true);
    card.querySelector(".viewProfile").onclick = () => {
      window.location.href = `profile.html?username=${encodeURIComponent(user.username)}`;
    };
    card.querySelector(".unblockUser").onclick = async () => {
      const res = await fetch("/api/friends/unblock", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ username: user.username })
      });
      const result = await res.json();
      alert(result.message);
      if (result.success) {
        loadBlockedUsers();
      }
    };
    resultsGrid.appendChild(card);
  });
}

searchBtn.addEventListener("click", () => {
  if (isBlockedView) {
    loadBlockedUsers();
  } else {
    search();
  }
});
friendSearch.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    if (isBlockedView) {
      loadBlockedUsers();
    } else {
      search();
    }
  }
});
blockedBtn.addEventListener("click", () => {
  isBlockedView = !isBlockedView;
  blockedBtn.textContent = isBlockedView ? "Search users" : "See blocked users";
  if (isBlockedView) {
    friendSearch.placeholder = "Type to refresh blocked users";
    loadBlockedUsers();
  } else {
    friendSearch.placeholder = "Search by username or display name";
    resultsGrid.innerHTML = "";
  }
});
backBtn.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});
