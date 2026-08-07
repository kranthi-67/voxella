console.log("Verify OTP Loaded!");

const form = document.getElementById("otpForm");
const otpInput = document.getElementById("otp");
const error = document.getElementById("error");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    error.innerHTML = "";
    error.style.display = "none";

    const email = localStorage.getItem("resetEmail");

    try {

        const response = await fetch("/api/auth/verify-otp", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                email,
                otp: otpInput.value.trim()

            })

        });

        const data = await response.json();

        if (data.success) {

            localStorage.setItem("resetToken", data.resetToken);

            window.location.href = "reset-password.html";

        } else {

            error.style.display = "block";
            error.innerHTML = data.message;

        }

    } catch (err) {

        console.error(err);

        error.style.display = "block";
        error.innerHTML = "Server Error";

    }

});
