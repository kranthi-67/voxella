const form = document.getElementById("resetForm");

const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const error = document.getElementById("error");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    error.innerHTML = "";

    if (password.value !== confirmPassword.value) {

        error.innerHTML = "Passwords do not match.";

        return;

    }

    try {

        const response = await fetch("/api/auth/reset-password", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                email: localStorage.getItem("resetEmail"),
                resetToken: localStorage.getItem("resetToken"),
                password: password.value

            })

        });

        const data = await response.json();

        if (data.success) {

            alert("Password changed successfully!");

            localStorage.removeItem("resetEmail");
            localStorage.removeItem("resetToken");

            window.location.href = "login.html";

        } else {

            error.innerHTML = data.message;

        }

    } catch (err) {

        console.log(err);

        error.innerHTML = "Server Error";

    }

});
