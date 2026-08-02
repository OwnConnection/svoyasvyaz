const socket = io();

const state = {
  currentUser: null,
  chats: [],
  directory: [],
  activeChatId: null,
  activeChat: null,
  messages: [],
  typingUsers: new Map(),
  editingMessageId: null,
  selectedAttachments: [],
  replyingToMessage: null,
  mediaRecorder: null,
  recordedChunks: [],
  contextMessageId: null,
  call: {
    sessionId: null,
    chatId: null,
    peerId: null,
    peerName: "",
    mode: "audio",
    status: "idle",
    initiator: false,
    micEnabled: true,
    speakerEnabled: false,
    localStream: null,
    remoteStream: null,
    peerConnection: null
  }
};

const authScreen = document.getElementById("auth-screen");
const authForm = document.getElementById("auth-form");
const loginUsername = document.getElementById("login-username");
const loginDisplayName = document.getElementById("login-display-name");
const statusText = document.getElementById("status-text");
const profileBadge = document.getElementById("profile-badge");
const profileName = document.getElementById("profile-name");
const profileUsername = document.getElementById("profile-username");
const profileForm = document.getElementById("profile-form");
const profileDisplayNameInput = document.getElementById("profile-display-name-input");
const profileBioInput = document.getElementById("profile-bio-input");
const profileAvatarInput = document.getElementById("profile-avatar-input");
const chatCount = document.getElementById("chat-count");
const chatSearch = document.getElementById("chat-search");
const chatList = document.getElementById("chat-list");
const directoryCount = document.getElementById("directory-count");
const directoryList = document.getElementById("directory-list");
const groupForm = document.getElementById("group-form");
const groupTitle = document.getElementById("group-title");
const groupMembers = document.getElementById("group-members");
const channelForm = document.getElementById("channel-form");
const channelTitle = document.getElementById("channel-title");
const channelDescription = document.getElementById("channel-description");
const channelMembers = document.getElementById("channel-members");
const activeChatTitle = document.getElementById("active-chat-title");
const activeChatMeta = document.getElementById("active-chat-meta");
const startAudioCallButton = document.getElementById("start-audio-call");
const startVideoCallButton = document.getElementById("start-video-call");
const pinnedMessageBar = document.getElementById("pinned-message-bar");
const typingIndicator = document.getElementById("typing-indicator");
const messageSearch = document.getElementById("message-search");
const messageList = document.getElementById("message-list");
const userInfoCard = document.getElementById("user-info-card");
const membersList = document.getElementById("chat-members");
const replyBar = document.getElementById("reply-bar");
const messageContextMenu = document.getElementById("message-context-menu");
const composerForm = document.getElementById("composer-form");
const messageInput = document.getElementById("message-input");
const attachmentInput = document.getElementById("attachment-input");
const attachmentPreview = document.getElementById("attachment-preview");
const recordVoiceButton = document.getElementById("record-voice-button");
const sendButton = document.getElementById("send-button");
const imageViewer = document.getElementById("image-viewer");
const imageViewerImg = document.getElementById("image-viewer-img");
const imageViewerClose = document.getElementById("image-viewer-close");
const imageViewerTitle = document.getElementById("image-viewer-title");
const callOverlay = document.getElementById("call-overlay");
const closeCallOverlayButton = document.getElementById("close-call-overlay");
const callEyebrow = document.getElementById("call-eyebrow");
const callAvatar = document.getElementById("call-avatar");
const callTitle = document.getElementById("call-title");
const callStatus = document.getElementById("call-status");
const callStage = document.getElementById("call-stage");
const remoteVideo = document.getElementById("remote-video");
const localVideo = document.getElementById("local-video");
const callModeChip = document.getElementById("call-mode-chip");
const callChatChip = document.getElementById("call-chat-chip");
const toggleMicButton = document.getElementById("toggle-mic-button");
const toggleSpeakerButton = document.getElementById("toggle-speaker-button");
const acceptCallButton = document.getElementById("accept-call-button");
const declineCallButton = document.getElementById("decline-call-button");
const endCallButton = document.getElementById("end-call-button");

let typingTimeout = null;
let notificationPermissionRequested = false;
const sendIconMarkup = '<svg aria-hidden="true" viewBox="0 0 24 24" class="icon-svg"><path d="M21.8 3.6 2.9 10.8c-.8.3-.8 1.4 0 1.7l7.4 2.7 2.7 7.4c.3.8 1.4.8 1.7 0l7.2-18.9c.3-.8-.5-1.6-1.4-1.3Z" fill="currentColor"></path><path d="M10.3 15.2 21 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg><span class="visually-hidden">Отправить</span>';
const saveIconMarkup = '<span aria-hidden="true">&#10003;</span><span class="visually-hidden">Сохранить</span>';

function saveSession() {
  if (!state.currentUser) {
    return;
  }

  localStorage.setItem(
    "svoysvyaz-session",
    JSON.stringify({
      username: state.currentUser.username,
      displayName: state.currentUser.displayName
    })
  );
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem("svoysvyaz-session") || "null");
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTime(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function relativePresence(value) {
  if (!value) {
    return "не в сети";
  }

  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) {
    return "только что";
  }

  if (minutes < 60) {
    return `${minutes} мин назад`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours} ч назад`;
}

function getInitials(name) {
  return String(name || "?").trim().slice(0, 1).toUpperCase();
}

function getDirectPeer(chat = state.activeChat) {
  if (!state.currentUser) {
    return null;
  }

  const sourceChat =
    chat ||
    state.chats.find((item) => item.id === state.activeChatId) ||
    null;

  if (!sourceChat || sourceChat.type !== "direct") {
    return null;
  }

  const summaryChat = state.chats.find((item) => item.id === sourceChat.id) || null;
  const members = sourceChat.members || summaryChat?.members || [];

  return members.find((member) => member.id !== state.currentUser.id) || null;
}

function callModeLabel(mode) {
  return mode === "video" ? "Видео" : "Аудио";
}

function defaultSpeakerState(mode = state.call.mode) {
  return mode === "video";
}

function getCallBlockReason() {
  if (!state.activeChatId || !state.activeChat) {
    return "Сначала откройте чат.";
  }

  if (state.activeChat.type !== "direct") {
    return "Звонки доступны только в личных чатах.";
  }

  if (state.call.status !== "idle") {
    return "Сначала завершите текущий звонок.";
  }

  return "";
}

function activeCallStatusText() {
  const peerName = state.call.peerName || "контактом";

  if (state.call.status === "incoming") {
    return `${peerName} пытается дозвониться`;
  }

  if (state.call.status === "calling") {
    return `Вызываем ${peerName}`;
  }

  if (state.call.status === "connecting") {
    return "Соединяем медиа и каналы связи...";
  }

  if (state.call.status === "active") {
    return state.call.mode === "video" ? "Соединение установлено, видео активно" : "Соединение установлено, голосовой канал активен";
  }

  return "Откройте личный чат, чтобы позвонить.";
}

function renderCallControls() {
  const peer = getDirectPeer();
  const reason = getCallBlockReason();
  const callName = peer?.displayName || state.activeChat?.title || "собеседнику";
  const hint = reason || `Позвонить ${callName}`;

  startAudioCallButton.disabled = false;
  startVideoCallButton.disabled = false;
  startAudioCallButton.hidden = false;
  startVideoCallButton.hidden = false;
  startAudioCallButton.title = hint || "Аудиозвонок";
  startVideoCallButton.title = reason || `Видеозвонок ${callName}`;
  startAudioCallButton.setAttribute("aria-disabled", reason ? "true" : "false");
  startVideoCallButton.setAttribute("aria-disabled", reason ? "true" : "false");
}

function renderCallOverlay() {
  const callState = state.call;
  const peer = callState.peerName || getDirectPeer()?.displayName || "Звонок";
  const shouldOpen = callState.status !== "idle";

  callOverlay.classList.toggle("is-open", shouldOpen);
  callOverlay.classList.toggle("call-overlay--incoming", callState.status === "incoming");
  callOverlay.classList.toggle("call-overlay--calling", callState.status === "calling");
  callOverlay.setAttribute("aria-hidden", shouldOpen ? "false" : "true");

  callEyebrow.textContent =
    callState.status === "incoming"
      ? "Входящий звонок"
      : callState.status === "calling"
        ? "Исходящий звонок"
        : callState.status === "active"
          ? "Звонок в эфире"
          : "Звонок";
  callTitle.textContent = peer;
  callStatus.textContent = activeCallStatusText();
  callAvatar.textContent = getInitials(peer);
  callModeChip.textContent = callModeLabel(callState.mode);
  callChatChip.textContent = state.activeChat?.type === "direct" ? "Личный чат" : "Звонок";
  toggleMicButton.hidden = !callState.localStream;
  toggleSpeakerButton.hidden = !callState.localStream;
  toggleMicButton.textContent = callState.micEnabled ? "Микрофон включён" : "Микрофон выключен";
  toggleSpeakerButton.textContent = callState.speakerEnabled
    ? "Громкоговоритель включён"
    : "Громкоговоритель выключен";
  toggleMicButton.classList.toggle("is-active", callState.micEnabled);
  toggleSpeakerButton.classList.toggle("is-active", callState.speakerEnabled);

  acceptCallButton.hidden = callState.status !== "incoming";
  declineCallButton.hidden = !["incoming", "calling", "connecting", "active"].includes(callState.status);
  endCallButton.hidden = !["connecting", "active"].includes(callState.status);
  declineCallButton.textContent = callState.status === "incoming" ? "Отклонить" : "Отменить";

  callStage.classList.toggle("call-stage--audio-only", callState.mode !== "video");
  callStage.classList.toggle("call-stage--empty", !callState.remoteStream && !callState.localStream);

  localVideo.hidden = callState.mode !== "video" || !callState.localStream;
  remoteVideo.hidden = !callState.remoteStream;
  localVideo.srcObject = callState.localStream || null;
  remoteVideo.srcObject = callState.remoteStream || null;
  void syncCallAudioOutput();

  renderCallControls();
}

function stopStream(stream) {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => track.stop());
}

function cleanupCallMedia() {
  if (state.call.peerConnection) {
    state.call.peerConnection.onicecandidate = null;
    state.call.peerConnection.ontrack = null;
    state.call.peerConnection.onconnectionstatechange = null;
    state.call.peerConnection.close();
  }

  stopStream(state.call.localStream);
  stopStream(state.call.remoteStream);
  state.call.peerConnection = null;
  state.call.localStream = null;
  state.call.remoteStream = null;
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
}

function resetCallState() {
  cleanupCallMedia();
  state.call.sessionId = null;
  state.call.chatId = null;
  state.call.peerId = null;
  state.call.peerName = "";
  state.call.mode = "audio";
  state.call.status = "idle";
  state.call.initiator = false;
  state.call.micEnabled = true;
  state.call.speakerEnabled = false;
  renderCallOverlay();
}

function applyMicrophoneState() {
  if (!state.call.localStream) {
    return;
  }

  state.call.localStream.getAudioTracks().forEach((track) => {
    track.enabled = state.call.micEnabled;
  });
}

async function syncCallAudioOutput() {
  remoteVideo.volume = state.call.speakerEnabled ? 1 : 0.35;

  if (typeof remoteVideo.setSinkId !== "function") {
    return;
  }

  const preferredSinkId = state.call.speakerEnabled ? "default" : "communications";

  try {
    await remoteVideo.setSinkId(preferredSinkId);
  } catch {
    if (!state.call.speakerEnabled) {
      try {
        await remoteVideo.setSinkId("default");
      } catch {}
    }
  }
}

async function ensureLocalCallStream(mode) {
  if (state.call.localStream) {
    const hasVideo = state.call.localStream.getVideoTracks().length > 0;

    if ((mode === "video" && hasVideo) || (mode === "audio" && !hasVideo)) {
      return state.call.localStream;
    }

    stopStream(state.call.localStream);
    state.call.localStream = null;
  }

  state.call.localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: mode === "video"
  });
  applyMicrophoneState();
  renderCallOverlay();
  return state.call.localStream;
}

function createPeerConnection() {
  if (state.call.peerConnection) {
    return state.call.peerConnection;
  }

  const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  const remoteStream = new MediaStream();
  state.call.remoteStream = remoteStream;

  if (state.call.localStream) {
    state.call.localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, state.call.localStream);
    });
  }

  peerConnection.ontrack = (event) => {
    event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
    state.call.status = "active";
    renderCallOverlay();
  };

  peerConnection.onicecandidate = (event) => {
    if (!event.candidate || !state.call.peerId || !state.call.chatId || !state.call.sessionId) {
      return;
    }

    socket.emit("webrtc:signal", {
      sessionId: state.call.sessionId,
      chatId: state.call.chatId,
      targetUserId: state.call.peerId,
      payload: {
        type: "candidate",
        candidate: event.candidate
      }
    });
  };

  peerConnection.onconnectionstatechange = () => {
    const { connectionState } = peerConnection;

    if (connectionState === "connected") {
      state.call.status = "active";
      renderCallOverlay();
      return;
    }

    if (["failed", "disconnected", "closed"].includes(connectionState) && state.call.status !== "idle") {
      statusText.textContent = "Звонок завершён.";
      resetCallState();
    }
  };

  state.call.peerConnection = peerConnection;
  renderCallOverlay();
  return peerConnection;
}

async function sendOffer() {
  const peerConnection = createPeerConnection();
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("webrtc:signal", {
    sessionId: state.call.sessionId,
    chatId: state.call.chatId,
    targetUserId: state.call.peerId,
    payload: {
      type: "offer",
      sdp: peerConnection.localDescription
    }
  });
}

async function handleWebRtcSignal({ sessionId, fromUserId, payload }) {
  if (sessionId !== state.call.sessionId || fromUserId !== state.call.peerId) {
    return;
  }

  const peerConnection = createPeerConnection();

  if (payload.type === "offer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("webrtc:signal", {
      sessionId,
      chatId: state.call.chatId,
      targetUserId: state.call.peerId,
      payload: {
        type: "answer",
        sdp: peerConnection.localDescription
      }
    });
    state.call.status = "connecting";
    renderCallOverlay();
    return;
  }

  if (payload.type === "answer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    state.call.status = "connecting";
    renderCallOverlay();
    return;
  }

  if (payload.type === "candidate" && payload.candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch {}
  }
}

async function startCall(mode) {
  const peer = getDirectPeer();
  const blockReason = getCallBlockReason();

  if (blockReason) {
    statusText.textContent = blockReason;
    return;
  }

  if (!peer || state.call.status !== "idle") {
    return;
  }

  try {
    await ensureLocalCallStream(mode);
    state.call.chatId = state.activeChatId;
    state.call.peerId = peer?.id || null;
    state.call.peerName = peer?.displayName || state.activeChat?.title || "Звонок";
    state.call.mode = mode;
    state.call.status = "calling";
    state.call.initiator = true;
    state.call.micEnabled = true;
    state.call.speakerEnabled = defaultSpeakerState(mode);
    renderCallOverlay();

    socket.emit("call:start", {
      chatId: state.activeChatId,
      mode
    });
  } catch {
    cleanupCallMedia();
    statusText.textContent = "Не удалось получить доступ к микрофону или камере.";
  }
}

async function acceptIncomingCall() {
  if (state.call.status !== "incoming") {
    return;
  }

  try {
    await ensureLocalCallStream(state.call.mode);
    state.call.status = "connecting";
    renderCallOverlay();

    socket.emit("call:accept", {
      sessionId: state.call.sessionId,
      chatId: state.call.chatId
    });
  } catch {
    cleanupCallMedia();
    socket.emit("call:decline", {
      sessionId: state.call.sessionId,
      chatId: state.call.chatId
    });
    statusText.textContent = "Не удалось принять звонок: нет доступа к устройствам.";
    resetCallState();
  }
}

function declineCall() {
  if (state.call.status === "idle") {
    return;
  }

  const eventName = state.call.status === "incoming" ? "call:decline" : "call:end";
  socket.emit(eventName, {
    sessionId: state.call.sessionId,
    chatId: state.call.chatId
  });
  resetCallState();
}

function toggleMicrophone() {
  if (!state.call.localStream) {
    return;
  }

  state.call.micEnabled = !state.call.micEnabled;
  applyMicrophoneState();
  renderCallOverlay();
}

function toggleSpeaker() {
  if (state.call.status === "idle") {
    return;
  }

  state.call.speakerEnabled = !state.call.speakerEnabled;
  renderCallOverlay();
}

function setComposerEnabled(enabled) {
  messageInput.disabled = !enabled;
  sendButton.disabled = !enabled;
}

function updateProfile() {
  if (!state.currentUser) {
    return;
  }

  profileBadge.textContent = getInitials(state.currentUser.displayName);
  if (state.currentUser.avatarUrl) {
    profileBadge.innerHTML = `<img src="${state.currentUser.avatarUrl}" alt="${escapeHtml(state.currentUser.displayName)}" />`;
  } else {
    profileBadge.textContent = getInitials(state.currentUser.displayName);
    profileBadge.style.background = state.currentUser.avatarColor;
  }
  profileName.textContent = state.currentUser.displayName;
  profileUsername.textContent = `@${state.currentUser.username}`;
  profileDisplayNameInput.value = state.currentUser.displayName;
  profileBioInput.value = state.currentUser.bio || "";
}

function renderEmpty(container, text) {
  container.innerHTML = `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function openImageViewer(src, alt) {
  imageViewerImg.src = src;
  imageViewerImg.alt = alt || "Просмотр изображения";
  imageViewerTitle.textContent = alt || "Изображение";
  imageViewer.classList.add("is-open");
  imageViewer.setAttribute("aria-hidden", "false");
  document.body.classList.add("image-viewer-open");
}

function closeImageViewer() {
  imageViewer.classList.remove("is-open");
  imageViewer.setAttribute("aria-hidden", "true");
  imageViewerImg.removeAttribute("src");
  imageViewerTitle.textContent = "Изображение";
  document.body.classList.remove("image-viewer-open");
}

function filteredChats() {
  const query = chatSearch.value.trim().toLowerCase();

  if (!query) {
    return state.chats;
  }

  return state.chats.filter((chat) => {
    const base = `${chat.title} ${chat.description || ""} ${chat.lastMessage?.text || ""}`.toLowerCase();
    return base.includes(query);
  });
}

function renderChats() {
  const chats = filteredChats();
  chatCount.textContent = String(state.chats.length);

  if (!chats.length) {
    renderEmpty(chatList, "Чатов пока нет. Начните диалог справа в списке пользователей.");
    return;
  }

  chatList.innerHTML = chats
    .map((chat) => {
      const active = chat.id === state.activeChatId ? " chat-item--active" : "";
      const unread = chat.unreadCount ? `<span class="unread-badge">${chat.unreadCount}</span>` : "";
      const preview = escapeHtml(chat.lastMessage?.text || chat.description || "Без сообщений");
      const stamp = chat.lastMessage ? formatTime(chat.lastMessage.createdAt) : "";
      const peer = chat.type === "direct" ? getDirectPeer(chat) : null;
      const avatarMarkup = peer
        ? `<div class="avatar chat-item__avatar"${peer.avatarUrl ? ` style="background-image:url('${peer.avatarUrl}'); background-size:cover; background-position:center;"` : ` style="background:${peer.avatarColor}"`}>${peer.avatarUrl ? "" : getInitials(peer.displayName)}</div>`
        : `<div class="avatar chat-item__avatar" style="background:${chat.members?.[0]?.avatarColor || "#b85b30"}">${getInitials(chat.title)}</div>`;

      return `
        <button class="chat-item${active}" data-chat-id="${chat.id}" type="button">
          ${avatarMarkup}
          <div class="chat-item__body">
            <div class="chat-item__top">
              <strong>${escapeHtml(chat.title)}</strong>
              <span class="chat-item__time">${stamp}</span>
            </div>
            <div class="chat-item__bottom">
              <span class="chat-item__preview">${preview}</span>
              ${unread}
            </div>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderDirectory() {
  directoryCount.textContent = String(state.directory.length);

  if (!state.directory.length) {
    renderEmpty(directoryList, "Когда появятся другие пользователи, они будут здесь.");
    return;
  }

  directoryList.innerHTML = state.directory
    .map((user) => {
      const badge = user.isOnline ? `<span class="online-pill">онлайн</span>` : `<span class="offline-pill">не в сети</span>`;
      const status = user.isOnline ? "сейчас в сети" : `был(а) ${relativePresence(user.lastSeenAt)}`;
      return `
        <button class="directory-item" data-username="${user.username}" type="button">
          <div class="avatar"${user.avatarUrl ? ` style="background-image:url('${user.avatarUrl}'); background-size:cover; background-position:center;"` : ` style="background:${user.avatarColor}"`}>${user.avatarUrl ? "" : getInitials(user.displayName)}</div>
          <div class="directory-item__body">
            <strong>${escapeHtml(user.displayName)} ${badge}</strong>
            <span>@${escapeHtml(user.username)} · ${escapeHtml(status)}</span>
            <span>${escapeHtml(user.bio || "Без описания")}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function filteredMessages() {
  const query = messageSearch.value.trim().toLowerCase();

  if (!query) {
    return state.messages;
  }

  return state.messages.filter((message) => {
    const haystack = `${message.text} ${message.author?.displayName || ""}`.toLowerCase();
    return haystack.includes(query);
  });
}

function updateTypingLabel() {
  const users = [...state.typingUsers.values()];

  if (!users.length) {
    typingIndicator.textContent = "";
    return;
  }

  typingIndicator.textContent = `${users.map((user) => user.displayName).join(", ")} печатает...`;
}

function renderUserInfo() {
  if (!state.activeChat) {
    renderEmpty(userInfoCard, "Информация о чате и пользователе появится здесь.");
    return;
  }

  const chatMembers = state.activeChat.members || [];

  const peer =
    state.activeChat.type === "direct"
      ? chatMembers.find((member) => member.id !== state.currentUser.id)
      : null;

  const title = peer ? peer.displayName : state.activeChat.title;
  const subtitle = peer
    ? `@${peer.username} · ${peer.isOnline ? "онлайн" : `был(а) ${relativePresence(peer.lastSeenAt)}`}`
    : `${state.activeChat.type === "channel" ? "Канал" : "Чат"} · ${state.activeChat.memberCount} участников`;
  const about = peer ? (peer.bio || "Без описания") : (state.activeChat.description || "Без описания");
  const avatar = peer
    ? `<div class="avatar avatar--large"${peer.avatarUrl ? ` style="background-image:url('${peer.avatarUrl}'); background-size:cover; background-position:center;"` : ` style="background:${peer.avatarColor}"`}>${peer.avatarUrl ? "" : getInitials(peer.displayName)}</div>`
    : `<div class="avatar avatar--large" style="background:${chatMembers[0]?.avatarColor || "#b85b30"}">${getInitials(title)}</div>`;

  userInfoCard.innerHTML = `
    ${avatar}
    <div class="info-card__title">${escapeHtml(title)}</div>
    <div class="muted">${escapeHtml(subtitle)}</div>
    <div class="info-card__about">${escapeHtml(about)}</div>
  `;
}

function renderMembers(members) {
  if (!members.length) {
    renderEmpty(membersList, "Нет данных об участниках.");
    return;
  }

  membersList.innerHTML = members
    .map((member) => {
      const status = member.isOnline ? "в сети" : `был(а) ${relativePresence(member.lastSeenAt)}`;
      const canPromote =
        state.activeChat &&
        state.activeChat.canManage &&
        member.id !== state.currentUser.id &&
        !state.activeChat.adminIds.includes(member.id)
          ? `<button class="mini-button" data-promote-user-id="${member.id}" type="button">Сделать админом</button>`
          : "";
      return `
        <div class="member-card">
          <div class="avatar"${member.avatarUrl ? ` style="background-image:url('${member.avatarUrl}'); background-size:cover; background-position:center;"` : ` style="background:${member.avatarColor}"`}>${member.avatarUrl ? "" : getInitials(member.displayName)}</div>
          <div>
            <strong>${escapeHtml(member.displayName)} ${member.isOnline ? '<span class="online-pill">онлайн</span>' : '<span class="offline-pill">не в сети</span>'}</strong>
            <div class="muted">@${escapeHtml(member.username)}</div>
            <div class="muted">${escapeHtml(member.bio || "Без описания")}</div>
            <div class="muted">${escapeHtml(status)}</div>
            ${canPromote}
          </div>
        </div>
      `;
    })
    .join("");
}

function renderMessages() {
  const messages = filteredMessages();

  if (!state.activeChat) {
    renderEmpty(messageList, "Выберите чат слева или начните новый диалог.");
    return;
  }

  if (!messages.length) {
    renderEmpty(messageList, "Сообщений по этому запросу нет.");
    return;
  }

  messageList.innerHTML = messages
    .map((message) => {
      const mine = message.author?.id === state.currentUser.id;
      const className = `message-card${mine ? " message-card--mine" : ""}${message.deletedAt ? " message-card--deleted" : ""}`;
      const meta = [
        message.author?.displayName || "Неизвестно",
        formatTime(message.createdAt),
        message.isEdited ? "изменено" : ""
      ]
        .filter(Boolean)
        .join(" · ");

      const attachments = (message.attachments || [])
        .map((attachment) => {
          if (attachment.isImage) {
            return `
              <div class="attachment-card attachment-card--image">
                <img src="${attachment.url}" alt="${escapeHtml(attachment.name)}" />
                <button class="attachment-card__open" type="button" data-open-image="${attachment.url}" data-image-name="${escapeHtml(attachment.name)}" aria-label="Открыть изображение">
                  &#128269;
                </button>
                <span class="attachment-card__label">${escapeHtml(attachment.name)}</span>
              </div>
            `;
          }

          if (String(attachment.type || "").startsWith("audio/")) {
            return `
              <div class="attachment-card attachment-card--file">
                <span>${escapeHtml(attachment.name)}</span>
                <audio controls src="${attachment.url}"></audio>
              </div>
            `;
          }

          return `
            <a class="attachment-card attachment-card--file" href="${attachment.url}" target="_blank" rel="noreferrer">
              <span>${escapeHtml(attachment.name)}</span>
              <small>${escapeHtml(attachment.type || "Файл")}</small>
            </a>
          `;
        })
        .join("");

      return `
        <article class="${className}" data-message-card-id="${message.id}">
          <button class="message-menu-trigger" data-open-menu="${message.id}" type="button" aria-label="Действия сообщения">&#8942;</button>
          ${message.forwardedFrom ? `<div class="message-card__forwarded">Переслано от ${escapeHtml(message.forwardedFrom.authorName)}</div>` : ""}
          ${message.replyTo ? `<div class="message-card__reply">Ответ на ${escapeHtml(message.replyTo.authorName)}: ${escapeHtml(message.replyTo.text)}</div>` : ""}
          <div class="message-card__meta">${escapeHtml(meta)}</div>
          <div class="message-card__text">${escapeHtml(message.text)}</div>
          ${attachments ? `<div class="attachment-list">${attachments}</div>` : ""}
        </article>
      `;
    })
    .join("");

  messageList.scrollTop = messageList.scrollHeight;
}

function renderPinnedMessage() {
  const pinned = state.activeChat?.pinnedMessage;

  if (!pinned) {
    pinnedMessageBar.innerHTML = "";
    return;
  }

  pinnedMessageBar.innerHTML = `
    <div class="pinned-message">
      <strong>Закреплено:</strong>
      <span>${escapeHtml(pinned.text || "Сообщение")}</span>
      ${state.activeChat?.canManage ? '<button id="unpin-button" type="button">Открепить</button>' : ""}
    </div>
  `;
}

function renderReplyBar() {
  if (!state.replyingToMessage) {
    replyBar.innerHTML = "";
    return;
  }

  replyBar.innerHTML = `
    <div class="reply-pill">
      <span>Ответ на ${escapeHtml(state.replyingToMessage.author?.displayName || "Пользователь")}: ${escapeHtml(state.replyingToMessage.text || "")}</span>
      <button id="cancel-reply-button" type="button">Отмена</button>
    </div>
  `;
}

function closeContextMenu() {
  state.contextMessageId = null;
  messageContextMenu.hidden = true;
}

function openContextMenu(messageId, triggerElement) {
  const message = state.messages.find((item) => item.id === messageId);

  if (!message || !triggerElement) {
    return;
  }

  state.contextMessageId = messageId;
  const isMine = message.author?.id === state.currentUser?.id;
  const canManage = Boolean(state.activeChat?.canManage);

  messageContextMenu.querySelector('[data-context-action="edit"]').hidden = !(isMine && !message.deletedAt);
  messageContextMenu.querySelector('[data-context-action="delete"]').hidden = !(isMine && !message.deletedAt);
  messageContextMenu.querySelector('[data-context-action="pin"]').hidden = !canManage || message.deletedAt;

  const rect = triggerElement.getBoundingClientRect();
  messageContextMenu.style.top = `${rect.bottom + 8 + window.scrollY}px`;
  messageContextMenu.style.left = `${Math.max(12, rect.right - 180 + window.scrollX)}px`;
  messageContextMenu.hidden = false;
}

function handleMessageAction(action, messageId) {
  const message = state.messages.find((item) => item.id === messageId);

  if (!message || !state.activeChatId) {
    return;
  }

  if (action === "edit") {
    state.editingMessageId = messageId;
    messageInput.value = message.text;
    messageInput.focus();
    sendButton.innerHTML = saveIconMarkup;
    messageInput.placeholder = "Измените сообщение...";
  }

  if (action === "delete") {
    socket.emit("message:delete", {
      chatId: state.activeChatId,
      messageId
    });
  }

  if (action === "reply") {
    state.replyingToMessage = message;
    renderReplyBar();
    messageInput.focus();
  }

  if (action === "forward") {
    const target = prompt("Введите название чата или его ID для пересылки:");

    if (!target) {
      return;
    }

    const targetChat = state.chats.find((chat) => chat.id === target || chat.title === target || chat.rawTitle === target);

    if (!targetChat) {
      statusText.textContent = "Чат для пересылки не найден.";
      return;
    }

    socket.emit("message:forward", {
      sourceChatId: state.activeChatId,
      messageId,
      targetChatId: targetChat.id
    });
  }

  if (action === "pin") {
    socket.emit("message:pin", {
      chatId: state.activeChatId,
      messageId
    });
  }
}

function renderAttachmentPreview() {
  if (!state.selectedAttachments.length) {
    attachmentPreview.innerHTML = "";
    return;
  }

  attachmentPreview.innerHTML = state.selectedAttachments
    .map((file, index) => `
      <div class="attachment-chip">
        <span>${escapeHtml(file.name)}</span>
        <button type="button" data-remove-attachment="${index}">×</button>
      </div>
    `)
    .join("");
}

function openChat(chatId) {
  if (state.activeChatId) {
    socket.emit("chat:leave-room", { chatId: state.activeChatId });
  }

  state.typingUsers.clear();
  updateTypingLabel();
  state.activeChatId = chatId;
  state.editingMessageId = null;
  state.replyingToMessage = null;
  sendButton.innerHTML = sendIconMarkup;
  messageInput.placeholder = "Введите сообщение...";
  socket.emit("chat:join-room", { chatId });
  socket.emit("chat:open", { chatId });
  renderChats();
  renderReplyBar();
  renderCallControls();
}

function upsertChat(summary) {
  const index = state.chats.findIndex((chat) => chat.id === summary.id);

  if (index >= 0) {
    state.chats[index] = summary;
  } else {
    state.chats.push(summary);
  }

  state.chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  renderChats();

  if (state.activeChatId === summary.id) {
    state.activeChat = summary;
    activeChatTitle.textContent = summary.title;
    activeChatMeta.textContent = `${summary.type === "direct" ? "Личный диалог" : summary.type === "channel" ? "Канал" : "Группа"} · ${summary.memberCount} участников`;
    setComposerEnabled(Boolean(summary.canPost));
    messageInput.placeholder = summary.canPost ? "Введите сообщение..." : "В этом канале писать могут только администраторы";
    renderUserInfo();
    renderPinnedMessage();
    renderCallControls();
  }
}

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  statusText.textContent = "Входим в профиль...";

  socket.emit("session:start", {
    username: loginUsername.value.trim(),
    displayName: loginDisplayName.value.trim()
  });
});

chatSearch.addEventListener("input", renderChats);
messageSearch.addEventListener("input", renderMessages);

directoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-username]");

  if (button) {
    socket.emit("chat:create-direct", {
      targetUsername: button.dataset.username
    });
  }
});

chatList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-chat-id]");

  if (button) {
    openChat(button.dataset.chatId);
  }
});

groupForm.addEventListener("submit", (event) => {
  event.preventDefault();

  socket.emit("chat:create-group", {
    title: groupTitle.value.trim(),
    memberUsernames: groupMembers.value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  });
});

channelForm.addEventListener("submit", (event) => {
  event.preventDefault();

  socket.emit("chat:create-channel", {
    title: channelTitle.value.trim(),
    description: channelDescription.value.trim(),
    memberUsernames: channelMembers.value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  });
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  let avatarDataUrl = null;

  if (profileAvatarInput.files?.[0]) {
    try {
      avatarDataUrl = await readFileAsDataUrl(profileAvatarInput.files[0]);
    } catch {
      statusText.textContent = "Не удалось прочитать выбранную аватарку.";
      return;
    }
  }

  socket.emit("profile:update", {
    displayName: profileDisplayNameInput.value.trim(),
    bio: profileBioInput.value.trim(),
    avatarDataUrl
  });
});

composerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!state.activeChatId) {
    return;
  }

  const text = messageInput.value.trim();

  if (!text && !state.selectedAttachments.length) {
    return;
  }

  if (state.editingMessageId) {
    socket.emit("message:edit", {
      chatId: state.activeChatId,
      messageId: state.editingMessageId,
      text
    });
    state.editingMessageId = null;
    sendButton.innerHTML = sendIconMarkup;
    messageInput.placeholder = "Введите сообщение...";
  } else {
    socket.emit("message:send", {
      chatId: state.activeChatId,
      text,
      attachments: state.selectedAttachments,
      replyToMessageId: state.replyingToMessage?.id || null
    });
  }

  socket.emit("chat:typing", { chatId: state.activeChatId, isTyping: false });
  messageInput.value = "";
  state.selectedAttachments = [];
  state.replyingToMessage = null;
  attachmentInput.value = "";
  renderAttachmentPreview();
  renderReplyBar();
});

messageInput.addEventListener("input", () => {
  if (!state.activeChatId) {
    return;
  }

  socket.emit("chat:typing", { chatId: state.activeChatId, isTyping: true });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("chat:typing", { chatId: state.activeChatId, isTyping: false });
  }, 1200);
});

messageList.addEventListener("click", (event) => {
  const imageButton = event.target.closest("[data-open-image]");

  if (imageButton) {
    openImageViewer(imageButton.dataset.openImage, imageButton.dataset.imageName);
    return;
  }

  const menuButton = event.target.closest("[data-open-menu]");

  if (menuButton && state.activeChatId) {
    const messageId = menuButton.dataset.openMenu;

    if (!messageContextMenu.hidden && state.contextMessageId === messageId) {
      closeContextMenu();
    } else {
      openContextMenu(messageId, menuButton);
    }

    return;
  }

  const button = event.target.closest("[data-action]");

  if (!button || !state.activeChatId) {
    return;
  }

  const messageId = button.dataset.messageId;
  const action = button.dataset.action;
  const message = state.messages.find((item) => item.id === messageId);

  if (!message) {
    return;
  }

  if (action === "edit") {
    state.editingMessageId = messageId;
    messageInput.value = message.text;
    messageInput.focus();
    sendButton.innerHTML = saveIconMarkup;
    messageInput.placeholder = "Измените сообщение...";
  }

  if (action === "delete") {
    socket.emit("message:delete", {
      chatId: state.activeChatId,
      messageId
    });
  }

  if (action === "reply") {
    state.replyingToMessage = message;
    renderReplyBar();
    messageInput.focus();
  }

  if (action === "forward") {
    const target = prompt("Введите название чата или его ID для пересылки:");

    if (!target) {
      return;
    }

    const targetChat = state.chats.find((chat) => chat.id === target || chat.title === target || chat.rawTitle === target);

    if (!targetChat) {
      statusText.textContent = "Чат для пересылки не найден.";
      return;
    }

    socket.emit("message:forward", {
      sourceChatId: state.activeChatId,
      messageId,
      targetChatId: targetChat.id
    });
  }

  if (action === "pin") {
    socket.emit("message:pin", {
      chatId: state.activeChatId,
      messageId
    });
  }
});

messageContextMenu.addEventListener("click", (event) => {
  const button = event.target.closest("[data-context-action]");

  if (!button || !state.contextMessageId) {
    return;
  }

  handleMessageAction(button.dataset.contextAction, state.contextMessageId);
  closeContextMenu();
});

replyBar.addEventListener("click", (event) => {
  const button = event.target.closest("#cancel-reply-button");

  if (!button) {
    return;
  }

  state.replyingToMessage = null;
  renderReplyBar();
});

pinnedMessageBar.addEventListener("click", (event) => {
  const button = event.target.closest("#unpin-button");

  if (!button || !state.activeChatId) {
    return;
  }

  socket.emit("message:unpin", {
    chatId: state.activeChatId
  });
});

document.addEventListener("click", (event) => {
  if (!messageContextMenu.hidden && !event.target.closest("#message-context-menu") && !event.target.closest("[data-open-menu]")) {
    closeContextMenu();
  }
});

imageViewerClose.addEventListener("click", closeImageViewer);

startAudioCallButton.addEventListener("click", async () => {
  await startCall("audio");
});

startVideoCallButton.addEventListener("click", async () => {
  await startCall("video");
});

acceptCallButton.addEventListener("click", async () => {
  await acceptIncomingCall();
});

declineCallButton.addEventListener("click", () => {
  declineCall();
});

endCallButton.addEventListener("click", () => {
  declineCall();
});

toggleMicButton.addEventListener("click", () => {
  toggleMicrophone();
});

toggleSpeakerButton.addEventListener("click", () => {
  toggleSpeaker();
});

closeCallOverlayButton.addEventListener("click", () => {
  if (state.call.status !== "idle") {
    declineCall();
  }
});

imageViewer.addEventListener("click", (event) => {
  if (event.target.closest(".image-viewer__backdrop")) {
    closeImageViewer();
  }
});

document.querySelector(".image-viewer__dialog").addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && imageViewer.classList.contains("is-open")) {
    closeImageViewer();
  }
});

membersList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-promote-user-id]");

  if (button && state.activeChatId) {
    socket.emit("chat:promote-admin", {
      chatId: state.activeChatId,
      targetUserId: button.dataset.promoteUserId
    });
  }
});

attachmentPreview.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-attachment]");

  if (!button) {
    return;
  }

  state.selectedAttachments.splice(Number(button.dataset.removeAttachment), 1);
  renderAttachmentPreview();
});

attachmentInput.addEventListener("change", async () => {
  const files = [...(attachmentInput.files || [])].slice(0, 5);
  try {
    state.selectedAttachments = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: await readFileAsDataUrl(file)
      }))
    );
    if (files.length) {
      statusText.textContent = `Файлов выбрано: ${files.length}`;
    }
    renderAttachmentPreview();
  } catch {
    state.selectedAttachments = [];
    attachmentInput.value = "";
    statusText.textContent = "Не удалось прочитать выбранный файл.";
    renderAttachmentPreview();
  }
});

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function toggleVoiceRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
    state.mediaRecorder.stop();
    recordVoiceButton.innerHTML = '<span aria-hidden="true">&#127897;</span><span class="visually-hidden">Голосовое сообщение</span>';
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  state.recordedChunks = [];
  state.mediaRecorder = new MediaRecorder(stream);
  state.mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      state.recordedChunks.push(event.data);
    }
  };
  state.mediaRecorder.onstop = async () => {
    const blob = new Blob(state.recordedChunks, { type: state.mediaRecorder.mimeType || "audio/webm" });
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
    state.selectedAttachments.push({
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl: await readFileAsDataUrl(file)
    });
    renderAttachmentPreview();
    stream.getTracks().forEach((track) => track.stop());
    state.mediaRecorder = null;
  };
  state.mediaRecorder.start();
  recordVoiceButton.innerHTML = '<span aria-hidden="true">&#9632;</span><span class="visually-hidden">Остановить запись</span>';
}

recordVoiceButton.addEventListener("click", async () => {
  try {
    await toggleVoiceRecording();
  } catch {
    statusText.textContent = "Не удалось получить доступ к микрофону.";
  }
});

function maybeNotify(message) {
  if (!state.currentUser || message.author?.id === state.currentUser.id) {
    return;
  }

  if (document.visibilityState === "visible") {
    return;
  }

  if ("Notification" in window && Notification.permission === "granted") {
    const chat = state.chats.find((item) => item.id === message.chatId);
    new Notification(chat?.title || "СвойСвязь", {
      body: `${message.author?.displayName || "Пользователь"}: ${message.text || (message.attachments?.length ? "Вложение" : "Новое сообщение")}`
    });
  }

  document.title = "Новое сообщение - СвойСвязь";
}

socket.on("connect", () => {
  statusText.textContent = "Сервер подключен.";

  if (!notificationPermissionRequested && "Notification" in window && Notification.permission === "default") {
    notificationPermissionRequested = true;
    Notification.requestPermission().catch(() => {});
  }

  const session = loadSession();

  if (session?.username && session?.displayName) {
    loginUsername.value = session.username;
    loginDisplayName.value = session.displayName;
    socket.emit("session:start", session);
  }
});

socket.on("disconnect", () => {
  statusText.textContent = "Соединение потеряно. Пытаемся переподключиться...";
});

socket.on("disconnect", resetCallState);

socket.on("app:error", (message) => {
  statusText.textContent = message;

  if (state.call.status !== "idle") {
    resetCallState();
  }
});

socket.on("session:ready", ({ currentUser, chats, directory }) => {
  state.currentUser = currentUser;
  state.chats = chats;
  state.directory = directory;
  updateProfile();
  renderChats();
  renderDirectory();
  renderCallControls();
  renderCallOverlay();
  authScreen.classList.add("auth-screen--hidden");
  saveSession();

  if (!state.activeChatId && state.chats.length) {
    openChat(state.chats[0].id);
  }
});

socket.on("profile:updated", ({ currentUser }) => {
  state.currentUser = currentUser;
  updateProfile();
  renderDirectory();
  renderMembers(state.activeChat?.members || []);
  renderUserInfo();
  statusText.textContent = "Профиль сохранён.";
  profileAvatarInput.value = "";
});

socket.on("sidebar:update", ({ chats, directory }) => {
  state.chats = chats;
  state.directory = directory;
  renderChats();
  renderDirectory();
});

socket.on("directory:update", (directory) => {
  state.directory = directory;
  renderDirectory();
});

socket.on("chat:summary", (chat) => {
  upsertChat(chat);
});

socket.on("chat:opened", ({ chat, messages, members }) => {
  state.activeChat = chat;
  state.activeChat.members = members;
  state.messages = messages;
  activeChatTitle.textContent = chat.title;
  activeChatMeta.textContent = `${chat.type === "direct" ? "Личный диалог" : chat.type === "channel" ? "Канал" : "Группа"} · ${chat.memberCount} участников`;
  renderMembers(members);
  renderUserInfo();
  renderPinnedMessage();
  renderMessages();
  renderCallControls();
  setComposerEnabled(Boolean(chat.canPost));
  messageInput.placeholder = chat.canPost ? "Введите сообщение..." : "В этом канале писать могут только администраторы";
  if (chat.canPost) {
    messageInput.focus();
  }
  upsertChat(chat);
});

socket.on("call:outgoing", ({ sessionId, targetUser, chatId, mode }) => {
  state.call.sessionId = sessionId;
  state.call.chatId = chatId;
  state.call.peerId = targetUser.id;
  state.call.peerName = targetUser.displayName;
  state.call.mode = mode;
  state.call.status = "calling";
  state.call.initiator = true;
  state.call.micEnabled = true;
  state.call.speakerEnabled = defaultSpeakerState(mode);
  renderCallOverlay();
});

socket.on("call:incoming", ({ sessionId, chatId, fromUser, mode }) => {
  if (state.call.status !== "idle") {
    socket.emit("call:decline", { sessionId, chatId });
    return;
  }

  state.call.sessionId = sessionId;
  state.call.chatId = chatId;
  state.call.peerId = fromUser.id;
  state.call.peerName = fromUser.displayName;
  state.call.mode = mode;
  state.call.status = "incoming";
  state.call.initiator = false;
  state.call.micEnabled = true;
  state.call.speakerEnabled = defaultSpeakerState(mode);
  renderCallOverlay();
});

socket.on("call:accepted", async ({ sessionId }) => {
  if (sessionId !== state.call.sessionId) {
    return;
  }

  state.call.status = "connecting";
  renderCallOverlay();

  if (state.call.initiator) {
    try {
      await sendOffer();
    } catch {
      statusText.textContent = "Не удалось установить соединение.";
      declineCall();
    }
  }
});

socket.on("call:declined", ({ sessionId, reason }) => {
  if (sessionId !== state.call.sessionId) {
    return;
  }

  statusText.textContent = reason || "Звонок отклонён.";
  resetCallState();
});

socket.on("call:ended", ({ sessionId, reason }) => {
  if (sessionId && state.call.sessionId && sessionId !== state.call.sessionId) {
    return;
  }

  statusText.textContent = reason || "Звонок завершён.";
  resetCallState();
});

socket.on("webrtc:signal", async (signal) => {
  try {
    await handleWebRtcSignal(signal);
  } catch {
    statusText.textContent = "Ошибка при передаче аудио или видео.";
    declineCall();
  }
});

socket.on("chat:direct-ready", ({ chatId }) => {
  openChat(chatId);
});

socket.on("chat:group-ready", ({ chatId }) => {
  groupTitle.value = "";
  groupMembers.value = "";
  openChat(chatId);
});

socket.on("chat:channel-ready", ({ chatId }) => {
  channelTitle.value = "";
  channelDescription.value = "";
  channelMembers.value = "";
  openChat(chatId);
});

socket.on("message:new", (message) => {
  if (state.activeChatId === message.chatId) {
    state.messages.push(message);
    renderMessages();
  }

  maybeNotify(message);
});

socket.on("message:updated", (message) => {
  const index = state.messages.findIndex((item) => item.id === message.id);

  if (index >= 0) {
    state.messages[index] = message;
    renderMessages();
  }
});

socket.on("chat:typing", ({ chatId, user, isTyping }) => {
  if (chatId !== state.activeChatId) {
    return;
  }

  if (isTyping) {
    state.typingUsers.set(user.id, user);
  } else {
    state.typingUsers.delete(user.id);
  }

  updateTypingLabel();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    document.title = "СвойСвязь";
  }
});

renderEmpty(chatList, "Загрузка чатов...");
renderEmpty(directoryList, "Загрузка пользователей...");
renderEmpty(messageList, "Выберите чат слева.");
renderEmpty(membersList, "Здесь появятся участники выбранного чата.");
renderCallControls();
renderCallOverlay();
