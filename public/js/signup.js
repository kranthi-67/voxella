// ======================================
// VOXELLA Signup
// ======================================
console.log("Signup JS Loaded!");

const form = document.getElementById("signupForm");

const displayName = document.getElementById("displayName");
const email = document.getElementById("email");
const username = document.getElementById("username");

const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");

const preview = document.getElementById("usernamePreview");
const previewDisplayName = document.getElementById("previewDisplayName");

const error = document.getElementById("error");

// ======================================
// Username Preview
// ======================================

// ======================================
// Live Profile Preview
// ======================================

// Display Name Preview
displayName.addEventListener("input", () => {

    if (displayName.value.trim() === "") {

        previewDisplayName.textContent = "Display Name";

    } else {

        previewDisplayName.textContent = displayName.value;

    }

});

// Username Preview
username.addEventListener("input", () => {

    let value = username.value.trim();

    if (value === "") {

        preview.textContent = "@username";

    } else {

        preview.textContent = "@" + value;

    }

});

// ======================================
// Password Match Checker
// ======================================

confirmPassword.addEventListener("input", () => {

    if(confirmPassword.value === ""){

        error.style.display = "none";
        return;

    }

    if(password.value !== confirmPassword.value){

        error.style.display = "block";
        error.innerHTML = "⚠ Passwords do not match.";

        error.style.background = "#5b2020";

    }else{

        error.style.display = "block";
        error.innerHTML = "✅ Passwords match.";

        error.style.background = "#184d2b";

    }

});

// ======================================
// Signup
// ======================================

form.addEventListener("submit", async (e)=>{

    e.preventDefault();

    if(password.value !== confirmPassword.value){

        error.style.display = "block";

        error.innerHTML = "⚠ Passwords do not match.";

        error.style.background = "#5b2020";

        return;

    }

    

    try {

    const response = await fetch("/api/auth/signup", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

      body: JSON.stringify({

    displayName: displayName.value.trim(),

    email: email.value.trim(),

    username: username.value.trim(),

    password: password.value

})

    });

    const data = await response.json();

    if(data.success){

        alert("🎉 Account Created!");

        window.location.href = "login.html";

    }else{

        alert(data.message);

    }

}catch(err){

    console.error(err);

    alert("Server Error");

}

});
// ======================================
// Show / Hide Password
// ======================================

const togglePassword = document.getElementById("togglePassword");
const toggleConfirm = document.getElementById("toggleConfirm");

togglePassword.addEventListener("click", () => {

    if(password.type === "password"){

        password.type = "text";
        togglePassword.innerHTML = "🙈";

    }else{

        password.type = "password";
        togglePassword.innerHTML = "👁";

    }

});

toggleConfirm.addEventListener("click", () => {

    if(confirmPassword.type === "password"){

        confirmPassword.type = "text";
        toggleConfirm.innerHTML = "🙈";

    }else{

        confirmPassword.type = "password";
        toggleConfirm.innerHTML = "👁";

    }

});