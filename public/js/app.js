const splash = document.getElementById("splash");
const main = document.getElementById("mainContent");
const bar = document.getElementById("progressBar");
const text = document.getElementById("loadingText");

let progress = 0;

const messages = [
    "Initializing...",
    "Loading Secure Services...",
    "Preparing Communities...",
    "Connecting...",
    "Almost Ready..."
];

let i = 0;

const interval = setInterval(() => {
    progress += 2;
    bar.style.width = progress + "%";

    if (progress % 25 === 0 && i < messages.length) {
        text.innerHTML = messages[i];
        i++;
    }

    if (progress >= 100) {
        clearInterval(interval);
        splash.style.opacity = "0";

        setTimeout(() => {
            splash.style.display = "none";
            main.style.display = "flex";
            main.style.flexDirection = "column";
            main.style.justifyContent = "center";
            main.style.alignItems = "center";
        }, 800);
    }

}, 60);