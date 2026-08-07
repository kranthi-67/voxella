console.log("Login JS Loaded!");

const form = document.getElementById("loginForm");

const username = document.getElementById("username");
const password = document.getElementById("password");
const rememberMe = document.getElementById("rememberMe");

if (localStorage.getItem("token")) {
    window.location.href = "dashboard.html";
}

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    try {

        const response = await fetch("/api/auth/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                username: username.value.trim(),
                password: password.value

            })

        });

        const data = await response.json();

        if (data.success) {

            // A remembered session survives browser restarts; otherwise it ends
            // when this browser session closes.
            const storage = rememberMe.checked ? localStorage : sessionStorage;
            localStorage.removeItem("username");
            localStorage.removeItem("token");
            sessionStorage.removeItem("username");
            sessionStorage.removeItem("token");
            storage.setItem("username", data.user.username);
            storage.setItem("token", data.token);

            alert("✅ Login Successful!");

            window.location.href = "dashboard.html";

        } else {

            alert(data.message);

        }

    } catch (err) {

        console.error(err);

        alert("Server Error");

    }

});
