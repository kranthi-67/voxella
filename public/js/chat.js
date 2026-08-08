const token = localStorage.getItem("token") || sessionStorage.getItem("token");
const socket = io({ auth: { token } });
const status = document.getElementById("status");
const messages = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const attachImageBtn = document.getElementById("attachImageBtn");
const gifBtn = document.getElementById("gifBtn");
const attachVideoBtn = document.getElementById("attachVideoBtn");
const recordAudioBtn = document.getElementById("recordAudioBtn");
const startCallBtn = document.getElementById("startCallBtn");
const imageInput = document.getElementById("imageInput");
const videoInput = document.getElementById("videoInput");
const remoteAudio = document.getElementById("remoteAudio");
const skipBtn = document.getElementById("skipBtn");
const leaveBtn = document.getElementById("leaveBtn");
const messageCount = document.getElementById("messageCount");
const chatSearch = document.getElementById("chatSearch");
const typingStatus = document.getElementById("typingStatus");
const mediaViewer = document.getElementById("mediaViewer");
const viewerImage = document.getElementById("viewerImage");
const closeMediaViewer = document.getElementById("closeMediaViewer");
const gifPicker = document.getElementById("gifPicker");
const closeGifPicker = document.getElementById("closeGifPicker");
const gifSearchForm = document.getElementById("gifSearchForm");
const gifSearchInput = document.getElementById("gifSearchInput");
const gifResults = document.getElementById("gifResults");
const gifStatus = document.getElementById("gifStatus");
const title = document.querySelector(".topBar h2");
const params = new URLSearchParams(window.location.search);
const currentUser = localStorage.getItem("username") || sessionStorage.getItem("username");
const chatId = params.get("chatId");

if (!token || !currentUser) {
  alert("Please log in first.");
  window.location.href = "login.html";
}

let activeChatId = chatId;
let roomName = chatId;
let chatType = null;
let mediaRecorder = null;
let recordingStream = null;
let recording = false;
let localStream = null;
let peerConnection = null;
let callActive = false;
let pendingCandidates = [];
let typingTimer = null;
let typingSent = false;
const avatars = new Map();
const renderedMessages = new Set();
const DEFAULT_AVATAR = "assets/defaultavatar.png";

title.textContent = chatId ? "Chat Room" : "🎲 Random Chat";
status.textContent = chatId ? "Loading conversation..." : "Searching for someone...";
skipBtn.style.display = chatId ? "none" : "inline-flex";

const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

function normaliseUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^\/+https?:\/\//i.test(value)) return value.replace(/^\/+/, "");
  if (/^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("/")) return value;
  return `/${value.replace(/\\/g, "/")}`;
}

function messageKey(message) {
  return message.messageId || `${message.sender}|${message.type}|${message.mediaUrl || ""}|${message.text || ""}|${message.createdAt || ""}`;
}

async function fetchChat(id) {
  const response = await fetch(`/api/chat/${encodeURIComponent(id)}`, { headers: authHeaders });
  return response.json();
}

async function ensureAvatar(username) {
  if (!username || username === "system" || avatars.has(username)) return;
  try {
    const response = await fetch(`/api/profile/${encodeURIComponent(username)}`);
    const data = await response.json();
    avatars.set(username, normaliseUrl(data?.success ? data.user?.avatar : "") || DEFAULT_AVATAR);
  } catch {
    avatars.set(username, DEFAULT_AVATAR);
  }
}

async function loadParticipantAvatars(participants) {
  await Promise.all((participants || []).map(ensureAvatar));
}

function renderChatControls() {
  const isPrivate = chatType === "private" || chatType === "group";
  attachImageBtn.style.display = isPrivate ? "inline-flex" : "none";
  gifBtn.style.display = isPrivate ? "inline-flex" : "none";
  attachVideoBtn.style.display = isPrivate ? "inline-flex" : "none";
  recordAudioBtn.style.display = isPrivate ? "inline-flex" : "none";
  startCallBtn.style.display = isPrivate ? "inline-flex" : "none";
}

function setMediaBusy(isBusy) {
  attachImageBtn.disabled = isBusy;
  attachVideoBtn.disabled = isBusy;
  recordAudioBtn.disabled = isBusy;
}

function updateMessageCount() {
  messageCount.textContent = `${input.value.length} / 1000`;
}

function filterMessages() {
  const query = chatSearch.value.trim().toLowerCase();
  messages.querySelectorAll(".messageRow").forEach((row) => {
    row.hidden = !!query && !row.textContent.toLowerCase().includes(query);
  });
}

function updateReactionView(messageId, reactions) {
  const row = messages.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
  const tray = row?.querySelector(".reactionTray");
  if (!tray) return;
  tray.replaceChildren();
  (reactions || []).forEach((reaction) => {
    const button = document.createElement("button"); button.className = `reactionPill${reaction.users.includes(currentUser) ? " selected" : ""}`;
    button.textContent = `${reaction.emoji} ${reaction.users.length}`;
    button.onclick = () => toggleReaction(messageId, reaction.emoji);
    tray.appendChild(button);
  });
}

async function toggleReaction(messageId, emoji) {
  const response = await fetch(`/api/chat/${encodeURIComponent(activeChatId)}/message/${encodeURIComponent(messageId)}/reaction`, { method: "POST", headers: authHeaders, body: JSON.stringify({ emoji }) });
  const data = await response.json();
  if (!data.success) return alert(data.message || "Unable to react.");
  updateReactionView(messageId, data.reactions);
  socket.emit("messageReaction", { roomId: roomName, messageId, reactions: data.reactions });
}

async function sendGif(mediaUrl) {
  const response = await fetch(`/api/chat/${encodeURIComponent(activeChatId)}/gif`, { method: "POST", headers: authHeaders, body: JSON.stringify({ mediaUrl }) });
  const data = await response.json();
  if (!data.success) throw new Error(data.message || "GIF could not be sent.");
  appendMessage(data.message); socket.emit("sendMessage", { roomId: roomName, message: data.message }); gifPicker.close();
}

async function searchGifs(query) {
  gifResults.replaceChildren(); gifStatus.textContent = "Searching Tenor…";
  const data = await fetch(`/api/gifs/search?q=${encodeURIComponent(query)}`).then((response) => response.json());
  if (!data.success) { gifStatus.textContent = data.message || "GIF search is unavailable."; return; }
  gifStatus.textContent = data.results.length ? "Choose a GIF" : "No GIFs found.";
  data.results.forEach((gif) => { const button = document.createElement("button"); const image = document.createElement("img"); image.src = gif.preview; image.alt = "GIF result"; button.appendChild(image); button.onclick = async () => { try { await sendGif(gif.url); } catch (error) { alert(error.message); } }; gifResults.appendChild(button); });
}

function appendMessage(payload) {
  const key = messageKey(payload);
  if (renderedMessages.has(key)) return;
  renderedMessages.add(key);

  const row = document.createElement("article");
  row.dataset.messageId = payload.messageId || "";
  const kind = payload.sender === currentUser ? "me" : payload.sender === "system" ? "system" : "them";
  row.className = `messageRow ${kind}`;

  if (kind !== "system") {
    const avatar = document.createElement("img");
    avatar.className = "msgAvatar";
    avatar.src = avatars.get(payload.sender) || DEFAULT_AVATAR;
    avatar.alt = `${payload.sender}'s profile picture`;
    avatar.title = payload.sender;
    avatar.onerror = () => { avatar.src = DEFAULT_AVATAR; };
    avatar.onclick = () => { window.location.href = `profile.html?username=${encodeURIComponent(payload.sender)}`; };
    row.appendChild(avatar);
  }

  const content = document.createElement("div");
  content.className = "contentCol";
  const mediaUrl = normaliseUrl(payload.mediaUrl);
  if (payload.type === "image" && mediaUrl) {
    const image = document.createElement("img");
    image.src = mediaUrl;
    image.alt = "Shared image";
    image.className = "chatImage";
    image.onclick = () => { viewerImage.src = mediaUrl; mediaViewer.showModal(); };
    image.onerror = () => { image.replaceWith(Object.assign(document.createElement("p"), { className: "mediaError", textContent: "This image is no longer available." })); };
    content.appendChild(image);
  } else if (payload.type === "video" && mediaUrl) {
    const video = document.createElement("video");
    video.controls = true; video.preload = "metadata"; video.src = mediaUrl; video.className = "chatVideo";
    video.onclick = () => { if (video.paused) video.play(); };
    content.appendChild(video);
  } else if (payload.type === "voice" && mediaUrl) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "metadata";
    audio.src = mediaUrl;
    audio.className = "voiceNote";
    audio.onerror = () => { content.appendChild(Object.assign(document.createElement("p"), { className: "mediaError", textContent: "This voice note could not be played." })); };
    content.appendChild(audio);
  } else {
    const text = document.createElement("p");
    text.className = "msgText";
    text.textContent = kind === "me" ? `You: ${payload.text || ""}` : `${payload.sender}: ${payload.text || ""}`;
    content.appendChild(text);
  }

  if (kind !== "system") {
    const time = document.createElement("time");
    time.className = "messageTime";
    const sentAt = payload.createdAt ? new Date(payload.createdAt) : new Date();
    time.dateTime = sentAt.toISOString();
    time.textContent = sentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    content.appendChild(time);
  }

  if (kind !== "system") {
    const actions = document.createElement("div");
    actions.className = "messageActions";

    if (payload.sender === currentUser) {
      const unsendBtn = document.createElement("button");
      unsendBtn.type = "button";
      unsendBtn.className = "actionBtn unsendBtn";
      unsendBtn.textContent = "Unsend";
      unsendBtn.onclick = async (event) => {
        event.stopPropagation();
        try {
          await unsendChatMessage(payload.messageId);
        } catch (error) {
          alert(error.message || "Unable to unsend message.");
        }
      };
      actions.appendChild(unsendBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "actionBtn deleteBtn";
    deleteBtn.textContent = "Delete for you";
    deleteBtn.onclick = async (event) => {
      event.stopPropagation();
      try { await deleteForMe(payload.messageId); } catch (error) { alert(error.message || "Unable to delete message."); }
    };
    actions.appendChild(deleteBtn);

    const replyBtn = document.createElement("button");
    replyBtn.type = "button";
    replyBtn.className = "actionBtn replyBtn";
    replyBtn.textContent = "Reply";
    replyBtn.onclick = () => {
      input.value = `↳ @${payload.sender}: ${String(payload.text || "shared media").slice(0, 80)}\n`;
      input.focus();
      updateMessageCount();
    };
    actions.appendChild(replyBtn);

    const reactBtn = document.createElement("button");
    reactBtn.type = "button"; reactBtn.className = "actionBtn"; reactBtn.textContent = "React";
    reactBtn.onclick = () => {
      const chooser = document.createElement("div"); chooser.className = "reactionChooser";
      ["👍", "❤️", "😂", "😮", "😢"].forEach((emoji) => { const choice = document.createElement("button"); choice.textContent = emoji; choice.onclick = () => { toggleReaction(payload.messageId, emoji); chooser.remove(); }; chooser.appendChild(choice); });
      actions.appendChild(chooser); setTimeout(() => chooser.remove(), 5000);
    };
    actions.appendChild(reactBtn);

    if (payload.type === "image" && mediaUrl) {
      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "actionBtn saveBtn";
      saveBtn.textContent = "Save";
      saveBtn.onclick = (event) => {
        event.stopPropagation();
        const link = document.createElement("a");
        link.href = mediaUrl;
        link.download = `image-${payload.messageId || Date.now()}.jpg`;
        link.target = "_blank";
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      actions.appendChild(saveBtn);
    }

    if (actions.children.length) {
      content.appendChild(actions);
    }
  }

  if (kind !== "system") {
    const tray = document.createElement("div"); tray.className = "reactionTray"; content.appendChild(tray);
    updateReactionView(payload.messageId, payload.reactions || []);
  }

  row.appendChild(content);
  messages.appendChild(row);
  if (kind !== "system") updateReactionView(payload.messageId, payload.reactions || []);
  messages.scrollTop = messages.scrollHeight;
}

function addSystemMessage(text) {
  appendMessage({ messageId: `system-${Date.now()}-${text}`, sender: "system", type: "system", text });
}

function removeMessageElement(messageId) {
  if (!messageId) return;
  const element = messages.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
  if (element) element.remove();
}

async function deleteForMe(messageId) {
  if (!activeChatId || !messageId) return;
  const response = await fetch(`/api/chat/${encodeURIComponent(activeChatId)}/message/${encodeURIComponent(messageId)}/hide`, { method: "PATCH", headers: authHeaders });
  const data = await response.json();
  if (!data.success) throw new Error(data.message || "Unable to delete message.");
  removeMessageElement(messageId);
}

async function unsendChatMessage(messageId) {
  if (!activeChatId || !messageId) throw new Error("Invalid message.");
  if (!confirm("Unsend this message?")) return;

  const response = await fetch(`/api/chat/${encodeURIComponent(activeChatId)}/message/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
    headers: authHeaders
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message || "Unable to unsend message.");

  removeMessageElement(messageId);
  socket.emit("unsendMessage", { roomId: roomName, messageId });
}

async function loadChatInfo(id, renderHistory) {
  const data = await fetchChat(id);
  if (!data.success) throw new Error(data.message || "Unable to load chat.");
  chatType = data.chat.type;
  renderChatControls();
  await loadParticipantAvatars(data.chat.participants);
  if (renderHistory) data.chat.messages.forEach(appendMessage);
  return data.chat;
}

async function joinRoom() {
  try {
    if (!activeChatId) {
      const response = await fetch("/api/chat/random", { method: "POST", headers: authHeaders });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Unable to join random chat.");
      activeChatId = data.chatId;
      roomName = data.chatId;
      status.textContent = data.waiting ? "Waiting for a match..." : "Match found!";
    }
    await loadChatInfo(activeChatId, true);
    socket.emit("joinRoom", { roomId: roomName });
    if (chatId) status.textContent = "Chat loaded.";
  } catch (error) {
    status.textContent = error.message || "Unable to load this chat.";
  }
}

async function uploadChatMedia(file, messageType) {
  const formData = new FormData();
  formData.append("chatId", activeChatId);
  formData.append("messageType", messageType);
  formData.append("type", "chat");
  formData.append("file", file, file.name || (messageType === "voice" ? "voice-note.webm" : "image"));
  const response = await fetch("/api/chat/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
  return response.json();
}

function createPeerConnection() {
  const connection = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  connection.onicecandidate = ({ candidate }) => { if (candidate) socket.emit("callIce", { roomId: roomName, candidate }); };
  connection.ontrack = ({ streams }) => { remoteAudio.srcObject = streams[0]; remoteAudio.hidden = false; };
  connection.onconnectionstatechange = () => {
    if (["failed", "closed"].includes(connection.connectionState)) endCall(false);
  };
  localStream.getTracks().forEach((track) => connection.addTrack(track, localStream));
  return connection;
}

async function addPendingCandidates() {
  while (pendingCandidates.length && peerConnection?.remoteDescription) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(pendingCandidates.shift()));
  }
}

async function startVoiceCall() {
  if (!activeChatId || chatType !== "private" || callActive) return;
  callActive = true;
  startCallBtn.disabled = true;
  startCallBtn.textContent = "Calling…";
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    peerConnection = createPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("callOffer", { roomId: roomName, offer });
    startCallBtn.disabled = false;
    startCallBtn.textContent = "End Call";
    status.textContent = "Calling…";
  } catch (error) {
    console.error(error);
    alert("Unable to start the voice call. Check microphone permission.");
    endCall(false);
  }
}

async function handleIncomingCall(offer) {
  if (callActive) return;
  callActive = true;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    peerConnection = createPeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    await addPendingCandidates();
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("callAnswer", { roomId: roomName, answer });
    startCallBtn.textContent = "End Call";
    status.textContent = "Call connected.";
  } catch (error) {
    console.error(error);
    endCall(true);
  }
}

function endCall(notify = true) {
  const connection = peerConnection;
  peerConnection = null;
  if (connection) connection.close();
  if (localStream) localStream.getTracks().forEach((track) => track.stop());
  localStream = null;
  pendingCandidates = [];
  callActive = false;
  remoteAudio.srcObject = null;
  remoteAudio.hidden = true;
  startCallBtn.disabled = false;
  startCallBtn.textContent = "Voice Call";
  status.textContent = "Call ended.";
  if (notify && roomName) socket.emit("callEnd", { roomId: roomName });
}

socket.on("receiveMessage", async (payload) => {
  await ensureAvatar(payload.sender);
  appendMessage(payload);
});
socket.on("messageUnsent", ({ messageId }) => {
  if (messageId) {
    removeMessageElement(messageId);
    addSystemMessage("A message was removed.");
  }
});
socket.on("systemMessage", addSystemMessage);
socket.on("typing", ({ username, isTyping }) => {
  if (username === currentUser) return;
  typingStatus.textContent = isTyping ? `@${username} is typing…` : "";
});
socket.on("connect_error", () => { status.textContent = "Live chat connection unavailable. Refresh and sign in again."; });
socket.on("callOffer", ({ offer }) => { handleIncomingCall(offer); });
socket.on("callAnswer", async ({ answer }) => { if (peerConnection) { await peerConnection.setRemoteDescription(new RTCSessionDescription(answer)); await addPendingCandidates(); status.textContent = "Call connected."; } });
socket.on("callIce", async ({ candidate }) => { if (!peerConnection?.remoteDescription) { pendingCandidates.push(candidate); return; } try { await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)); } catch (error) { console.error("ICE candidate error", error); } });
socket.on("callEnd", () => endCall(false));

sendBtn.addEventListener("click", async () => {
  const text = input.value.trim();
  if (!text || !activeChatId) return;
  sendBtn.disabled = true;
  input.disabled = true;
  try {
    const result = await fetch(`/api/chat/${encodeURIComponent(activeChatId)}/message`, { method: "POST", headers: authHeaders, body: JSON.stringify({ text, type: "text" }) }).then((response) => response.json());
    if (!result.success) throw new Error(result.message || "Message not sent.");
    appendMessage(result.message);
    socket.emit("sendMessage", { roomId: roomName, message: result.message });
    input.value = "";
    updateMessageCount();
  } catch (error) { alert(error.message); } finally { sendBtn.disabled = false; input.disabled = false; input.focus(); }
});

attachImageBtn.addEventListener("click", () => imageInput.click());
gifBtn.addEventListener("click", () => { gifPicker.showModal(); gifSearchInput.focus(); });
attachVideoBtn.addEventListener("click", () => videoInput.click());
imageInput.addEventListener("change", async () => {
  const file = imageInput.files[0];
  imageInput.value = "";
  if (!file || !activeChatId) return;
  if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
    return alert("Choose a PNG, JPG, WEBP, or GIF image.");
  }
  try {
    setMediaBusy(true);
    status.textContent = "Uploading image…";
    const result = await uploadChatMedia(file, "image");
    if (!result.success) throw new Error(result.message || "Image upload failed.");
    appendMessage(result.message);
    socket.emit("sendMessage", { roomId: roomName, message: result.message });
    status.textContent = "Image sent";
  } catch (error) { alert(error.message); } finally { setMediaBusy(false); }
});
socket.on("messageReaction", ({ messageId, reactions }) => updateReactionView(messageId, reactions));

videoInput.addEventListener("change", async () => {
  const file = videoInput.files[0]; videoInput.value = "";
  if (!file || !activeChatId) return;
  if (!/^video\/(mp4|webm)$/.test(file.type)) return alert("Choose an MP4 or WEBM video.");
  try { setMediaBusy(true); status.textContent = "Uploading video…"; const result = await uploadChatMedia(file, "video"); if (!result.success) throw new Error(result.message || "Video upload failed."); appendMessage(result.message); socket.emit("sendMessage", { roomId: roomName, message: result.message }); status.textContent = "Video sent"; } catch (error) { alert(error.message); } finally { setMediaBusy(false); }
});

recordAudioBtn.addEventListener("click", async () => {
  if (recording) { mediaRecorder?.stop(); return; }
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    mediaRecorder = new MediaRecorder(recordingStream, { mimeType });
    const chunks = [];
    mediaRecorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
    mediaRecorder.onstop = async () => {
      recording = false;
      recordAudioBtn.textContent = "Voice Note";
      recordingStream?.getTracks().forEach((track) => track.stop());
      recordingStream = null;
      if (!chunks.length) return alert("No audio was captured.");
      try {
        const result = await uploadChatMedia(new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" }), "voice");
        if (!result.success) throw new Error(result.message || "Voice note upload failed.");
        appendMessage(result.message);
        socket.emit("sendMessage", { roomId: roomName, message: result.message });
      } catch (error) { alert(error.message); }
    };
    mediaRecorder.start();
    recording = true;
    recordAudioBtn.textContent = "Stop Recording";
  } catch (error) { console.error(error); alert("Unable to access the microphone."); }
});

startCallBtn.addEventListener("click", () => callActive ? endCall() : startVoiceCall());
input.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendBtn.click(); } });
input.addEventListener("input", () => {
  updateMessageCount();
  if (!activeChatId) return;
  if (!typingSent) { socket.emit("typing", { roomId: roomName, isTyping: true }); typingSent = true; }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => { socket.emit("typing", { roomId: roomName, isTyping: false }); typingSent = false; }, 900);
});
chatSearch.addEventListener("input", filterMessages);
closeMediaViewer.addEventListener("click", () => mediaViewer.close());
mediaViewer.addEventListener("click", (event) => { if (event.target === mediaViewer) mediaViewer.close(); });
closeGifPicker.addEventListener("click", () => gifPicker.close());
gifSearchForm.addEventListener("submit", (event) => { event.preventDefault(); searchGifs(gifSearchInput.value.trim()); });
updateMessageCount();
skipBtn.onclick = () => window.location.reload();
leaveBtn.onclick = () => window.location.href = "dashboard.html";
renderChatControls();
joinRoom();
