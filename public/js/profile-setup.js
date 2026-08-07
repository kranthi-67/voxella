
const username = localStorage.getItem("username") || sessionStorage.getItem("username");
const token = localStorage.getItem("token") || sessionStorage.getItem("token");

if (!username || !token) {

    alert("Please login first.");

    window.location.href = "login.html";

}

const DEFAULT_AVATAR = "assets/defaultavatar.png";
const DEFAULT_BANNER = "assets/defaultbanner.png";

const backgroundInput = document.getElementById("backgroundInput");
const removeBackground = document.getElementById("removeBackground");

// ===============================
// Upload Function
// ===============================

async function uploadFile(file, type) {

    const formData = new FormData();

    // Cloudinary reads the upload type while parsing the multipart body.
    formData.append("type", type);
    formData.append("image", file);

    try {

        const response = await fetch("/api/profile/upload", {

            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData

        });

        return await response.json();

    }

    catch (err) {

        console.error(err);

        return {

            success: false,
            message: "Upload failed."

        };

    }

}

async function updateProfileData(data) {

    try {

        const response = await fetch("/api/profile/update", {

            method: "PUT",

            headers: {

                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`

            },

            body: JSON.stringify(data)

        });

        return await response.json();

    }

    catch (err) {

        console.error(err);

        return {

            success: false,
            message: "Could not save profile."

        };

    }

}

function setDefaultAvatar() {

    document.getElementById("avatarPreview").src = DEFAULT_AVATAR;

}

function setDefaultBanner() {

    document.getElementById("bannerPreview").src = DEFAULT_BANNER;

}

// ===============================
// Avatar Upload
// ===============================

document.getElementById("avatarInput").addEventListener("change", async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    const result = await uploadFile(file, "avatar");

    if (result.success) {

        document.getElementById("avatarPreview").src = result.url;

    }

    else {

        alert(result.message);

    }

});

// ===============================
// Banner Upload
// ===============================

document.getElementById("bannerInput").addEventListener("change", async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    const result = await uploadFile(file, "banner");

    if (result.success) {

        document.getElementById("bannerPreview").src = result.url;

    }

    else {

        alert(result.message);

    }

});

// ===============================
// Background Upload
// ===============================

backgroundInput.addEventListener("change", async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    const result = await uploadFile(file, "background");

    if (result.success) {

        document.getElementById("backgroundPreview").src = result.url;

    }

    else {

        alert(result.message);

    }

});

// ===============================
// Remove avatar / banner / background
// ===============================

document.getElementById("removeAvatar").addEventListener("click", async () => {

    const result = await updateProfileData({ avatar: "" });

    if (result.success) {

        setDefaultAvatar();
        alert("Profile picture removed.");

    }

    else {

        alert(result.message);

    }

});

document.getElementById("removeBanner").addEventListener("click", async () => {

    const result = await updateProfileData({ banner: "" });

    if (result.success) {

        setDefaultBanner();
        alert("Banner removed.");

    }

    else {

        alert(result.message);

    }

});

document.getElementById("removeBackground").addEventListener("click", async () => {

    const result = await updateProfileData({ profileBackground: "" });

    if (result.success) {

        document.getElementById("backgroundPreview").src = "";
        alert("Background removed.");

    }

    else {

        alert(result.message);

    }

});

// ===============================
// Save Profile
// ===============================

document.getElementById("saveProfile").addEventListener("click", async () => {

    const result = await updateProfileData({

        bio: document.getElementById("bio").value,

        pronouns: document.getElementById("pronouns").value,

        theme: document.getElementById("theme").value,

        status: document.getElementById("status").value,

        statusNote: document.getElementById("statusNote").value.trim(),

        statusNoteDuration: document.getElementById("statusNoteDuration").value

    });

    alert(result.message);

});

// ===============================
// Load Existing Profile
// ===============================

window.addEventListener("load", async () => {

    try {

        const response = await fetch(`/api/profile/${username}`);

        const data = await response.json();

        if (!data.success) return;

        const user = data.user;

        document.getElementById("bio").value = user.bio || "";

        document.getElementById("pronouns").value = user.pronouns || "";

        document.getElementById("theme").value = user.theme || "Crimson";

        document.getElementById("status").value = user.status || "Online";

        document.getElementById("statusNote").value = user.statusNote || "";

        document.getElementById("avatarPreview").src = user.avatar || DEFAULT_AVATAR;
        document.getElementById("bannerPreview").src = user.banner || DEFAULT_BANNER;

        if (user.profileBackground)
            document.getElementById("backgroundPreview").src = user.profileBackground;

    }

    catch (err) {

        console.log(err);

    }

});
