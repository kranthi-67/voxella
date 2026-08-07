console.log("Forgot Password Loaded!");

const form = document.getElementById("forgotForm");
const email = document.getElementById("email");
const error = document.getElementById("error");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    error.style.display = "none";

    try {

        const res = await fetch("/api/auth/forgot-password", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                email: email.value.trim()

            })

        });

        const data = await res.json();

        if (data.success) {

            alert("✅ OTP sent to your email!");

            localStorage.setItem("resetEmail", email.value.trim());

            window.location.href = "verify-otp.html";

        } else {

            error.style.display = "block";
            error.innerHTML = data.message;
            error.style.background = "#5b2020";

        }

    } catch (err) {

        console.error(err);

        error.style.display = "block";
        error.innerHTML = "Server Error";

    }

});