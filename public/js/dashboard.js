// ======================================
// VOXELLA Dashboard
// ======================================

console.log("Dashboard Loaded!");

// ======================================
// Elements
// ======================================

const randomChat = document.getElementById("randomChat");
const groupChat = document.getElementById("groupChat");
const friendsCard = document.getElementById("friendsCard");
const myChatsCard = document.getElementById("myChats");
const groupChatsCard = document.getElementById("groupChats");
const aboutCard = document.getElementById("aboutCard");
const logoutCard = document.querySelector(".logout");

const userAvatar = document.getElementById("userAvatar");
const displayName = document.getElementById("displayName");
const usernameText = document.getElementById("username");
const statusBadge = document.getElementById("statusBadge");

const cardAvatar = document.getElementById("cardAvatar");
const cardDisplayName = document.getElementById("cardDisplayName");
const cardUsername = document.getElementById("cardUsername");
const cardBio = document.getElementById("cardBio");
const profileBanner = document.getElementById("profileBanner");
const profileCard = document.getElementById("profileCard");
const editProfile = document.getElementById("editProfile");
const profileLink = document.getElementById("profileLink");
const DEFAULT_AVATAR = "assets/defaultavatar.png";

// ======================================
// Load Profile
// ======================================

async function loadProfile() {

    const username = localStorage.getItem("username") || sessionStorage.getItem("username");

    if (!username) {

        window.location.href = "login.html";
        return;

    }

    try {

        const response = await fetch(`/api/profile/${username}`);
        const data = await response.json();

        if (!data.success) return;

        const user = data.user;

        displayName.textContent = user.displayName;
        usernameText.textContent = "@" + user.username;

        cardDisplayName.textContent = user.displayName;
        cardUsername.textContent = "@" + user.username;

        cardBio.textContent =
            user.bio || "No bio yet.";

        statusBadge.textContent =

            statusUtils.getStatusBadgeText(
                user.status,
                user.statusNote,
                user.statusNoteExpiresAt
            );

        /* Legacy fallback for old browser bundles:
            "🟢 " + user.status;

        */
        const avatarUrl = user.avatar || DEFAULT_AVATAR;
        userAvatar.src = avatarUrl;
        cardAvatar.src = avatarUrl;
        [userAvatar, cardAvatar].forEach((image) => {
            image.onerror = () => { image.onerror = null; image.src = DEFAULT_AVATAR; };
        });

        if (user.banner) {

            profileBanner.style.backgroundImage =
                `url(${user.banner})`;

            profileBanner.style.backgroundSize = "cover";
            profileBanner.style.backgroundPosition = "center";

        }

        // ==========================
        // Apply Theme
        // ==========================

        profileCard.className = "card profileCard";

        switch (String(user.theme || "Crimson").toLowerCase()) {

            case "galaxy":
                profileCard.classList.add("theme-galaxy");
                break;

            case "ocean":
                profileCard.classList.add("theme-ocean");
                break;

            case "forest":
                profileCard.classList.add("theme-forest");
                break;

            case "sunset":
                profileCard.classList.add("theme-sunset");
                break;

            case "amoled":
                profileCard.classList.add("theme-amoled");
                break;

            case "glass":
                profileCard.classList.add("theme-glass");
                break;

            case "midnight":
                profileCard.classList.add("theme-midnight");
                break;

            case "nebula":
                profileCard.classList.add("theme-nebula");
                break;

            case "aurora":
                profileCard.classList.add("theme-aurora");
                break;

            case "pixel":
                profileCard.classList.add("theme-pixel");
                break;

            case "synthwave":
                profileCard.classList.add("theme-synthwave");
                break;

            case "matrix":
                profileCard.classList.add("theme-matrix");
                break;

            case "candy":
                profileCard.classList.add("theme-candy");
                break;

            case "solar": case "frost": case "cyber": case "sakura": case "volcano": case "monsoon": case "ember": case "prism":
                profileCard.classList.add("theme-" + user.theme.toLowerCase());
                break;

            default:
                profileCard.classList.add("theme-crimson");

        }

    } catch (err) {

        console.log(err);

    }

}

loadProfile();

// ======================================
// Buttons
// ======================================

editProfile.addEventListener("click", () => {
    const currentUsername = localStorage.getItem("username") || sessionStorage.getItem("username");
    window.location.href = `profile.html?username=${encodeURIComponent(currentUsername || "")}`;
});

profileCard.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    const currentUsername = localStorage.getItem("username") || sessionStorage.getItem("username");
    window.location.href = `profile.html?username=${encodeURIComponent(currentUsername || "")}`;
});

profileLink.addEventListener("click", (event) => {
    event.preventDefault();
    const currentUsername = localStorage.getItem("username") || sessionStorage.getItem("username");
    window.location.href = `profile.html?username=${encodeURIComponent(currentUsername || "")}`;
});


randomChat.addEventListener("click", () => {
    window.location.href = "chat.html";
});

groupChat.addEventListener("click", () => {
    window.location.href = "group-search.html";
});

friendsCard.addEventListener("click", () => {
    window.location.href = "friends.html";
});

myChatsCard.addEventListener("click", () => {
    window.location.href = "my-chats.html";
});
groupChatsCard.addEventListener("click", () => { window.location.href = "my-chats.html?tab=groups"; });
aboutCard.addEventListener("click", () => { aboutModal.style.display = "flex"; });

// ======================================
// Logout
// ======================================

// ======================================
// Logout
// ======================================

logoutCard.addEventListener("click", () => {

    if (confirm("Logout from VOXELLA?")) {

        localStorage.removeItem("username");
        localStorage.removeItem("token");
        sessionStorage.removeItem("username");
        sessionStorage.removeItem("token");
        window.location.href = "login.html";

    }

});
// ===============================
// About Modal
// ===============================

const aboutBtn = document.getElementById("aboutBtn");

const aboutModal = document.getElementById("aboutModal");

const closeAbout = document.getElementById("closeAbout");

if (aboutBtn) aboutBtn.onclick = () => {

    aboutModal.style.display = "flex";

};

async function refreshNotifications() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) return;
    try {
        const data = await fetch("/api/chat/list", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
        const unread = data.success && data.chats.some((chat) => chat.unreadCount > 0);
        document.getElementById("notificationDot").hidden = !unread;
        document.getElementById("shortcutDot").hidden = !unread;
    } catch (_) {}
}
refreshNotifications();
setInterval(refreshNotifications, 15000);

closeAbout.onclick = () => {

    aboutModal.style.display = "none";

};

window.onclick = (e) => {

    if(e.target === aboutModal){

        aboutModal.style.display = "none";

    }

};
