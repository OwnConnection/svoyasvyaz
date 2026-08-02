const config = window.SVOYSVYAZ_SUPABASE || {};
const elements = {
  setupBanner: document.getElementById("setup-banner"),
  authScreen: document.getElementById("auth-screen"),
  appShell: document.getElementById("app-shell"),
  registerTab: document.getElementById("register-tab"),
  loginTab: document.getElementById("login-tab"),
  registerForm: document.getElementById("register-form"),
  loginForm: document.getElementById("login-form"),
  registerEmail: document.getElementById("register-email"),
  registerPassword: document.getElementById("register-password"),
  registerUsername: document.getElementById("register-username"),
  registerDisplayName: document.getElementById("register-display-name"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  authStatus: document.getElementById("auth-status"),
  profileBadge: document.getElementById("profile-badge"),
  profileAvatar: document.getElementById("profile-avatar"),
  profileBadgeLetter: document.getElementById("profile-badge-letter"),
  profileName: document.getElementById("profile-name"),
  profileUsername: document.getElementById("profile-username"),
  profileForm: document.getElementById("profile-form"),
  profileDisplayNameInput: document.getElementById("profile-display-name-input"),
  profileBioInput: document.getElementById("profile-bio-input"),
  profileAvatarInput: document.getElementById("profile-avatar-input"),
  profileAvatarStatus: document.getElementById("profile-avatar-status"),
  notificationStatus: document.getElementById("notification-status"),
  enableNotifications: document.getElementById("enable-notifications"),
  logoutButton: document.getElementById("logout-button"),
  userSearchForm: document.getElementById("user-search-form"),
  userSearchInput: document.getElementById("user-search-input"),
  searchResults: document.getElementById("search-results"),
  roomForm: document.getElementById("room-form"),
  roomType: document.getElementById("room-type"),
  roomTitle: document.getElementById("room-title"),
  roomMembers: document.getElementById("room-members"),
  roomStatus: document.getElementById("room-status"),
  chatList: document.getElementById("chat-list"),
  refreshChats: document.getElementById("refresh-chats"),
  messageSearchForm: document.getElementById("message-search-form"),
  messageSearchInput: document.getElementById("message-search-input"),
  messageSearchResults: document.getElementById("message-search-results"),
  activeChatTitle: document.getElementById("active-chat-title"),
  activeChatMeta: document.getElementById("active-chat-meta"),
  callButton: document.getElementById("call-button"),
  refreshMessages: document.getElementById("refresh-messages"),
  messageList: document.getElementById("message-list"),
  composerForm: document.getElementById("composer-form"),
  attachmentInput: document.getElementById("attachment-input"),
  messageInput: document.getElementById("message-input"),
  attachmentStatus: document.getElementById("attachment-status"),
  sendButton: document.getElementById("send-button"),
  cancelEditButton: document.getElementById("cancel-edit-button"),
  chatInfoCard: document.getElementById("chat-info-card"),
  stickerForm: document.getElementById("sticker-form"),
  stickerTitleInput: document.getElementById("sticker-title-input"),
  stickerFileInput: document.getElementById("sticker-file-input"),
  saveStickerButton: document.getElementById("save-sticker-button"),
  stickerStatus: document.getElementById("sticker-status"),
  stickerGallery: document.getElementById("sticker-gallery"),
  callHistoryList: document.getElementById("call-history-list"),
  appStatus: document.getElementById("app-status"),
  callOverlay: document.getElementById("call-overlay"),
  callEyebrow: document.getElementById("call-eyebrow"),
  callTitle: document.getElementById("call-title"),
  callSubtitle: document.getElementById("call-subtitle"),
  callStateBadge: document.getElementById("call-state-badge"),
  callAvatarImage: document.getElementById("call-avatar-image"),
  callAvatarLetter: document.getElementById("call-avatar-letter"),
  toggleMic: document.getElementById("toggle-mic"),
  acceptCall: document.getElementById("accept-call"),
  declineCall: document.getElementById("decline-call"),
  hangupCall: document.getElementById("hangup-call"),
  remoteAudio: document.getElementById("remote-audio"),
};

const state = {
  supabase: null,
  session: null,
  profile: null,
  chats: [],
  activeChatId: null,
  activeMessages: [],
  activeMessagesRequestId: 0,
  chatListChannel: null,
  activeMessagesChannel: null,
  seenMessageIds: new Set(),
  audioContext: null,
  authChangeToken: 0,
  pendingAvatarFile: null,
  pendingAttachmentFile: null,
  pendingStickerFile: null,
  stickers: [],
  allMessages: [],
  blockedUserIds: new Set(),
  blockedByUserIds: new Set(),
  editingMessageId: null,
  lastRenderedChatId: null,
  favoritesEnsuredForUserId: null,
  chatListRefreshTimerId: null,
  callHistory: [],
  hasCallLogs: true,
  callChannel: null,
  callChannelReady: null,
  callChannelStatus: "idle",
  callChannelRetryId: null,
  typingChannel: null,
  typingChannelReady: null,
  typingUsersByChat: new Map(),
  localTypingChatId: null,
  localTypingStopTimerId: null,
  pendingIncomingCallSignals: new Map(),
  currentCall: null,
  callCleanupTimerId: null,
  ringbackTimeoutId: null,
  ringtoneTimeoutId: null,
  activeSoundNodes: [],
  profilePresenceChannel: null,
  presenceHeartbeatId: null,
};

const RTC_CONFIGURATION = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
    {
      urls: "stun:openrelay.metered.ca:80",
    },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

const PRESENCE_ACTIVE_WINDOW_MS = 45 * 1000;
const PRESENCE_HEARTBEAT_INTERVAL_MS = 20 * 1000;
const CALL_CHANNEL_SUBSCRIBE_TIMEOUT_MS = 15000;
const CALL_CHANNEL_NAME = "messenger-calls";
const CALL_DISCONNECT_GRACE_MS = 8000;
const TYPING_CHANNEL_NAME = "messenger-typing";
const TYPING_IDLE_TIMEOUT_MS = 1800;

function createCallId() {
  return `call-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function isConfigReady() {
  return Boolean(config.url && config.anonKey && !String(config.url).includes("PASTE") && !String(config.anonKey).includes("PASTE"));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function publicAssetUrl(bucket, path) {
  const { data } = state.supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function createSafeSupabaseClient(url, anonKey, options) {
  const client = window.supabase.createClient(url, anonKey, options);
  if (!client || typeof client.rpc !== "function") {
    return client;
  }

  const originalRpc = client.rpc.bind(client);
  client.rpc = (...args) => {
    try {
      const result = originalRpc(...args);
      if (result && typeof result.catch === "function") {
        return result;
      }

      if (result && typeof result.then === "function") {
        return Promise.resolve(result);
      }

      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(error);
    }
  };

  return client;
}

async function fetchProfilesByIds(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (!uniqueIds.length) {
    return [];
  }

  const { data, error } = await state.supabase
    .from("profiles")
    .select("*")
    .in("id", uniqueIds);

  if (error) {
    throw error;
  }

  return data || [];
}

function slugifyFileName(name) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "file";
}

function getMessagePreview(message) {
  if (message?.content) {
    return message.content;
  }

  if (message?.attachment_name) {
    return `Файл: ${message.attachment_name}`;
  }

  if (message?.sticker_name || message?.sticker_url) {
    return `Стикер: ${message.sticker_name || "без названия"}`;
  }

  return "Вложение";
}

function getPresenceTimestamp(profile) {
  if (!profile?.last_seen_at) {
    return 0;
  }

  return new Date(profile.last_seen_at).getTime();
}

function isUserAvailable(profile) {
  const lastSeenAt = getPresenceTimestamp(profile);
  return Boolean(lastSeenAt) && Date.now() - lastSeenAt <= PRESENCE_ACTIVE_WINDOW_MS;
}

function getPresenceLabel(profile) {
  if (!profile) {
    return "Статус неизвестен";
  }

  if (isUserAvailable(profile)) {
    return "В сети";
  }

  if (!profile.last_seen_at) {
    return "Не в сети";
  }

  return `Был(а) в сети ${formatTime(profile.last_seen_at)}`;
}

function getCompactPresenceLabel(profile) {
  if (!profile) {
    return "";
  }

  if (isUserAvailable(profile)) {
    return "онлайн";
  }

  if (!profile.last_seen_at) {
    return "не в сети";
  }

  return `был(а) ${formatTime(profile.last_seen_at)}`;
}

function getChatTitle(chat) {
  if (!chat) {
    return "Чат";
  }

  if (chat.chat_type === "favorites") {
    return "Избранное";
  }

  if (chat.chat_type === "direct") {
    return chat.partner?.display_name || "Личный чат";
  }

  return chat.title || (chat.chat_type === "channel" ? "Канал" : "Группа");
}

function getChatSubtitle(chat) {
  if (!chat) {
    return "";
  }

  if (chat.chat_type === "favorites") {
    return "Личные заметки и пересланное себе";
  }

  if (chat.chat_type === "direct") {
    return `@${chat.partner?.username || "user"} • ${getCompactPresenceLabel(chat.partner)}`;
  }

  const typeLabel = chat.chat_type === "channel" ? "Канал" : "Группа";
  const memberCount = chat.members?.length || 0;
  const owner = chat.members?.find((member) => member.id === chat.created_by);
  return owner
    ? `${typeLabel} • ${memberCount} участник(ов) • ${owner.display_name}`
    : `${typeLabel} • ${memberCount} участник(ов)`;
}

function getChatDescription(chat) {
  if (!chat) {
    return "";
  }

  if (chat.chat_type === "favorites") {
    return "Этот чат видите только вы.";
  }

  if (chat.chat_type === "direct") {
    return chat.partner?.bio || "Личный диалог";
  }

  const members = (chat.members || [])
    .map((member) => member?.display_name)
    .filter(Boolean)
    .slice(0, 6)
    .join(", ");

  return members || "Пока без описания";
}

function getCachedMessagesForChat(chatId) {
  if (!chatId) {
    return [];
  }

  const chat = state.chats.find((item) => item.id === chatId);
  if (chat?.messages?.length) {
    return [...chat.messages];
  }

  return (state.allMessages || [])
    .filter((message) => message.chat_id === chatId)
    .sort((left, right) => new Date(left.created_at) - new Date(right.created_at));
}

function syncChatMessages(chatId, messages) {
  const normalizedMessages = [...(messages || [])].sort(
    (left, right) => new Date(left.created_at) - new Date(right.created_at)
  );

  const otherMessages = (state.allMessages || []).filter((message) => message.chat_id !== chatId);
  state.allMessages = [...otherMessages, ...normalizedMessages].sort(
    (left, right) => new Date(left.created_at) - new Date(right.created_at)
  );

  state.chats = state.chats.map((chat) => {
    if (chat.id !== chatId) {
      return chat;
    }

    return {
      ...chat,
      messages: normalizedMessages,
      last_message: normalizedMessages[normalizedMessages.length - 1] || chat.last_message || null,
    };
  });
}

function showCachedMessages(chatId) {
  state.activeMessages = getCachedMessagesForChat(chatId);
  renderMessages();
}

function getPendingCallSignals(callId) {
  return state.pendingIncomingCallSignals.get(callId) || [];
}

function queuePendingCallSignal(callId, payload) {
  if (!callId || !payload) {
    return;
  }

  const pendingSignals = getPendingCallSignals(callId);
  pendingSignals.push(payload);
  state.pendingIncomingCallSignals.set(callId, pendingSignals);
}

function clearPendingCallSignals(callId) {
  if (!callId) {
    return;
  }

  state.pendingIncomingCallSignals.delete(callId);
}

function clearChatListRefreshTimer() {
  if (state.chatListRefreshTimerId) {
    window.clearTimeout(state.chatListRefreshTimerId);
    state.chatListRefreshTimerId = null;
  }
}

function scheduleChatListRefresh() {
  if (state.chatListRefreshTimerId) {
    return;
  }

  state.chatListRefreshTimerId = window.setTimeout(async () => {
    state.chatListRefreshTimerId = null;
    try {
      await loadChats();
    } catch (error) {
      console.error(error);
    }
  }, 80);
}

function mergeRecentMessagesIntoCache(messages) {
  if (!messages?.length) {
    return;
  }

  const byId = new Map((state.allMessages || []).map((message) => [message.id, message]));
  messages.forEach((message) => {
    byId.set(message.id, message);
  });

  state.allMessages = [...byId.values()].sort(
    (left, right) => new Date(left.created_at) - new Date(right.created_at)
  );
}

function buildChatMapById(chats) {
  return new Map((chats || []).map((chat) => [chat.id, chat]));
}

async function resolveChatById(chatId, fallbackUserId = null) {
  let chat = state.chats.find((item) => item.id === chatId);
  if (chat) {
    return chat;
  }

  const [{ data: chatRow, error: chatError }, { data: memberRows, error: memberError }] = await Promise.all([
    state.supabase
      .from("direct_chats")
      .select("id, created_at, chat_type, title, created_by")
      .eq("id", chatId)
      .maybeSingle(),
    state.supabase
      .from("direct_chat_members")
      .select("chat_id, user_id, last_read_at, role")
      .eq("chat_id", chatId),
  ]);

  if (chatError) {
    throw chatError;
  }

  if (memberError) {
    throw memberError;
  }

  if (!chatRow || !memberRows?.length) {
    return null;
  }

  const profileIds = [...new Set(memberRows.map((row) => row.user_id).filter(Boolean))];
  const profiles = await fetchProfilesByIds(profileIds);
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const selfRow = memberRows.find((row) => row.user_id === state.profile.id);
  const partnerRow = memberRows.find((row) => row.user_id !== state.profile.id)
    || (fallbackUserId ? memberRows.find((row) => row.user_id === fallbackUserId) : null);
  const partnerProfile = partnerRow ? profileMap.get(partnerRow.user_id) : null;
  const memberProfiles = memberRows
    .map((member) => {
      const profile = profileMap.get(member.user_id);
      return profile ? { ...profile, role: member.role || "member" } : null;
    })
    .filter(Boolean);
  const cachedMessages = getCachedMessagesForChat(chatId);

  chat = {
    id: chatRow.id,
    chat_type: chatRow.chat_type || "direct",
    title: chatRow.title || "",
    created_by: chatRow.created_by || null,
    created_at: chatRow.created_at,
    partner: chatRow.chat_type === "favorites"
      ? {
          id: state.profile.id,
          display_name: "Избранное",
          username: state.profile.username,
          avatar_url: "",
          isFavorites: true,
        }
      : partnerProfile,
    members: memberProfiles,
    self_role: selfRow?.role || "member",
    is_blocked: partnerProfile ? state.blockedUserIds.has(partnerProfile.id) : false,
    is_blocked_by_partner: partnerProfile ? state.blockedByUserIds.has(partnerProfile.id) : false,
    messages: cachedMessages,
    last_message: cachedMessages[cachedMessages.length - 1] || null,
    last_read_at: selfRow?.last_read_at || null,
    partner_last_read_at: partnerRow?.last_read_at || null,
  };

  state.chats = [chat, ...state.chats.filter((item) => item.id !== chat.id)];
  return chat;
}

function getChatHeaderDescription(chat) {
  if (!chat) {
    return "";
  }

  if (chat.chat_type === "favorites") {
    return "Ваше персональное Избранное. Здесь можно хранить сообщения, файлы и стикеры только для себя.";
  }

  if (chat.chat_type === "direct") {
    return chat.partner?.bio || "Пользователь пока ничего не написал о себе.";
  }

  const typeLabel = chat.chat_type === "channel" ? "Канал" : "Группа";
  const members = (chat.members || [])
    .map((member) => member?.display_name)
    .filter(Boolean)
    .join(", ");

  return `${typeLabel}. Участники: ${members || "пока только вы"}.`;
}

function canManageMembers(chat) {
  return Boolean(
    chat &&
    ["group", "channel"].includes(chat.chat_type) &&
    (chat.created_by === state.profile?.id || chat.self_role === "owner")
  );
}

function renderMemberManagement(chat) {
  if (!chat || !["group", "channel"].includes(chat.chat_type)) {
    return "";
  }

  const canManage = canManageMembers(chat);

  const memberItems = (chat.members || [])
    .map((member) => {
      const isOwner = member.id === chat.created_by || member.role === "owner";
      const canRemove = canManage && member.id !== state.profile?.id && !isOwner;
      return `
        <div class="member-manager__item">
          <div class="member-manager__person">
            <span class="member-manager__name">${escapeHtml(member.display_name || member.username || "Участник")}</span>
            <span class="member-manager__meta">@${escapeHtml(member.username || "user")}${isOwner ? " • владелец" : ""}</span>
          </div>
          ${canRemove ? `<button class="danger-button member-manager__remove" type="button" data-remove-member-id="${member.id}">Удалить</button>` : ""}
        </div>
      `;
    })
    .join("");

  return `
    <div class="member-manager">
      <div class="info-card__title">Участники</div>
      ${canManage ? `
        <form class="member-manager__form" data-member-add-form="true">
          <input type="text" name="username" maxlength="40" placeholder="Логин участника: anna_dev" />
          <button class="secondary-button" type="submit">Добавить</button>
        </form>
      ` : `<div class="muted">Список участников. Управлять ими может владелец чата.</div>`}
      <div class="member-manager__list">${memberItems || `<div class="muted">Кроме вас участников пока нет.</div>`}</div>
    </div>
  `;
}

function getMessageAuthorName(message, chat) {
  if (message.sender_id === state.profile?.id) {
    return state.profile.display_name;
  }

  if (chat.chat_type === "direct") {
    return chat.partner?.display_name || "Собеседник";
  }

  return chat.members?.find((member) => member?.id === message.sender_id)?.display_name || "Участник";
}

function canCallChat(chat) {
  return Boolean(chat && chat.chat_type === "direct" && chat.partner && !chat.is_blocked && !chat.is_blocked_by_partner);
}

function canSendToChat(chat) {
  if (!chat || !state.profile) {
    return false;
  }

  if (chat.chat_type === "direct" && (chat.is_blocked || chat.is_blocked_by_partner)) {
    return false;
  }

  if (chat.chat_type !== "channel") {
    return true;
  }

  return chat.created_by === state.profile.id;
}

function getMessageSearchText(message) {
  return [
    message.is_deleted ? "" : (message.content || ""),
    message.attachment_name || "",
    message.sticker_name || "",
  ]
    .join(" ")
    .trim();
}

function isDirectChatBlocked(chat) {
  return Boolean(chat?.chat_type === "direct" && (chat.is_blocked || chat.is_blocked_by_partner));
}

function renderStickerMessage(message) {
  if (!message.sticker_url) {
    return "";
  }

  return `
    <div class="message-sticker">
      <img src="${escapeAttribute(message.sticker_url)}" alt="${escapeAttribute(message.sticker_name || "Стикер")}" class="message-sticker__image" />
    </div>
  `;
}

function getReadReceiptStatus(message, chat = getActiveChat()) {
  if (!message || !chat || chat.chat_type !== "direct" || message.sender_id !== state.profile?.id) {
    return "";
  }

  const partnerLastReadAt = chat.partner_last_read_at ? new Date(chat.partner_last_read_at).getTime() : 0;
  const messageCreatedAt = message.created_at ? new Date(message.created_at).getTime() : 0;

  return partnerLastReadAt >= messageCreatedAt ? "read" : "sent";
}

function renderReadReceipt(status, className = "") {
  if (!status) {
    return "";
  }

  const isRead = status === "read";
  const label = isRead ? "Прочитано" : "Не прочитано";

  return `
    <span class="read-receipt ${className} ${isRead ? "read-receipt--read" : "read-receipt--sent"}" aria-label="${label}" title="${label}">
      <span class="read-receipt__icon" aria-hidden="true">${isRead ? "✓✓" : "✓"}</span>
    </span>
  `;
}

function renderAttachment(message) {
  if (!message.attachment_url) {
    return "";
  }

  const name = escapeHtml(message.attachment_name || "Файл");
  const href = escapeAttribute(message.attachment_url);
  const type = message.attachment_type || "";

  if (type.startsWith("image/")) {
    return `
      <div class="message-attachment">
        <a href="${href}" target="_blank" rel="noreferrer" class="message-attachment__link">
          <img src="${href}" alt="${name}" class="message-attachment__image" />
        </a>
        <a href="${href}" target="_blank" rel="noreferrer" class="message-attachment__link">${name}</a>
      </div>
    `;
  }

  return `
    <div class="message-attachment">
      <a href="${href}" target="_blank" rel="noreferrer" class="message-attachment__link">${name}</a>
    </div>
  `;
}

function setStatus(text, isError = false) {
  elements.appStatus.textContent = text;
  elements.appStatus.classList.toggle("status-box--error", isError);
}

function setAuthStatus(text, isError = false) {
  elements.authStatus.textContent = text;
  elements.authStatus.classList.toggle("status-box--error", isError);
}

function getFriendlyError(error, fallback) {
  const message = error?.message || "";
  if (message.includes("Failed to fetch") || message.includes("Load failed") || message.includes("NetworkError")) {
    return "Не удалось подключиться к Supabase. Проверьте Project URL, publishable key и статус проекта в панели Supabase.";
  }

  if (
    message.includes("avatar_url") ||
    message.includes("last_seen_at") ||
    message.includes("attachment_url") ||
    message.includes("attachment_path") ||
    message.includes("attachment_name") ||
    message.includes("attachment_type") ||
    message.includes("attachment_size") ||
    message.includes("sticker_url") ||
    message.includes("sticker_name") ||
    message.includes("user_stickers") ||
    message.includes("call_logs") ||
    message.includes("create_room_chat") ||
    message.includes("ensure_favorites_chat") ||
    message.includes("user_blocks") ||
    message.includes("edited_at") ||
    message.includes("deleted_at") ||
    message.includes("is_deleted") ||
    message.includes("chat_type") ||
    message.includes("created_by") ||
    message.includes("role")
  ) {
    return "Нужно заново выполнить docs/supabase-schema.sql в Supabase, чтобы включить новые чаты, поиск и стикеры.";
  }

  return fallback || message || "Произошла ошибка.";
}

function isMissingCallLogsError(error) {
  const message = String(error?.message || "");
  return message.includes("public.call_logs") || message.includes("call_logs");
}

function ensureAudioContext() {
  if (!("AudioContext" in window || "webkitAudioContext" in window)) {
    return null;
  }

  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContextClass();
  }

  return state.audioContext;
}

async function playNotificationSound() {
  const audioContext = ensureAudioContext();
  if (!audioContext) {
    return;
  }

  if (audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch (error) {
      console.error("Не удалось активировать звук уведомлений:", error);
      return;
    }
  }

  const now = audioContext.currentTime;
  const masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
  masterGain.connect(audioContext.destination);

  const firstTone = audioContext.createOscillator();
  firstTone.type = "sine";
  firstTone.frequency.setValueAtTime(880, now);
  firstTone.connect(masterGain);
  firstTone.start(now);
  firstTone.stop(now + 0.12);

  const secondTone = audioContext.createOscillator();
  secondTone.type = "sine";
  secondTone.frequency.setValueAtTime(1174, now + 0.12);
  secondTone.connect(masterGain);
  secondTone.start(now + 0.12);
  secondTone.stop(now + 0.3);
}

function stopActiveSoundNodes() {
  state.activeSoundNodes.forEach(({ oscillator, gain }) => {
    try {
      oscillator.stop();
    } catch {}

    try {
      oscillator.disconnect();
    } catch {}

    try {
      gain.disconnect();
    } catch {}
  });

  state.activeSoundNodes = [];
}

function clearCallSounds() {
  if (state.ringbackTimeoutId) {
    window.clearTimeout(state.ringbackTimeoutId);
    state.ringbackTimeoutId = null;
  }

  if (state.ringtoneTimeoutId) {
    window.clearTimeout(state.ringtoneTimeoutId);
    state.ringtoneTimeoutId = null;
  }

  stopActiveSoundNodes();
}

async function playToneSequence(steps, totalDuration) {
  const audioContext = ensureAudioContext();
  if (!audioContext) {
    return;
  }

  if (audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch (error) {
      console.error("Не удалось активировать аудиоконтекст звонка:", error);
      return;
    }
  }

  const startedAt = audioContext.currentTime;
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.0001, startedAt);
  gain.connect(audioContext.destination);

  const oscillators = steps.map((step) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = step.type || "sine";
    oscillator.frequency.setValueAtTime(step.frequency, startedAt + step.start);
    oscillator.connect(gain);
    oscillator.start(startedAt + step.start);
    oscillator.stop(startedAt + step.end);
    return oscillator;
  });

  steps.forEach((step) => {
    gain.gain.setValueAtTime(0.0001, startedAt + step.start);
    gain.gain.exponentialRampToValueAtTime(step.gain || 0.05, startedAt + step.start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + step.end);
  });

  oscillators.forEach((oscillator) => {
    state.activeSoundNodes.push({ oscillator, gain });
    oscillator.onended = () => {
      state.activeSoundNodes = state.activeSoundNodes.filter((item) => item.oscillator !== oscillator);
      try {
        oscillator.disconnect();
      } catch {}
    };
  });

  window.setTimeout(() => {
    try {
      gain.disconnect();
    } catch {}
  }, Math.ceil(totalDuration * 1000) + 120);
}

async function ensureRemoteAudioPlayback() {
  try {
    elements.remoteAudio.volume = 1;
    elements.remoteAudio.muted = false;
    await elements.remoteAudio.play();
  } catch (error) {
    console.error("Не удалось запустить звук звонка/разговора:", error);
  }
}

function startOutgoingRingback() {
  clearCallSounds();

  const cycle = async () => {
    if (!state.currentCall || state.currentCall.status !== "calling") {
      return;
    }

    await playToneSequence(
      [
        { frequency: 440, start: 0, end: 0.38, gain: 0.05 },
        { frequency: 440, start: 0.78, end: 1.16, gain: 0.05 },
      ],
      4
    );

    state.ringbackTimeoutId = window.setTimeout(cycle, 4000);
  };

  cycle().catch((error) => console.error(error));
}

function startIncomingRingtone() {
  clearCallSounds();

  const cycle = async () => {
    if (!state.currentCall || state.currentCall.status !== "incoming") {
      return;
    }

    await playToneSequence(
      [
        { frequency: 740, start: 0, end: 0.32, gain: 0.14, type: "square" },
        { frequency: 988, start: 0.34, end: 0.68, gain: 0.13, type: "square" },
        { frequency: 740, start: 1.05, end: 1.37, gain: 0.14, type: "square" },
        { frequency: 988, start: 1.39, end: 1.73, gain: 0.13, type: "square" },
      ],
      3.8
    );

    state.ringtoneTimeoutId = window.setTimeout(cycle, 3800);
  };

  cycle().catch((error) => console.error(error));
}

async function playCallConnectedTone() {
  clearCallSounds();
  await playToneSequence(
    [
      { frequency: 740, start: 0, end: 0.12, gain: 0.11, type: "triangle" },
      { frequency: 988, start: 0.13, end: 0.27, gain: 0.1, type: "triangle" },
      { frequency: 1318, start: 0.29, end: 0.48, gain: 0.09, type: "sine" },
    ],
    0.58
  );
}

async function playCallEndedTone() {
  clearCallSounds();
  await playToneSequence(
    [
      { frequency: 740, start: 0, end: 0.1, gain: 0.08, type: "triangle" },
      { frequency: 554, start: 0.11, end: 0.23, gain: 0.07, type: "triangle" },
      { frequency: 392, start: 0.24, end: 0.4, gain: 0.06, type: "triangle" },
    ],
    0.48
  );
}

function isNotificationSupported() {
  return "Notification" in window;
}

function updateNotificationUI() {
  if (!isNotificationSupported()) {
    elements.notificationStatus.textContent = "Этот браузер не поддерживает уведомления.";
    elements.enableNotifications.disabled = true;
    return;
  }

  const permission = Notification.permission;
  if (permission === "granted") {
    elements.notificationStatus.textContent = "Уведомления включены.";
    elements.enableNotifications.disabled = true;
    return;
  }

  if (permission === "denied") {
    elements.notificationStatus.textContent = "Уведомления заблокированы в браузере.";
    elements.enableNotifications.disabled = true;
    return;
  }

  elements.notificationStatus.textContent = "Разрешение ещё не выдано.";
  elements.enableNotifications.disabled = false;
}

async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    setStatus("Этот браузер не поддерживает системные уведомления.", true);
    updateNotificationUI();
    return;
  }

  const permission = await Notification.requestPermission();
  updateNotificationUI();

  if (permission === "granted") {
    setStatus("Системные уведомления включены.");
    return;
  }

  setStatus("Разрешение на уведомления не выдано.", true);
}

function notifyAboutMessage(chat, message) {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return;
  }

  if (message.sender_id === state.profile.id) {
    return;
  }

  if (chat.is_blocked || chat.is_blocked_by_partner) {
    return;
  }

  if (!document.hidden && document.hasFocus() && chat.id === state.activeChatId) {
    return;
  }

  const notification = new Notification(getChatTitle(chat), {
    body: getMessageSearchText(message) || "Стикер",
    icon: "./favicon.svg",
    badge: "./favicon.svg",
    tag: `chat-${chat.id}`,
  });

  notification.onclick = () => {
    window.focus();
    state.activeChatId = chat.id;
    renderChats();
    renderChatHeader();
    subscribeToActiveChat(state.activeChatId);
    loadMessages(state.activeChatId).catch((error) => {
      console.error(error);
    });
    notification.close();
  };
}

function formatTime(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function getInitials(name) {
  return String(name || "?").trim().slice(0, 1).toUpperCase();
}

function renderAvatarMarkup(profile, className = "") {
  if (!profile) {
    return `<div class="chat-avatar ${className}">?</div>`;
  }

  if (profile.isFavorites) {
    return `
      <div class="chat-avatar ${className} chat-avatar--favorites" aria-label="Избранное" title="Избранное">
        <svg aria-hidden="true" viewBox="0 0 24 24" class="chat-avatar__icon">
          <path d="M12 3.4c2.7 0 4.7 1.3 4.7 4.1v10.7c0 .8-.9 1.3-1.6.8L12 16.8 8.9 19c-.7.5-1.6 0-1.6-.8V7.5c0-2.8 2-4.1 4.7-4.1Z" fill="currentColor"></path>
        </svg>
      </div>
    `;
  }

  if (profile.avatar_url) {
    return `<div class="chat-avatar ${className}"><img src="${escapeAttribute(profile.avatar_url)}" alt="${escapeAttribute(profile.display_name)}" class="chat-avatar__image" /></div>`;
  }

  return `<div class="chat-avatar ${className}">${escapeHtml(getInitials(profile.display_name))}</div>`;
}

function renderEmpty(container, text) {
  container.innerHTML = `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function showAuthMode(mode) {
  const isRegister = mode === "register";
  elements.registerForm.hidden = !isRegister;
  elements.loginForm.hidden = isRegister;
  elements.registerTab.classList.toggle("tab-button--active", isRegister);
  elements.loginTab.classList.toggle("tab-button--active", !isRegister);
}

async function ensureProfile(user, fallbackUsername, fallbackDisplayName) {
  const { data: existing, error: fetchError } = await state.supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  let generatedUsername = user.email?.split("@")[0]?.replace(/[^a-z0-9_]/g, "_").toLowerCase() || "user";
  if (generatedUsername.length > 24) {
    generatedUsername = generatedUsername.slice(0, 24);
  }
  if (generatedUsername.length < 3) {
    generatedUsername = "user";
  }

  const profile = {
    id: user.id,
    email: user.email,
    username: existing?.username || fallbackUsername || user.user_metadata?.username || generatedUsername,
    display_name: existing?.display_name || fallbackDisplayName || user.user_metadata?.display_name || "Пользователь",
    bio: existing?.bio || "",
    avatar_url: existing?.avatar_url || "",
    last_seen_at: existing?.last_seen_at || new Date().toISOString(),
  };

  const { error: upsertError } = await state.supabase.from("profiles").upsert(profile, { onConflict: "id" });
  if (upsertError) {
    throw upsertError;
  }

  state.profile = profile;
  updateProfileView();
}

function updateProfileView() {
  if (!state.profile) {
    return;
  }

  const letter = state.profile.display_name.slice(0, 1).toUpperCase();
  elements.profileBadgeLetter.textContent = letter;
  elements.profileBadgeLetter.hidden = Boolean(state.profile.avatar_url);
  elements.profileAvatar.hidden = !state.profile.avatar_url;
  if (state.profile.avatar_url) {
    elements.profileAvatar.src = state.profile.avatar_url;
  } else {
    elements.profileAvatar.removeAttribute("src");
  }
  elements.profileName.textContent = state.profile.display_name;
  elements.profileUsername.textContent = `@${state.profile.username}`;
  elements.profileDisplayNameInput.value = state.profile.display_name;
  elements.profileBioInput.value = state.profile.bio || "";
  elements.profileAvatarStatus.textContent = state.pendingAvatarFile
    ? `Выбрано изображение: ${state.pendingAvatarFile.name}`
    : "Можно выбрать любое изображение, которое поддерживает браузер.";
}

function getActiveChat() {
  return state.chats.find((chat) => chat.id === state.activeChatId) || null;
}

function getTypingLabel(chat) {
  if (!chat?.id) {
    return "";
  }

  const typingUsers = state.typingUsersByChat.get(chat.id) || [];
  if (!typingUsers.length) {
    return "";
  }

  if (chat.chat_type === "direct") {
    return "Печатает...";
  }

  const firstName = typingUsers[0];
  return typingUsers.length === 1 ? `${firstName} печатает...` : "Несколько участников печатают...";
}

function updateCallButton() {
  const activeChat = getActiveChat();
  const hasChat = Boolean(activeChat);
  const inCall = Boolean(state.currentCall);
  const directChat = canCallChat(activeChat);

  elements.callButton.disabled = !hasChat || inCall || !directChat;
  elements.callButton.title = !hasChat
    ? "Сначала откройте диалог"
    : inCall
      ? "Сначала завершите текущий звонок"
      : activeChat?.is_blocked
        ? "Сначала разблокируйте собеседника"
      : activeChat?.is_blocked_by_partner
        ? "Собеседник ограничил общение"
      : !directChat
        ? "Звонки доступны только в личных диалогах"
        : `Позвонить ${activeChat.partner.display_name}`;
}

function renderChats() {
  if (!state.chats.length) {
    renderEmpty(elements.chatList, "Чатов пока нет. Найдите человека, создайте группу или канал.");
    return;
  }

  elements.chatList.innerHTML = state.chats
    .map((chat) => {
      const active = chat.id === state.activeChatId;
      const preview = getMessagePreview(chat.last_message) || getChatDescription(chat) || "Нажмите, чтобы открыть диалог";
      const time = chat.last_message?.created_at ? formatTime(chat.last_message.created_at) : "";
      const receipt = chat.chat_type === "direct"
        ? renderReadReceipt(getReadReceiptStatus(chat.last_message, chat), "read-receipt--dialog")
        : "";
      const subtitle = getChatSubtitle(chat);
      return `
        <button class="chat-item ${active ? "chat-item--active" : ""}" type="button" data-chat-id="${chat.id}">
          ${renderAvatarMarkup(chat.chat_type === "direct" ? chat.partner : { display_name: getChatTitle(chat), avatar_url: "" }, "chat-item__avatar")}
          <div class="chat-item__body">
            <div class="chat-item__top">
              <span class="chat-item__title">${escapeHtml(getChatTitle(chat))}</span>
              <span class="chat-item__time">${escapeHtml(time)}</span>
            </div>
            <div class="chat-item__bottom">
              <span class="chat-item__preview">${escapeHtml(subtitle)}</span>
            </div>
            <div class="chat-item__bottom">
              <span class="chat-item__preview">${escapeHtml(preview)}</span>
              ${receipt}
            </div>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderMessages() {
  const activeChat = getActiveChat();
  if (!activeChat) {
    elements.messageInput.disabled = true;
    elements.sendButton.disabled = true;
    state.lastRenderedChatId = null;
    renderEmpty(elements.messageList, "Выберите диалог слева.");
    return;
  }

  elements.messageInput.disabled = !canSendToChat(activeChat);
  elements.sendButton.disabled = !canSendToChat(activeChat);
  elements.cancelEditButton.hidden = !state.editingMessageId;
  elements.sendButton.title = state.editingMessageId ? "Сохранить изменения" : "Отправить";
  elements.messageInput.placeholder = canSendToChat(activeChat)
    ? (state.editingMessageId ? "Измените сообщение..." : "Введите сообщение...")
    : activeChat.is_blocked
      ? "Собеседник заблокирован"
    : activeChat.is_blocked_by_partner
      ? "Собеседник ограничил общение"
    : "В этом канале писать может только создатель";

  if (!state.activeMessages.length) {
    state.lastRenderedChatId = activeChat.id;
    renderEmpty(
      elements.messageList,
      canSendToChat(activeChat) ? "Сообщений пока нет. Напишите первое." : "Сообщений пока нет."
    );
    return;
  }

  const isDifferentChat = state.lastRenderedChatId !== activeChat.id;
  const distanceFromBottom = elements.messageList.scrollHeight - elements.messageList.scrollTop - elements.messageList.clientHeight;
  const shouldStickToBottom = isDifferentChat || distanceFromBottom <= 80;

  elements.messageList.innerHTML = state.activeMessages
    .map((message) => {
      const mine = message.sender_id === state.profile.id;
      const author = getMessageAuthorName(message, activeChat);
      const receipt = activeChat.chat_type === "direct"
        ? renderReadReceipt(getReadReceiptStatus(message, activeChat), "read-receipt--message")
        : "";
      const canManage = mine && !message.is_deleted;
      return `
        <article class="message-card ${mine ? "message-card--mine" : ""}" data-message-id="${message.id}">
          <div class="message-card__meta">
            <span>${escapeHtml(author)}</span>
            <span class="message-card__meta-end">
              ${receipt}
              <span>${escapeHtml(formatTime(message.created_at))}</span>
            </span>
          </div>
          ${message.is_deleted ? `<div class="message-card__text message-card__deleted">Сообщение удалено</div>` : ""}
          ${!message.is_deleted && message.content ? `<div class="message-card__text">${escapeHtml(message.content)}</div>` : ""}
          ${!message.is_deleted ? renderStickerMessage(message) : ""}
          ${!message.is_deleted ? renderAttachment(message) : ""}
          <div class="message-card__footer">
            <span class="message-card__badge">${message.edited_at && !message.is_deleted ? "Изменено" : ""}</span>
            ${canManage ? `
              <span class="message-card__actions">
                <button class="message-card__action" type="button" data-edit-message-id="${message.id}">Изменить</button>
                <button class="message-card__action message-card__action--delete" type="button" data-delete-message-id="${message.id}">Удалить</button>
              </span>
            ` : "<span></span>"}
          </div>
        </article>
      `;
    })
    .join("");

  state.activeMessages.forEach((message) => state.seenMessageIds.add(message.id));
  state.lastRenderedChatId = activeChat.id;

  if (shouldStickToBottom) {
    elements.messageList.scrollTop = elements.messageList.scrollHeight;
  }
}

function renderChatHeader() {
  const activeChat = getActiveChat();
  if (!activeChat) {
    elements.activeChatTitle.textContent = "Выберите диалог";
    elements.activeChatMeta.textContent = "Найдите пользователя слева и откройте переписку.";
    renderEmpty(elements.chatInfoCard, "Здесь появится информация о собеседнике.");
    updateCallButton();
    return;
  }

  elements.activeChatTitle.textContent = getChatTitle(activeChat);
  const baseMeta = activeChat.chat_type === "direct"
    ? `@${activeChat.partner.username} • ${getPresenceLabel(activeChat.partner)}`
    : getChatSubtitle(activeChat);
  const typingLabel = getTypingLabel(activeChat);
  elements.activeChatMeta.textContent = typingLabel || baseMeta;
  const blockAction = activeChat.chat_type === "direct"
    ? `
      <button class="secondary-button" type="button" data-toggle-block="${activeChat.partner.id}">
        ${activeChat.is_blocked ? "Разблокировать" : "Заблокировать"}
      </button>
      ${activeChat.is_blocked_by_partner ? `<div class="muted">Собеседник ограничил общение с вами.</div>` : ""}
    `
    : "";
  const memberManagement = renderMemberManagement(activeChat);
  elements.chatInfoCard.innerHTML = `
    <div class="info-card__title">${escapeHtml(getChatTitle(activeChat))}</div>
    <div class="muted">${escapeHtml(getChatSubtitle(activeChat))}</div>
    <div>${escapeHtml(getChatHeaderDescription(activeChat))}</div>
    ${blockAction}
    ${memberManagement}
    <div class="muted">Диалог создан: ${escapeHtml(formatTime(activeChat.created_at))}</div>
  `;
  updateCallButton();
}

function renderSearchResults(users) {
  if (!users.length) {
    renderEmpty(elements.searchResults, "Ничего не найдено.");
    return;
  }

  elements.searchResults.innerHTML = users
    .map((user) => `
      <div class="search-item">
        <div class="search-item__header">
          <div>
            <div class="search-item__name">${escapeHtml(user.display_name)}</div>
            <div class="search-item__username">@${escapeHtml(user.username)}</div>
          </div>
        </div>
        <div class="muted">${escapeHtml(user.bio || "Без описания")}</div>
        <button class="search-item__button" type="button" data-user-id="${user.id}">Написать</button>
      </div>
    `)
    .join("");
}

function renderMessageSearchResults(results) {
  if (!results.length) {
    renderEmpty(elements.messageSearchResults, "Ничего не найдено.");
    return;
  }

  elements.messageSearchResults.innerHTML = results
    .map((item) => `
      <button class="message-search-item" type="button" data-chat-id="${item.chatId}" data-message-id="${item.messageId}">
        <div class="message-search-item__title">${escapeHtml(item.chatTitle)}</div>
        <div class="message-search-item__meta">${escapeHtml(item.meta)}</div>
        <div class="message-search-item__text">${escapeHtml(item.text)}</div>
      </button>
    `)
    .join("");
}

function updateStickerStatus() {
  if (!state.pendingStickerFile) {
    elements.stickerStatus.textContent = state.stickers.length
      ? "Нажмите «Отправить», чтобы отправить выбранный стикер в активный чат."
      : "Загрузите PNG, WEBP или другое изображение и отправляйте его в чат.";
    return;
  }

  elements.stickerStatus.textContent = `Выбран стикер: ${state.pendingStickerFile.name}`;
}

function renderStickerGallery() {
  if (!state.stickers.length) {
    renderEmpty(elements.stickerGallery, "У вас пока нет стикеров.");
    return;
  }

  const activeChat = getActiveChat();
  const canSend = canSendToChat(activeChat);

  elements.stickerGallery.innerHTML = state.stickers
    .map((sticker) => `
      <div class="sticker-tile">
        <img src="${escapeAttribute(sticker.image_url)}" alt="${escapeAttribute(sticker.title)}" class="sticker-tile__image" />
        <div class="sticker-tile__title">${escapeHtml(sticker.title)}</div>
        <button class="secondary-button sticker-tile__send" type="button" data-sticker-id="${sticker.id}" ${!activeChat || !canSend ? "disabled" : ""}>Отправить</button>
      </div>
    `)
    .join("");
}

function getCallStatusLabel(entry) {
  const directionLabel = entry.direction === "incoming" ? "Входящий" : "Исходящий";
  const statusLabels = {
    ringing: "Звонок",
    connected: "Соединён",
    declined: "Отклонён",
    missed: "Пропущен",
    canceled: "Отменён",
    ended: "Завершён",
  };

  return `${directionLabel} • ${statusLabels[entry.status] || entry.status}`;
}

function renderCallHistory() {
  if (!elements.callHistoryList) {
    return;
  }

  if (!state.hasCallLogs) {
    renderEmpty(elements.callHistoryList, "История звонков станет доступна после обновления SQL-схемы.");
    return;
  }

  if (!state.callHistory.length) {
    renderEmpty(elements.callHistoryList, "История звонков пока пуста.");
    return;
  }

  elements.callHistoryList.innerHTML = state.callHistory
    .map((entry) => `
      <div class="call-history-item">
        <div class="call-history-item__top">
          <div class="call-history-item__name">${escapeHtml(entry.partner_name || "Неизвестный контакт")}</div>
          <div class="call-history-item__time">${escapeHtml(formatTime(entry.started_at))}</div>
        </div>
        <div class="call-history-item__meta">${escapeHtml(getCallStatusLabel(entry))}</div>
      </div>
    `)
    .join("");
}

function updateCallOverlay() {
  const call = state.currentCall;

  elements.callOverlay.hidden = !call;

  if (!call) {
    clearCallSounds();
    elements.callAvatarImage.hidden = true;
    elements.callAvatarImage.removeAttribute("src");
    elements.callAvatarLetter.hidden = false;
    elements.callAvatarLetter.textContent = "С";
    elements.callTitle.textContent = "Звонок";
    elements.callSubtitle.textContent = "Подключение...";
    elements.callStateBadge.textContent = "Ожидание";
    elements.toggleMic.hidden = true;
    elements.acceptCall.hidden = true;
    elements.declineCall.hidden = true;
    elements.hangupCall.hidden = true;
    elements.remoteAudio.srcObject = null;
    updateCallButton();
    return;
  }

  const partner = call.partner;
  elements.callEyebrow.textContent = call.direction === "incoming" ? "входящий звонок" : "аудиозвонок";
  elements.callTitle.textContent = partner.display_name;
  elements.callSubtitle.textContent =
    call.status === "incoming"
      ? `${partner.display_name} звонит вам`
      : call.status === "calling"
        ? `Вызываем ${partner.display_name}`
        : call.status === "connecting"
          ? "Соединяем аудио..."
          : "Соединение установлено";
  elements.callStateBadge.textContent =
    call.status === "incoming"
      ? "Входящий"
      : call.status === "calling"
        ? "Исходящий"
        : call.status === "connecting"
          ? "Подключение"
          : "В разговоре";
  elements.toggleMic.hidden = !call.localStream;
  elements.toggleMic.textContent = call.micEnabled ? "Выключить микрофон" : "Включить микрофон";
  elements.acceptCall.hidden = call.status !== "incoming";
  elements.declineCall.hidden = !["incoming", "calling"].includes(call.status);
  elements.hangupCall.hidden = !["connecting", "active"].includes(call.status);

  if (partner.avatar_url) {
    elements.callAvatarImage.hidden = false;
    elements.callAvatarImage.src = partner.avatar_url;
    elements.callAvatarLetter.hidden = true;
  } else {
    elements.callAvatarImage.hidden = true;
    elements.callAvatarImage.removeAttribute("src");
    elements.callAvatarLetter.hidden = false;
    elements.callAvatarLetter.textContent = getInitials(partner.display_name);
  }

  elements.remoteAudio.srcObject = call.remoteStream || null;
  elements.remoteAudio.volume = 1;
  elements.remoteAudio.muted = false;
  updateCallButton();
}

function stopCallMediaStream(stream) {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => track.stop());
}

function clearCallChannelRetry() {
  if (state.callChannelRetryId) {
    window.clearTimeout(state.callChannelRetryId);
    state.callChannelRetryId = null;
  }
}

function ensureChannelSubscribed(channel) {
  if (!channel) {
    return Promise.reject(new Error("Канал звонка не создан."));
  }

  if (state.callChannelReady && !["TIMED_OUT", "CHANNEL_ERROR", "CLOSED", "retrying"].includes(state.callChannelStatus)) {
    return state.callChannelReady;
  }

  const readyPromise = new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      state.callChannelReady = null;
      state.callChannelStatus = "TIMED_OUT";
      reject(new Error("Подписка на канал звонка не успела установиться."));
    }, CALL_CHANNEL_SUBSCRIBE_TIMEOUT_MS);

    channel.subscribe((status) => {
      state.callChannelStatus = status;

      if (status === "SUBSCRIBED") {
        window.clearTimeout(timeoutId);
        resolve(channel);
        return;
      }

      if (["TIMED_OUT", "CHANNEL_ERROR", "CLOSED"].includes(status)) {
        window.clearTimeout(timeoutId);
        state.callChannelReady = null;
        reject(new Error(`Не удалось подключить канал звонка: ${status}.`));
      }
    });
  });

  state.callChannelReady = readyPromise;
  return state.callChannelReady;
}

async function updatePresence(force = false) {
  if (!state.supabase || !state.profile?.id || !state.session) {
    return;
  }

  if (!force && document.hidden) {
    return;
  }

  const lastSeenAt = new Date().toISOString();
  const { error } = await state.supabase
    .from("profiles")
    .update({ last_seen_at: lastSeenAt })
    .eq("id", state.profile.id);

  if (error) {
    throw error;
  }

  state.profile.last_seen_at = lastSeenAt;
}

function stopPresenceHeartbeat() {
  if (state.presenceHeartbeatId) {
    window.clearInterval(state.presenceHeartbeatId);
    state.presenceHeartbeatId = null;
  }
}

function startPresenceHeartbeat() {
  stopPresenceHeartbeat();
  updatePresence(true).catch((error) => {
    console.error("Не удалось обновить статус присутствия:", error);
  });
  state.presenceHeartbeatId = window.setInterval(() => {
    updatePresence().catch((error) => {
      console.error("Не удалось обновить статус присутствия:", error);
    });
  }, PRESENCE_HEARTBEAT_INTERVAL_MS);
}

function clearCallCleanupTimer() {
  if (state.callCleanupTimerId) {
    window.clearTimeout(state.callCleanupTimerId);
    state.callCleanupTimerId = null;
  }
}

function scheduleCallCleanup() {
  clearCallCleanupTimer();
  state.callCleanupTimerId = window.setTimeout(() => {
    if (!state.currentCall) {
      return;
    }

    finishCallLocally();
  }, CALL_DISCONNECT_GRACE_MS);
}

function finishCallLocally() {
  const call = state.currentCall;
  clearCallCleanupTimer();
  clearCallSounds();

  if (call?.peerConnection) {
    call.peerConnection.onicecandidate = null;
    call.peerConnection.ontrack = null;
    call.peerConnection.onconnectionstatechange = null;
    call.peerConnection.close();
  }

  stopCallMediaStream(call?.localStream);
  stopCallMediaStream(call?.remoteStream);
  clearPendingCallSignals(call?.id);
  state.currentCall = null;
  updateCallOverlay();
}

function toggleMicrophone() {
  const call = state.currentCall;

  if (!call?.localStream) {
    return;
  }

  call.micEnabled = !call.micEnabled;
  call.localStream.getAudioTracks().forEach((track) => {
    track.enabled = call.micEnabled;
  });
  updateCallOverlay();
}

function getCallChannel() {
  if (state.callChannel) {
    return state.callChannel;
  }

  state.callChannel = state.supabase
    .channel(CALL_CHANNEL_NAME, {
      config: {
        broadcast: {
          self: false,
          ack: true,
        },
      },
    })
    .on("broadcast", { event: "call-ring" }, ({ payload }) => {
      handleCallBroadcast("call-ring", payload).catch((error) => console.error(error));
    })
    .on("broadcast", { event: "call-accept" }, ({ payload }) => {
      handleCallBroadcast("call-accept", payload).catch((error) => console.error(error));
    })
    .on("broadcast", { event: "call-decline" }, ({ payload }) => {
      handleCallBroadcast("call-decline", payload).catch((error) => console.error(error));
    })
    .on("broadcast", { event: "call-end" }, ({ payload }) => {
      handleCallBroadcast("call-end", payload).catch((error) => console.error(error));
    })
    .on("broadcast", { event: "call-signal" }, ({ payload }) => {
      handleCallBroadcast("call-signal", payload).catch((error) => console.error(error));
    });

  return state.callChannel;
}

async function sendCallEvent(targetUserId, event, payload) {
  const channel = getCallChannel();
  await ensureChannelSubscribed(channel);

  const response = await channel.send({
    type: "broadcast",
    event,
    payload,
  });

  if (response === "ok" || response?.status === "ok") {
    return;
  }

  state.callChannelReady = null;
  state.callChannelStatus = "retrying";
  await ensureChannelSubscribed(channel);

  const retryResponse = await channel.send({
    type: "broadcast",
    event,
    payload,
  });

  if (retryResponse === "ok" || retryResponse?.status === "ok") {
    return;
  }

  throw new Error(`Не удалось отправить событие звонка: ${event}.`);
}

function buildCallState(chat, overrides = {}) {
  return {
    id: overrides.id || createCallId(),
    chatId: chat.id,
    partner: chat.partner,
    direction: overrides.direction || "outgoing",
    status: overrides.status || "calling",
    micEnabled: overrides.micEnabled ?? true,
    localStream: overrides.localStream || null,
    remoteStream: overrides.remoteStream || new MediaStream(),
    peerConnection: overrides.peerConnection || null,
    pendingIceCandidates: overrides.pendingIceCandidates || [],
    pendingRemoteOffer: overrides.pendingRemoteOffer || null,
    localTrackIds: overrides.localTrackIds || new Set(),
    offerStarted: overrides.offerStarted || false,
    logId: overrides.logId || null,
  };
}

async function loadCallHistory() {
  if (!state.profile?.id || !state.hasCallLogs) {
    state.callHistory = [];
    renderCallHistory();
    return;
  }

  const { data, error } = await state.supabase
    .from("call_logs")
    .select("*")
    .eq("user_id", state.profile.id)
    .order("started_at", { ascending: false })
    .limit(30);

  if (error) {
    if (isMissingCallLogsError(error)) {
      state.hasCallLogs = false;
      state.callHistory = [];
      renderCallHistory();
      return;
    }
    throw error;
  }

  const partnerProfiles = await fetchProfilesByIds((data || []).map((item) => item.partner_id));
  const partnerMap = new Map(partnerProfiles.map((profile) => [profile.id, profile]));

  state.callHistory = (data || []).map((item) => ({
    ...item,
    partner_name: partnerMap.get(item.partner_id)?.display_name || "Неизвестный контакт",
  }));
  renderCallHistory();
}

async function createCallLog(call, direction, status = "ringing") {
  if (!call?.partner?.id || !state.profile?.id || !state.hasCallLogs) {
    return null;
  }

  const { data, error } = await state.supabase
    .from("call_logs")
    .insert({
      call_id: call.id,
      user_id: state.profile.id,
      chat_id: call.chatId,
      partner_id: call.partner.id,
      direction,
      status,
    })
    .select("id")
    .single();

  if (error) {
    if (isMissingCallLogsError(error)) {
      state.hasCallLogs = false;
      return null;
    }
    throw error;
  }

  call.logId = data.id;
  await loadCallHistory();
  return data.id;
}

async function updateCallLog(call, status, extra = {}) {
  if (!call?.logId || !state.profile?.id || !state.hasCallLogs) {
    return;
  }

  const payload = {
    status,
    updated_at: new Date().toISOString(),
    ...extra,
  };

  const { error } = await state.supabase
    .from("call_logs")
    .update(payload)
    .eq("id", call.logId)
    .eq("user_id", state.profile.id);

  if (error) {
    if (isMissingCallLogsError(error)) {
      state.hasCallLogs = false;
      return;
    }
    throw error;
  }

  await loadCallHistory();
}

async function ensureLocalAudioStream() {
  if (state.currentCall?.localStream) {
    return state.currentCall.localStream;
  }

  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

function attachLocalTracks(call, peerConnection) {
  if (!call?.localStream || !peerConnection) {
    return;
  }

  const trackIds = call.localTrackIds || new Set();
  call.localTrackIds = trackIds;

  call.localStream.getTracks().forEach((track) => {
    if (trackIds.has(track.id)) {
      return;
    }

    peerConnection.addTrack(track, call.localStream);
    trackIds.add(track.id);
  });
}

async function flushPendingIceCandidates(call) {
  if (!call?.peerConnection?.remoteDescription || !call.pendingIceCandidates?.length) {
    return;
  }

  const pendingCandidates = [...call.pendingIceCandidates];
  call.pendingIceCandidates = [];

  for (const candidate of pendingCandidates) {
    try {
      await call.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Не удалось применить ICE-кандидат:", error);
    }
  }
}

function createPeerConnection(call) {
  if (call.peerConnection) {
    attachLocalTracks(call, call.peerConnection);
    return call.peerConnection;
  }

  const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
  const remoteStream = call.remoteStream || new MediaStream();
  call.remoteStream = remoteStream;
  attachLocalTracks(call, peerConnection);

  peerConnection.ontrack = (event) => {
    event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
    const wasActive = call.status === "active";
    call.status = "active";
    clearCallCleanupTimer();
    updateCallOverlay();
    ensureRemoteAudioPlayback().catch(() => {});
    if (!wasActive) {
      playCallConnectedTone().catch((error) => console.error(error));
    }
  };

  peerConnection.onicecandidate = (event) => {
    if (!event.candidate || !state.currentCall || state.currentCall.id !== call.id) {
      return;
    }

    sendCallEvent(call.partner.id, "call-signal", {
      chatId: call.chatId,
      callId: call.id,
      fromUserId: state.profile.id,
      targetUserId: call.partner.id,
      signal: {
        type: "candidate",
        candidate: event.candidate,
      },
    }).catch((error) => {
      console.error(error);
    });
  };

  peerConnection.onconnectionstatechange = () => {
    if (!state.currentCall || state.currentCall.id !== call.id) {
      return;
    }

    if (["connected", "completed"].includes(peerConnection.connectionState)) {
      const wasActive = call.status === "active";
      call.status = "active";
      clearCallCleanupTimer();
      updateCallOverlay();
      if (!wasActive) {
        playCallConnectedTone().catch((error) => console.error(error));
      }
      return;
    }

    if (peerConnection.connectionState === "disconnected") {
      scheduleCallCleanup();
      return;
    }

    if (["failed", "closed"].includes(peerConnection.connectionState)) {
      clearCallCleanupTimer();
      setStatus("Звонок завершён.");
      playCallEndedTone().catch((error) => console.error(error));
      finishCallLocally();
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    if (!state.currentCall || state.currentCall.id !== call.id) {
      return;
    }

    if (["connected", "completed"].includes(peerConnection.iceConnectionState)) {
      clearCallCleanupTimer();
      return;
    }

    if (peerConnection.iceConnectionState === "disconnected") {
      scheduleCallCleanup();
      return;
    }

    if (["failed", "closed"].includes(peerConnection.iceConnectionState)) {
      clearCallCleanupTimer();
      setStatus("Звонок завершён.");
      playCallEndedTone().catch((error) => console.error(error));
      finishCallLocally();
    }
  };

  call.peerConnection = peerConnection;
  return peerConnection;
}

async function startOfferExchange(call) {
  if (call.offerStarted) {
    return;
  }

  call.offerStarted = true;
  const peerConnection = createPeerConnection(call);
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  call.status = "connecting";
  updateCallOverlay();
  await sendCallEvent(call.partner.id, "call-signal", {
    chatId: call.chatId,
    callId: call.id,
    fromUserId: state.profile.id,
    targetUserId: call.partner.id,
    signal: {
      type: "offer",
      sdp: peerConnection.localDescription,
    },
  });
}

async function answerIncomingOffer(call, chatId) {
  if (!call?.pendingRemoteOffer) {
    return;
  }

  const peerConnection = createPeerConnection(call);
  await peerConnection.setRemoteDescription(new RTCSessionDescription(call.pendingRemoteOffer));
  call.pendingRemoteOffer = null;
  await flushPendingIceCandidates(call);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  await sendCallEvent(call.partner.id, "call-signal", {
    chatId,
    callId: call.id,
    fromUserId: state.profile.id,
    targetUserId: call.partner.id,
    signal: {
      type: "answer",
      sdp: peerConnection.localDescription,
    },
  });
  call.status = "connecting";
  updateCallOverlay();
}

async function processQueuedCallSignals(callId, chatId) {
  const queuedSignals = [...getPendingCallSignals(callId)];
  clearPendingCallSignals(callId);

  for (const queuedPayload of queuedSignals) {
    await handleIncomingCallSignal(chatId, queuedPayload);
  }
}

async function startCall() {
  const activeChat = getActiveChat();

  if (!activeChat) {
    setStatus("Сначала откройте диалог.", true);
    return;
  }

  if (!canCallChat(activeChat)) {
    setStatus("Звонки доступны только в личных диалогах.", true);
    return;
  }

  if (state.currentCall) {
    setStatus("Сначала завершите текущий звонок.", true);
    return;
  }

  try {
    const localStream = await ensureLocalAudioStream();
    state.currentCall = buildCallState(activeChat, {
      direction: "outgoing",
      status: "calling",
      localStream,
    });
    await createCallLog(state.currentCall, "outgoing", "ringing");
    updateCallOverlay();
    await sendCallEvent(activeChat.partner.id, "call-ring", {
      chatId: activeChat.id,
      callId: state.currentCall.id,
      fromUserId: state.profile.id,
      targetUserId: activeChat.partner.id,
    });
    createPeerConnection(state.currentCall);
    await startOfferExchange(state.currentCall);
    if (isUserAvailable(activeChat.partner)) {
      startOutgoingRingback();
    }
    setStatus(`Вызываем ${activeChat.partner.display_name}...`);
  } catch (error) {
    console.error(error);
    setStatus(getFriendlyError(error, "Не удалось начать звонок. Проверьте подключение к Realtime и разрешение на микрофон."), true);
    finishCallLocally();
  }
}

async function acceptIncomingCall() {
  const call = state.currentCall;

  if (!call || call.status !== "incoming") {
    return;
  }

  try {
    call.localStream = await ensureLocalAudioStream();
    createPeerConnection(call);
    call.status = "connecting";
    clearCallSounds();
    await updateCallLog(call, "connected", { answered_at: new Date().toISOString() });
    await answerIncomingOffer(call, call.chatId);
    updateCallOverlay();
    await ensureRemoteAudioPlayback();
    await sendCallEvent(call.partner.id, "call-accept", {
      chatId: call.chatId,
      callId: call.id,
      fromUserId: state.profile.id,
      targetUserId: call.partner.id,
    });
    setStatus("Подключаем звонок...");
  } catch (error) {
    console.error(error);
    setStatus(getFriendlyError(error, "Не удалось принять звонок. Проверьте подключение к Realtime и разрешение на микрофон."), true);
    await declineCurrentCall();
  }
}

async function declineCurrentCall() {
  const call = state.currentCall;

  if (!call) {
    return;
  }

  const eventName = call.status === "incoming" ? "call-decline" : "call-end";
  await sendCallEvent(call.partner.id, eventName, {
    chatId: call.chatId,
    callId: call.id,
    fromUserId: state.profile.id,
    targetUserId: call.partner.id,
  }).catch((error) => {
    console.error(error);
  });

  if (call.status === "incoming") {
    await updateCallLog(call, "declined", { ended_at: new Date().toISOString() }).catch((error) => console.error(error));
  } else {
    await updateCallLog(call, "canceled", { ended_at: new Date().toISOString() }).catch((error) => console.error(error));
  }

  playCallEndedTone().catch((error) => console.error(error));
  finishCallLocally();
}

async function hangupCurrentCall() {
  const call = state.currentCall;

  if (!call) {
    return;
  }

  await sendCallEvent(call.partner.id, "call-end", {
    chatId: call.chatId,
    callId: call.id,
    fromUserId: state.profile.id,
    targetUserId: call.partner.id,
  }).catch((error) => {
    console.error(error);
  });

  await updateCallLog(call, call.status === "active" ? "ended" : "canceled", { ended_at: new Date().toISOString() }).catch((error) => console.error(error));

  playCallEndedTone().catch((error) => console.error(error));
  finishCallLocally();
}

async function handleIncomingCallSignal(chatId, payload) {
  if (!state.profile || payload.targetUserId !== state.profile.id) {
    return;
  }

  let chat = state.chats.find((item) => item.id === chatId) || null;
  if (!chat) {
    try {
      chat = await resolveChatById(chatId, payload.fromUserId);
    } catch (error) {
      console.error(error);
    }
  }

  if (!chat) {
    return;
  }

  if (!state.currentCall || state.currentCall.id !== payload.callId) {
    queuePendingCallSignal(payload.callId, payload);
    return;
  }

  const call = state.currentCall;

  if (payload.signal.type === "offer") {
    call.pendingRemoteOffer = payload.signal.sdp;
    if (call.localStream) {
      await answerIncomingOffer(call, chatId);
    } else {
      updateCallOverlay();
    }
    return;
  }

  if (payload.signal.type === "answer") {
    const peerConnection = createPeerConnection(call);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.signal.sdp));
    await flushPendingIceCandidates(call);
    call.status = "connecting";
    updateCallOverlay();
    return;
  }

  if (payload.signal.type === "candidate" && payload.signal.candidate) {
    const peerConnection = createPeerConnection(call);
    if (!peerConnection.remoteDescription) {
      call.pendingIceCandidates = call.pendingIceCandidates || [];
      call.pendingIceCandidates.push(payload.signal.candidate);
      return;
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(payload.signal.candidate));
    } catch (error) {
      console.error("Не удалось добавить ICE-кандидат:", error);
    }
  }
}

async function handleCallBroadcast(event, payload) {
  if (!state.profile || payload?.fromUserId === state.profile.id) {
    return;
  }

  const chatId = payload?.chatId;
  if (!chatId) {
    return;
  }

  let chat = state.chats.find((item) => item.id === chatId) || null;
  if (!chat) {
    try {
      chat = await resolveChatById(chatId, payload.fromUserId);
    } catch (error) {
      console.error(error);
    }
  }

  if (!chat) {
    return;
  }

  if (event === "call-ring" && payload.targetUserId === state.profile.id) {
    if (state.currentCall?.id === payload.callId) {
      updateCallOverlay();
      startIncomingRingtone();
      await processQueuedCallSignals(payload.callId, chatId);
      return;
    }

    if (state.currentCall) {
      await sendCallEvent(chat.partner.id, "call-decline", {
        chatId,
        callId: payload.callId,
        fromUserId: state.profile.id,
        targetUserId: chat.partner.id,
      });
      return;
    }

    state.currentCall = buildCallState(chat, {
      id: payload.callId,
      direction: "incoming",
      status: "incoming",
      remoteStream: new MediaStream(),
    });
    await createCallLog(state.currentCall, "incoming", "ringing").catch((error) => console.error(error));
    updateCallOverlay();
    setStatus(`${chat.partner.display_name} звонит вам.`);
    startIncomingRingtone();
    await processQueuedCallSignals(payload.callId, chatId);
    return;
  }

  if (!state.currentCall || state.currentCall.id !== payload.callId) {
    return;
  }

  if (event === "call-accept" && payload.targetUserId === state.profile.id) {
    clearCallSounds();
    await updateCallLog(state.currentCall, "connected", { answered_at: new Date().toISOString() }).catch((error) => console.error(error));
    if (!state.currentCall.offerStarted) {
      await startOfferExchange(state.currentCall);
    }
    return;
  }

  if (event === "call-decline" && payload.targetUserId === state.profile.id) {
    clearCallSounds();
    await updateCallLog(
      state.currentCall,
      state.currentCall.direction === "incoming" ? "missed" : "declined",
      { ended_at: new Date().toISOString() }
    ).catch((error) => console.error(error));
    setStatus("Собеседник отклонил звонок.", true);
    playCallEndedTone().catch((error) => console.error(error));
    finishCallLocally();
    return;
  }

  if (event === "call-end" && payload.targetUserId === state.profile.id) {
    clearCallSounds();
    await updateCallLog(
      state.currentCall,
      state.currentCall.status === "active" ? "ended" : "missed",
      { ended_at: new Date().toISOString() }
    ).catch((error) => console.error(error));
    setStatus("Собеседник завершил звонок.");
    playCallEndedTone().catch((error) => console.error(error));
    finishCallLocally();
    return;
  }

  if (event === "call-signal") {
    if (payload.targetUserId === state.profile.id && (!state.currentCall || state.currentCall.id !== payload.callId)) {
      queuePendingCallSignal(payload.callId, payload);

      if (payload.signal?.type === "offer") {
        state.currentCall = buildCallState(chat, {
          id: payload.callId,
          direction: "incoming",
          status: "incoming",
          remoteStream: new MediaStream(),
        });
        await createCallLog(state.currentCall, "incoming", "ringing").catch((error) => console.error(error));
        updateCallOverlay();
        setStatus(`${chat.partner.display_name} звонит вам.`);
        startIncomingRingtone();
        await processQueuedCallSignals(payload.callId, chatId);
      }
      return;
    }

    await handleIncomingCallSignal(chatId, payload);
  }
}

function handleProfileRealtime(payload) {
  const changedProfile = payload.new || payload.old;
  const changedProfileId = changedProfile?.id;

  if (!changedProfileId) {
    return;
  }

  if (state.profile?.id === changedProfileId && payload.new) {
    state.profile = {
      ...state.profile,
      ...payload.new,
    };
  }

  let hasPartnerUpdate = false;
  state.chats = state.chats.map((chat) => {
    if (!payload.new) {
      return chat;
    }

    let nextChat = chat;
    if (chat.partner?.id === changedProfileId) {
      hasPartnerUpdate = true;
      nextChat = {
        ...nextChat,
        partner: {
          ...nextChat.partner,
          ...payload.new,
        },
      };
    }

    if (chat.members?.some((member) => member.id === changedProfileId)) {
      hasPartnerUpdate = true;
      nextChat = {
        ...nextChat,
        members: nextChat.members.map((member) => (
          member.id === changedProfileId ? { ...member, ...payload.new } : member
        )),
      };
    }

    return nextChat;
  });

  if (!hasPartnerUpdate) {
    return;
  }

  renderChats();
  renderChatHeader();
  renderMessages();
}

function stopCallSignalSubscriptions() {
  clearCallChannelRetry();

  if (state.callChannel) {
    state.supabase.removeChannel(state.callChannel);
    state.callChannel = null;
  }

  state.callChannelReady = null;
  state.callChannelStatus = "idle";
}

function clearLocalTypingTimer() {
  if (state.localTypingStopTimerId) {
    window.clearTimeout(state.localTypingStopTimerId);
    state.localTypingStopTimerId = null;
  }
}

function stopTypingSubscriptions() {
  clearLocalTypingTimer();

  if (state.typingChannel) {
    state.supabase.removeChannel(state.typingChannel);
    state.typingChannel = null;
  }

  state.typingChannelReady = null;
  state.typingUsersByChat = new Map();
  state.localTypingChatId = null;
}

function ensureTypingChannelSubscribed() {
  if (!state.supabase || !state.profile) {
    return Promise.reject(new Error("Typing channel unavailable."));
  }

  if (state.typingChannelReady) {
    return state.typingChannelReady;
  }

  if (!state.typingChannel) {
    state.typingChannel = state.supabase
      .channel(TYPING_CHANNEL_NAME, {
        config: {
          broadcast: {
            self: false,
            ack: false,
          },
        },
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        try {
          handleTypingBroadcast(payload);
        } catch (error) {
          console.error(error);
        }
      });
  }

  state.typingChannelReady = new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      state.typingChannelReady = null;
      reject(new Error("Typing channel subscribe timeout."));
    }, 10000);

    state.typingChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        window.clearTimeout(timeoutId);
        resolve(state.typingChannel);
        return;
      }

      if (["TIMED_OUT", "CHANNEL_ERROR", "CLOSED"].includes(status)) {
        window.clearTimeout(timeoutId);
        state.typingChannelReady = null;
        reject(new Error(`Typing channel error: ${status}`));
      }
    });
  });

  return state.typingChannelReady;
}

function handleTypingBroadcast(payload) {
  if (!payload?.chatId || !payload?.userId || payload.userId === state.profile?.id) {
    return;
  }

  const activeChat = getActiveChat();
  const typingNames = state.typingUsersByChat.get(payload.chatId) || [];
  const nextNames = payload.isTyping
    ? [...new Set([...typingNames, payload.displayName || "Собеседник"])]
    : typingNames.filter((name) => name !== (payload.displayName || "Собеседник"));

  if (nextNames.length) {
    state.typingUsersByChat.set(payload.chatId, nextNames);
  } else {
    state.typingUsersByChat.delete(payload.chatId);
  }

  if (activeChat?.id === payload.chatId) {
    renderChatHeader();
  }
}

async function sendTypingState(isTyping) {
  const activeChat = getActiveChat();
  if (!activeChat || !state.profile || !canSendToChat(activeChat)) {
    return;
  }

  try {
    const channel = await ensureTypingChannelSubscribed();
    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        chatId: activeChat.id,
        userId: state.profile.id,
        displayName: state.profile.display_name,
        isTyping,
      },
    });
  } catch (error) {
    console.error(error);
  }
}

function scheduleTypingStop(chatId) {
  clearLocalTypingTimer();
  state.localTypingStopTimerId = window.setTimeout(() => {
    if (state.localTypingChatId !== chatId) {
      return;
    }

    sendTypingState(false).catch((error) => console.error(error));
    state.localTypingChatId = null;
    state.localTypingStopTimerId = null;
  }, TYPING_IDLE_TIMEOUT_MS);
}

function handleLocalTypingInput() {
  const activeChat = getActiveChat();
  if (!activeChat || !canSendToChat(activeChat)) {
    return;
  }

  const hasText = Boolean(elements.messageInput.value.trim());
  if (!hasText) {
    if (state.localTypingChatId === activeChat.id) {
      sendTypingState(false);
      state.localTypingChatId = null;
      clearLocalTypingTimer();
    }
    return;
  }

  if (state.localTypingChatId !== activeChat.id) {
    state.localTypingChatId = activeChat.id;
    sendTypingState(true);
  }

  scheduleTypingStop(activeChat.id);
}

function syncCallSignalSubscriptions() {
  if (!state.supabase || !state.profile) {
    return;
  }

  const channel = getCallChannel();
  ensureChannelSubscribed(channel).catch((error) => {
    console.warn("Не удалось сразу подключить канал звонков, пробуем ещё раз:", error);
    state.callChannelReady = null;

    if (state.callChannel) {
      state.supabase.removeChannel(state.callChannel);
      state.callChannel = null;
    }

    clearCallChannelRetry();
    state.callChannelRetryId = window.setTimeout(() => {
      state.callChannelRetryId = null;
      syncCallSignalSubscriptions();
    }, 3000);
  });
}

async function loadChats() {
  const previousActiveChatId = state.activeChatId;
  const previousChatMap = buildChatMapById(state.chats);
  if (state.favoritesEnsuredForUserId !== state.profile.id) {
    try {
      await state.supabase.rpc("ensure_favorites_chat");
      state.favoritesEnsuredForUserId = state.profile.id;
    } catch (error) {
      console.error("Не удалось подготовить Избранное:", error);
    }
  }
  const { data: myMemberships, error: membershipError } = await state.supabase
    .from("direct_chat_members")
    .select("chat_id")
    .eq("user_id", state.profile.id);

  if (membershipError) {
    throw membershipError;
  }

  const chatIds = myMemberships.map((item) => item.chat_id);
  if (!chatIds.length) {
    state.chats = [];
    state.activeChatId = null;
    state.activeMessages = [];
    syncCallSignalSubscriptions();
    renderChats();
    renderMessages();
    renderChatHeader();
    return;
  }

  const [{ data: memberRows, error: membersError }, { data: recentMessageRows, error: messagesError }, { data: chatsRows, error: chatsError }] = await Promise.all([
    state.supabase
      .from("direct_chat_members")
      .select("chat_id, user_id, last_read_at, role")
      .in("chat_id", chatIds),
    state.supabase
      .from("messages")
      .select("*")
      .in("chat_id", chatIds)
      .order("created_at", { ascending: false })
      .limit(Math.max(250, chatIds.length * 8)),
    state.supabase
      .from("direct_chats")
      .select("id, created_at, chat_type, title, created_by")
      .in("id", chatIds),
  ]);

  if (membersError) throw membersError;
  if (messagesError) throw messagesError;
  if (chatsError) throw chatsError;

  mergeRecentMessagesIntoCache(recentMessageRows || []);
  const recentMessages = recentMessageRows || [];

  const partnerIds = [...new Set(memberRows.map((row) => row.user_id))];
  const profilesRows = await fetchProfilesByIds(partnerIds);

  const profileMap = new Map(profilesRows.map((profile) => [profile.id, profile]));
  const latestMessageMap = new Map();
  recentMessages.forEach((message) => {
    if (!latestMessageMap.has(message.chat_id)) {
      latestMessageMap.set(message.chat_id, message);
    }
  });

  state.chats = chatsRows
    .map((chat) => {
      const previousChat = previousChatMap.get(chat.id);
      const members = memberRows.filter((row) => row.chat_id === chat.id);
      const partnerRow = members.find((row) => row.user_id !== state.profile.id);
      const selfRow = members.find((row) => row.user_id === state.profile.id);
      const partnerProfile = partnerRow ? profileMap.get(partnerRow.user_id) : null;
      const memberProfiles = members
        .map((member) => {
          const profile = profileMap.get(member.user_id);
          return profile ? { ...profile, role: member.role || "member" } : null;
        })
        .filter(Boolean);
      const favoritesProfile = chat.chat_type === "favorites"
        ? {
            id: state.profile.id,
            display_name: "Избранное",
            username: state.profile.username,
            avatar_url: "",
            isFavorites: true,
          }
        : null;
      if (chat.chat_type === "direct" && !partnerProfile) {
        return null;
      }

      const cachedMessages = previousChat?.messages?.length ? previousChat.messages : getCachedMessagesForChat(chat.id);
      const lastMessage = latestMessageMap.get(chat.id) || previousChat?.last_message || cachedMessages[cachedMessages.length - 1] || null;
      return {
        id: chat.id,
        chat_type: chat.chat_type || "direct",
        title: chat.title || "",
        created_by: chat.created_by || null,
        created_at: chat.created_at,
        partner: favoritesProfile || partnerProfile,
        members: memberProfiles,
        self_role: selfRow?.role || "member",
        is_blocked: partnerProfile ? state.blockedUserIds.has(partnerProfile.id) : false,
        is_blocked_by_partner: partnerProfile ? state.blockedByUserIds.has(partnerProfile.id) : false,
        messages: cachedMessages,
        last_message: lastMessage,
        last_read_at: selfRow?.last_read_at || null,
        partner_last_read_at: partnerRow?.last_read_at || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.chat_type === "favorites" && b.chat_type !== "favorites") {
        return -1;
      }

      if (b.chat_type === "favorites" && a.chat_type !== "favorites") {
        return 1;
      }

      const left = a.last_message?.created_at || a.created_at;
      const right = b.last_message?.created_at || b.created_at;
      return new Date(right) - new Date(left);
    });

  state.chats.forEach((chat) => {
    if (chat.last_message?.id) {
      state.seenMessageIds.add(chat.last_message.id);
    }
  });

  if (!state.activeChatId && state.chats[0]) {
    state.activeChatId = state.chats[0].id;
  }

  if (state.activeChatId && !state.chats.some((chat) => chat.id === state.activeChatId)) {
    state.activeChatId = state.chats[0]?.id || null;
  }

  if (previousActiveChatId !== state.activeChatId) {
    subscribeToActiveChat(state.activeChatId);
  }

  syncCallSignalSubscriptions();
  renderChats();
  renderChatHeader();
  renderStickerGallery();
  await loadMessages(state.activeChatId);
}

async function loadMessages(chatId) {
  const requestId = ++state.activeMessagesRequestId;

  if (!chatId) {
    state.activeMessages = [];
    renderMessages();
    return;
  }

  const { data, error } = await state.supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  if (requestId !== state.activeMessagesRequestId || chatId !== state.activeChatId) {
    return;
  }

  syncChatMessages(chatId, data || []);
  state.activeMessages = [...(data || [])];
  await markChatAsRead(chatId, data);
  renderChats();
  renderMessages();
  renderStickerGallery();
}

async function markChatAsRead(chatId, messages = state.activeMessages) {
  if (!chatId || !state.profile) {
    return;
  }

  const latestIncomingMessage = [...(messages || [])]
    .reverse()
    .find((message) => message.sender_id !== state.profile.id);

  const readAt = latestIncomingMessage?.created_at || new Date().toISOString();
  const chat = state.chats.find((item) => item.id === chatId);

  if (chat?.last_read_at && new Date(chat.last_read_at).getTime() >= new Date(readAt).getTime()) {
    return;
  }

  const { error } = await state.supabase
    .from("direct_chat_members")
    .update({ last_read_at: readAt })
    .eq("chat_id", chatId)
    .eq("user_id", state.profile.id);

  if (error) {
    throw error;
  }

  if (chat) {
    chat.last_read_at = readAt;
  }
}

async function handleChatListRealtime() {
  if (!state.session || !state.profile) {
    return;
  }

  scheduleChatListRefresh();
}

async function handleMessageRealtime(payload) {
  if (!state.session || !state.profile) {
    return;
  }

  const changedChatId = payload.new?.chat_id || payload.old?.chat_id;
  if (!changedChatId) {
    return;
  }

  const isInsert = payload.eventType === "INSERT";
  const isActiveChat = changedChatId === state.activeChatId;
  const targetChat = state.chats.find((chat) => chat.id === changedChatId) || getActiveChat();
  const changedMessage = payload.new?.chat_id ? payload.new : payload.old;

  if (changedMessage?.chat_id) {
    syncChatMessages(changedChatId, [
      ...getCachedMessagesForChat(changedChatId).filter((message) => message.id !== changedMessage.id),
      ...(payload.eventType === "DELETE" ? [] : [changedMessage]),
    ]);
  }

  if (isInsert && payload.new?.id && !state.seenMessageIds.has(payload.new.id)) {
    state.seenMessageIds.add(payload.new.id);
    if (targetChat) {
      playNotificationSound().catch((error) => {
        console.error(error);
      });
      notifyAboutMessage(targetChat, payload.new);
    }
  }

  renderChats();

  if (isActiveChat) {
    await loadMessages(changedChatId);
    setStatus("Новое сообщение пришло в реальном времени.");
    return;
  }

  const chatToPromote = state.chats.find((chat) => chat.id === changedChatId);
  if (chatToPromote) {
    state.chats = [
      chatToPromote,
      ...state.chats.filter((chat) => chat.id !== changedChatId),
    ];
    renderChats();
  }
}

function stopRealtimeSubscriptions() {
  if (state.chatListChannel) {
    state.supabase.removeChannel(state.chatListChannel);
    state.chatListChannel = null;
  }

  if (state.activeMessagesChannel) {
    state.supabase.removeChannel(state.activeMessagesChannel);
    state.activeMessagesChannel = null;
  }

  if (state.profilePresenceChannel) {
    state.supabase.removeChannel(state.profilePresenceChannel);
    state.profilePresenceChannel = null;
  }

  stopTypingSubscriptions();
  stopCallSignalSubscriptions();
}

function subscribeToActiveChat(chatId) {
  if (state.activeMessagesChannel) {
    state.supabase.removeChannel(state.activeMessagesChannel);
    state.activeMessagesChannel = null;
  }

  if (!state.profile) {
    return;
  }

  state.activeMessagesChannel = state.supabase
    .channel(`messages:${state.profile.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
      },
      async (payload) => {
        try {
          await handleMessageRealtime(payload);
        } catch (error) {
          console.error(error);
        }
      }
    )
    .subscribe();
}

function startRealtimeSubscriptions() {
  stopRealtimeSubscriptions();
  ensureTypingChannelSubscribed().catch((error) => console.error(error));
  syncCallSignalSubscriptions();

  state.chatListChannel = state.supabase
    .channel(`chat-members:${state.profile.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "direct_chat_members",
      },
      async () => {
        try {
          await handleChatListRealtime();
        } catch (error) {
          console.error(error);
        }
      }
    )
    .subscribe();

  state.profilePresenceChannel = state.supabase
    .channel(`profiles:${state.profile.id}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
      },
      (payload) => {
        try {
          handleProfileRealtime(payload);
        } catch (error) {
          console.error(error);
        }
      }
    )
    .subscribe();

  subscribeToActiveChat(state.activeChatId);
}

async function handleSessionChange(session) {
  const authToken = ++state.authChangeToken;
  state.session = session;

  if (!session) {
    clearChatListRefreshTimer();
    state.profile = null;
    state.chats = [];
    state.activeChatId = null;
    state.activeMessages = [];
    state.allMessages = [];
    state.stickers = [];
    state.blockedUserIds = new Set();
    state.blockedByUserIds = new Set();
    state.editingMessageId = null;
    state.favoritesEnsuredForUserId = null;
    state.pendingIncomingCallSignals = new Map();
    state.callHistory = [];
    state.hasCallLogs = true;
    state.seenMessageIds.clear();
    state.pendingAvatarFile = null;
    state.pendingAttachmentFile = null;
    state.pendingStickerFile = null;
    finishCallLocally();
    clearCallSounds();
    stopPresenceHeartbeat();
    stopRealtimeSubscriptions();
    elements.authScreen.hidden = false;
    elements.appShell.hidden = true;
    elements.profileAvatarInput.value = "";
    elements.attachmentInput.value = "";
    elements.stickerFileInput.value = "";
    updateAttachmentStatus();
    updateStickerStatus();
    renderCallHistory();
    elements.roomStatus.textContent = "Для канала писать сообщения сможет создатель, участники будут читать.";
    updateNotificationUI();
    setAuthStatus("Войдите, чтобы искать пользователей и вести переписки.");
    return;
  }

  try {
    await ensureProfile(session.user);
    if (authToken !== state.authChangeToken) {
      return;
    }

    elements.authScreen.hidden = true;
    elements.appShell.hidden = false;
    state.hasCallLogs = true;
    renderEmpty(elements.searchResults, "Введите запрос и нажмите «Найти».");
    renderEmpty(elements.messageSearchResults, "Введите текст и нажмите «Искать».");
    elements.roomStatus.textContent = "Для канала писать сообщения сможет создатель, участники будут читать.";
    startRealtimeSubscriptions();
    await loadBlocks();
    await loadChats();
    await safeLoadStickers();
    await safeLoadCallHistory();
    if (authToken !== state.authChangeToken) {
      return;
    }

    updateNotificationUI();
    startPresenceHeartbeat();
    setAuthStatus("Авторизация выполнена.");
    setStatus("Сессия активна.");
  } catch (error) {
    console.error(error);
    stopRealtimeSubscriptions();
    elements.authScreen.hidden = false;
    elements.appShell.hidden = true;
    setAuthStatus(error.message || "Не удалось восстановить сессию.", true);
    setStatus(error.message || "Ошибка авторизации.", true);
  }
}

async function searchUsers(query) {
  if (!query.trim()) {
    renderEmpty(elements.searchResults, "Введите логин или имя пользователя.");
    return;
  }

  const safeQuery = query.trim().replaceAll(",", " ");
  const { data, error } = await state.supabase
    .from("profiles")
    .select("id, username, display_name, bio")
    .or(`username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`)
    .neq("id", state.profile.id)
    .limit(12);

  if (error) {
    throw error;
  }

  renderSearchResults(data || []);
}

async function uploadAvatar(file) {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "img";
  const path = `${state.profile.id}/${Date.now()}-${slugifyFileName(file.name || `avatar.${extension}`)}`;
  const { error } = await state.supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return publicAssetUrl("avatars", path);
}

async function uploadAttachment(file) {
  const path = `${state.profile.id}/${Date.now()}-${slugifyFileName(file.name)}`;
  const { error } = await state.supabase.storage.from("attachments").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return {
    url: publicAssetUrl("attachments", path),
    path,
  };
}

async function uploadSticker(file) {
  const path = `${state.profile.id}/${Date.now()}-${slugifyFileName(file.name)}`;
  const { error } = await state.supabase.storage.from("stickers").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return {
    url: publicAssetUrl("stickers", path),
    path,
  };
}

async function loadStickers() {
  const { data, error } = await state.supabase
    .from("user_stickers")
    .select("*")
    .eq("owner_id", state.profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  state.stickers = data || [];
  renderStickerGallery();
  updateStickerStatus();
}

async function loadBlocks() {
  if (!state.profile?.id) {
    state.blockedUserIds = new Set();
    state.blockedByUserIds = new Set();
    return;
  }

  const [{ data: blockedRows, error: blockedError }, { data: blockedByRows, error: blockedByError }] = await Promise.all([
    state.supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", state.profile.id),
    state.supabase
      .from("user_blocks")
      .select("blocker_id")
      .eq("blocked_id", state.profile.id),
  ]);

  if (blockedError) {
    throw blockedError;
  }

  if (blockedByError) {
    throw blockedByError;
  }

  state.blockedUserIds = new Set((blockedRows || []).map((row) => row.blocked_id));
  state.blockedByUserIds = new Set((blockedByRows || []).map((row) => row.blocker_id));
}

async function toggleBlockUser(userId) {
  if (!state.profile?.id || !userId) {
    return;
  }

  if (state.blockedUserIds.has(userId)) {
    const { error } = await state.supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", state.profile.id)
      .eq("blocked_id", userId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await state.supabase
      .from("user_blocks")
      .insert({
        blocker_id: state.profile.id,
        blocked_id: userId,
      });

    if (error) {
      throw error;
    }
  }

  await loadBlocks();
  await loadChats();
}

async function addChatMember(username) {
  const activeChat = getActiveChat();
  const normalizedUsername = String(username || "").trim().replace(/^@/, "").toLowerCase();

  if (!activeChat || !canManageMembers(activeChat)) {
    throw new Error("Управлять участниками можно только в своих группах и каналах.");
  }

  if (!normalizedUsername) {
    throw new Error("Укажите логин участника.");
  }

  const { error } = await state.supabase.rpc("add_chat_member", {
    target_chat: activeChat.id,
    member_username: normalizedUsername,
  });

  if (error) {
    throw error;
  }

  await loadChats();
  if (state.activeChatId) {
    showCachedMessages(state.activeChatId);
    renderChatHeader();
  }
}

async function removeChatMember(memberId) {
  const activeChat = getActiveChat();

  if (!activeChat || !canManageMembers(activeChat)) {
    throw new Error("Управлять участниками можно только в своих группах и каналах.");
  }

  if (!memberId) {
    throw new Error("Не удалось определить участника для удаления.");
  }

  const { error } = await state.supabase.rpc("remove_chat_member", {
    target_chat: activeChat.id,
    member_id: memberId,
  });

  if (error) {
    throw error;
  }

  await loadChats();
  if (state.activeChatId) {
    showCachedMessages(state.activeChatId);
    renderChatHeader();
  }
}

async function safeLoadStickers() {
  try {
    await loadStickers();
  } catch (error) {
    console.error(error);
    state.stickers = [];
    renderStickerGallery();
    elements.stickerStatus.textContent = getFriendlyError(error, "Стикеры временно недоступны.");
  }
}

async function safeLoadCallHistory() {
  try {
    await loadCallHistory();
  } catch (error) {
    console.error(error);
    state.callHistory = [];
    renderCallHistory();
  }
}

function updateAttachmentStatus() {
  if (!state.pendingAttachmentFile) {
    elements.attachmentStatus.hidden = true;
    elements.attachmentStatus.textContent = "Файл не выбран.";
    return;
  }

  elements.attachmentStatus.hidden = false;
  elements.attachmentStatus.textContent = `Выбран файл: ${state.pendingAttachmentFile.name}`;
}

async function createRoom() {
  const roomType = elements.roomType.value;
  const roomTitle = elements.roomTitle.value.trim();
  const memberUsernames = elements.roomMembers.value
    .split(/[,\s]+/)
    .map((item) => item.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);

  if (!roomTitle) {
    throw new Error("Укажите название группы или канала.");
  }

  const uniqueMembers = [...new Set(memberUsernames)].filter((username) => username !== state.profile.username);
  if (roomType === "group" && !uniqueMembers.length) {
    throw new Error("Для группы укажите хотя бы одного участника.");
  }

  const { data, error } = await state.supabase.rpc("create_room_chat", {
    room_type: roomType,
    room_title: roomTitle,
    member_usernames: uniqueMembers,
  });

  if (error) {
    throw error;
  }

  elements.roomForm.reset();
  state.activeChatId = data;
  await loadChats().catch(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    await loadChats();
  });
}

async function searchMessages(query) {
  const safeQuery = query.trim().toLowerCase();
  if (!safeQuery) {
    renderEmpty(elements.messageSearchResults, "Введите текст для поиска.");
    return;
  }

  const chatIds = state.chats.map((chat) => chat.id);
  if (!chatIds.length) {
    renderEmpty(elements.messageSearchResults, "Сначала создайте или откройте чат.");
    return;
  }

  let sourceMessages = [];
  try {
    const { data, error } = await state.supabase
      .from("messages")
      .select("*")
      .in("chat_id", chatIds)
      .order("created_at", { ascending: false })
      .limit(250);

    if (error) {
      throw error;
    }

    sourceMessages = data || [];
  } catch (error) {
    console.warn("Поиск перешёл на локальный кэш сообщений:", error);
    sourceMessages = state.allMessages || [];
  }

  const results = sourceMessages
    .filter((message) => getMessageSearchText(message).toLowerCase().includes(safeQuery))
    .slice(0, 40)
    .map((message) => {
      const chat = state.chats.find((item) => item.id === message.chat_id);
      if (!chat) {
        return null;
      }

      return {
        chatId: chat.id,
        messageId: message.id,
        chatTitle: getChatTitle(chat),
        meta: `${getMessageAuthorName(message, chat)} • ${formatTime(message.created_at)}`,
        text: getMessageSearchText(message) || "Стикер",
      };
    })
    .filter(Boolean);

  renderMessageSearchResults(results);
}

async function createSticker() {
  const title = elements.stickerTitleInput.value.trim() || state.pendingStickerFile?.name || "Стикер";
  if (!state.pendingStickerFile) {
    throw new Error("Сначала выберите изображение для стикера.");
  }

  if (!String(state.pendingStickerFile.type || "").startsWith("image/")) {
    throw new Error("Стикер должен быть изображением.");
  }

  const uploaded = await uploadSticker(state.pendingStickerFile);
  const { error } = await state.supabase.from("user_stickers").insert({
    owner_id: state.profile.id,
    title,
    image_url: uploaded.url,
    image_path: uploaded.path,
  });

  if (error) {
    throw error;
  }

  state.pendingStickerFile = null;
  elements.stickerFileInput.value = "";
  elements.stickerTitleInput.value = "";
  await loadStickers();
  elements.stickerStatus.textContent = "Стикер сохранён и готов к отправке.";
}

async function sendSticker(stickerId) {
  const activeChat = getActiveChat();
  const sticker = state.stickers.find((item) => item.id === stickerId);
  if (!activeChat || !sticker || !canSendToChat(activeChat)) {
    return;
  }

  const { error } = await state.supabase.from("messages").insert({
    chat_id: activeChat.id,
    sender_id: state.profile.id,
    content: null,
    sticker_id: sticker.id,
    sticker_url: sticker.image_url,
    sticker_name: sticker.title,
  });

  if (error) {
    throw error;
  }

  await loadChats();
}

async function startChatWithUser(targetId) {
  const existing = state.chats
    .filter((chat) => chat.chat_type === "direct" && chat.partner?.id === targetId)
    .sort((left, right) => {
      const leftTime = left.last_message?.created_at || left.created_at;
      const rightTime = right.last_message?.created_at || right.created_at;
      return new Date(rightTime) - new Date(leftTime);
    })[0];
  if (existing) {
    state.activeChatId = existing.id;
    renderChats();
    renderChatHeader();
    showCachedMessages(existing.id);
    await loadMessages(existing.id);
    return;
  }

  const { data, error } = await state.supabase.rpc("start_direct_chat", { other_user: targetId });
  if (error) {
    throw error;
  }

  state.activeChatId = data;
  await loadChats();
}

async function sendMessage() {
  const activeChat = getActiveChat();
  const content = elements.messageInput.value.trim();
  if (!activeChat || !canSendToChat(activeChat) || (!content && !state.pendingAttachmentFile && !state.editingMessageId)) {
    return;
  }

  if (state.editingMessageId) {
    const { error } = await state.supabase
      .from("messages")
      .update({
        content: content || null,
        edited_at: new Date().toISOString(),
      })
      .eq("id", state.editingMessageId)
      .eq("sender_id", state.profile.id);

    if (error) {
      throw error;
    }

    state.editingMessageId = null;
    elements.messageInput.value = "";
    if (state.localTypingChatId === activeChat.id) {
      sendTypingState(false);
      state.localTypingChatId = null;
      clearLocalTypingTimer();
    }
    renderMessages();
    await loadMessages(activeChat.id);
    return;
  }

  let attachmentPayload = {};
  if (state.pendingAttachmentFile) {
    const uploaded = await uploadAttachment(state.pendingAttachmentFile);
    attachmentPayload = {
      attachment_url: uploaded.url,
      attachment_path: uploaded.path,
      attachment_name: state.pendingAttachmentFile.name,
      attachment_type: state.pendingAttachmentFile.type || "application/octet-stream",
      attachment_size: state.pendingAttachmentFile.size || null,
    };
  }

  const { error } = await state.supabase.from("messages").insert({
    chat_id: activeChat.id,
    sender_id: state.profile.id,
    content: content || null,
    ...attachmentPayload,
  });

  if (error) {
    throw error;
  }

  elements.messageInput.value = "";
  if (state.localTypingChatId === activeChat.id) {
    sendTypingState(false);
    state.localTypingChatId = null;
    clearLocalTypingTimer();
  }
  state.pendingAttachmentFile = null;
  elements.attachmentInput.value = "";
  updateAttachmentStatus();
  await loadChats();
}

async function deleteMessage(messageId) {
  const { error } = await state.supabase
    .from("messages")
    .update({
      content: null,
      attachment_url: null,
      attachment_path: null,
      attachment_name: null,
      attachment_type: null,
      attachment_size: null,
      sticker_id: null,
      sticker_url: null,
      sticker_name: null,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      edited_at: null,
    })
    .eq("id", messageId)
    .eq("sender_id", state.profile.id);

  if (error) {
    throw error;
  }

  if (state.editingMessageId === messageId) {
    state.editingMessageId = null;
    elements.messageInput.value = "";
  }

  await loadMessages(state.activeChatId);
}

function startEditingMessage(messageId) {
  const message = state.activeMessages.find((item) => item.id === messageId && item.sender_id === state.profile?.id && !item.is_deleted);
  if (!message) {
    return;
  }

  state.editingMessageId = messageId;
  elements.messageInput.value = message.content || "";
  elements.messageInput.focus();
  renderMessages();
}

function stopEditingMessage() {
  state.editingMessageId = null;
  elements.messageInput.value = "";
  renderMessages();
}

async function updateProfile() {
  const displayName = elements.profileDisplayNameInput.value.trim();
  if (!displayName) {
    return;
  }

  const payload = {
    id: state.profile.id,
    email: state.profile.email,
    username: state.profile.username,
    display_name: displayName,
    bio: elements.profileBioInput.value.trim(),
    avatar_url: state.profile.avatar_url || null,
    last_seen_at: state.profile.last_seen_at || new Date().toISOString(),
  };

  if (state.pendingAvatarFile) {
    payload.avatar_url = await uploadAvatar(state.pendingAvatarFile);
  }

  const { error } = await state.supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) {
    throw error;
  }

  state.profile = payload;
  state.pendingAvatarFile = null;
  elements.profileAvatarInput.value = "";
  updateProfileView();
  renderChatHeader();
  setStatus("Профиль сохранён.");
}

async function bootstrapSession() {
  const { data, error } = await state.supabase.auth.getSession();
  if (error) {
    throw error;
  }

  await handleSessionChange(data.session);
}

async function init() {
  if (!isConfigReady()) {
    elements.setupBanner.hidden = false;
    elements.authScreen.hidden = false;
    elements.appShell.hidden = true;
    setAuthStatus("Сначала заполните docs/supabase-config.js и выполните SQL-схему в Supabase.", true);
    return;
  }

  state.supabase = createSafeSupabaseClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  showAuthMode("register");
  updateNotificationUI();
  updateAttachmentStatus();
  updateStickerStatus();
  renderEmpty(elements.messageSearchResults, "Введите текст и нажмите «Искать».");
  renderCallHistory();

  state.supabase.auth.onAuthStateChange((_event, session) => {
    Promise.resolve()
      .then(() => handleSessionChange(session))
      .catch((error) => {
        console.error(error);
        setAuthStatus(error.message || "Ошибка авторизации.", true);
      });
  });

  await bootstrapSession();
}

elements.registerTab.addEventListener("click", () => showAuthMode("register"));
elements.loginTab.addEventListener("click", () => showAuthMode("login"));

elements.registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.supabase) {
    return;
  }

  try {
    const email = elements.registerEmail.value.trim();
    const password = elements.registerPassword.value.trim();
    let username = elements.registerUsername.value.trim().replace(/[^a-z0-9_]/g, "_").toLowerCase();
    const displayName = elements.registerDisplayName.value.trim();

    if (username.length < 3 || username.length > 24) {
      throw new Error("Имя пользователя должно содержать от 3 до 24 символов.");
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      throw new Error("Имя пользователя может содержать только буквы, цифры и подчеркивания.");
    }

    const { data, error } = await state.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      const { data: sessionData, error: sessionError } = await state.supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      if (sessionData.session) {
        await ensureProfile(data.user, username, displayName);
      }
    }

    setAuthStatus("Аккаунт создан. Если вход не произойдёт сразу, подтвердите email в Supabase и затем войдите.");
    elements.registerForm.reset();
    showAuthMode("login");
  } catch (error) {
    console.error(error);
    setAuthStatus(getFriendlyError(error, "Не удалось зарегистрироваться."), true);
  }
});

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.supabase) {
    return;
  }

  try {
    const { error } = await state.supabase.auth.signInWithPassword({
      email: elements.loginEmail.value.trim(),
      password: elements.loginPassword.value.trim(),
    });

    if (error) {
      throw error;
    }

    setAuthStatus("Вход выполнен.");
    elements.loginForm.reset();
  } catch (error) {
    console.error(error);
    setAuthStatus(error.message || "Не удалось войти.", true);
  }
});

elements.profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await updateProfile();
  } catch (error) {
    console.error(error);
    setStatus(getFriendlyError(error, "Не удалось сохранить профиль."), true);
  }
});

elements.profileAvatarInput.addEventListener("change", () => {
  const file = elements.profileAvatarInput.files?.[0] || null;
  state.pendingAvatarFile = file;
  updateProfileView();
});

elements.userSearchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await searchUsers(elements.userSearchInput.value);
    setStatus("Поиск выполнен.");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Не удалось найти пользователей.", true);
  }
});

elements.roomForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await createRoom();
    elements.roomStatus.textContent = "Чат создан и открыт.";
    setStatus("Группа или канал созданы.");
  } catch (error) {
    console.error(error);
    elements.roomStatus.textContent = getFriendlyError(error, "Не удалось создать группу или канал.");
    setStatus(getFriendlyError(error, "Не удалось создать группу или канал."), true);
  }
});

elements.messageSearchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await searchMessages(elements.messageSearchInput.value);
    setStatus("Поиск по сообщениям выполнен.");
  } catch (error) {
    console.error(error);
    setStatus(getFriendlyError(error, "Не удалось выполнить поиск по сообщениям."), true);
  }
});

elements.attachmentInput.addEventListener("change", () => {
  state.pendingAttachmentFile = elements.attachmentInput.files?.[0] || null;
  updateAttachmentStatus();
});

elements.messageInput.addEventListener("input", () => {
  handleLocalTypingInput();
});

elements.stickerFileInput.addEventListener("change", () => {
  state.pendingStickerFile = elements.stickerFileInput.files?.[0] || null;
  updateStickerStatus();
});

elements.stickerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await createSticker();
    updateStickerStatus();
    setStatus("Стикер сохранён.");
  } catch (error) {
    console.error(error);
    elements.stickerStatus.textContent = getFriendlyError(error, "Не удалось сохранить стикер.");
    setStatus(getFriendlyError(error, "Не удалось сохранить стикер."), true);
  }
});

elements.searchResults.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-user-id]");
  if (!button) {
    return;
  }

  try {
    await startChatWithUser(button.dataset.userId);
    setStatus("Диалог открыт.");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Не удалось открыть диалог.", true);
  }
});

elements.chatList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-chat-id]");
  if (!button) {
    return;
  }

  if (state.localTypingChatId && state.localTypingChatId !== button.dataset.chatId) {
    sendTypingState(false);
    state.localTypingChatId = null;
    clearLocalTypingTimer();
  }

  state.activeChatId = button.dataset.chatId;
  showCachedMessages(state.activeChatId);
  renderChats();
  renderChatHeader();
  renderStickerGallery();
  subscribeToActiveChat(state.activeChatId);

  try {
    await loadMessages(state.activeChatId);
    renderChats();
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Не удалось загрузить сообщения.", true);
  }
});

elements.chatList.addEventListener("pointerdown", (event) => {
  const button = event.target.closest("[data-chat-id]");
  if (!button || button.dataset.chatId === state.activeChatId) {
    return;
  }

  state.activeChatId = button.dataset.chatId;
  showCachedMessages(state.activeChatId);
  renderChats();
  renderChatHeader();
});

elements.messageSearchResults.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-chat-id][data-message-id]");
  if (!button) {
    return;
  }

  if (state.localTypingChatId && state.localTypingChatId !== button.dataset.chatId) {
    sendTypingState(false);
    state.localTypingChatId = null;
    clearLocalTypingTimer();
  }

  state.activeChatId = button.dataset.chatId;
  showCachedMessages(state.activeChatId);
  renderChats();
  renderChatHeader();
  renderStickerGallery();
  subscribeToActiveChat(state.activeChatId);

  try {
    await loadMessages(state.activeChatId);
    const messageNode = elements.messageList.querySelector(`[data-message-id="${button.dataset.messageId}"]`);
    if (messageNode) {
      messageNode.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    setStatus("Найденное сообщение открыто.");
  } catch (error) {
    console.error(error);
    setStatus(getFriendlyError(error, "Не удалось открыть найденное сообщение."), true);
  }
});

elements.stickerGallery.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-sticker-id]");
  if (!button) {
    return;
  }

  try {
    await sendSticker(button.dataset.stickerId);
    setStatus("Стикер отправлен.");
  } catch (error) {
    console.error(error);
    setStatus(getFriendlyError(error, "Не удалось отправить стикер."), true);
  }
});

elements.chatInfoCard.addEventListener("click", async (event) => {
  const removeButton = event.target.closest("[data-remove-member-id]");
  if (removeButton) {
    try {
      await removeChatMember(removeButton.dataset.removeMemberId);
      setStatus("Участник удалён.");
    } catch (error) {
      console.error(error);
      setStatus(getFriendlyError(error, "Не удалось удалить участника."), true);
    }
    return;
  }

  const button = event.target.closest("[data-toggle-block]");
  if (!button) {
    return;
  }

  try {
    await toggleBlockUser(button.dataset.toggleBlock);
    setStatus("Статус блокировки обновлён.");
  } catch (error) {
    console.error(error);
    setStatus(getFriendlyError(error, "Не удалось изменить статус блокировки."), true);
  }
});

elements.chatInfoCard.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-member-add-form]");
  if (!form) {
    return;
  }

  event.preventDefault();
  const input = form.querySelector('input[name="username"]');

  try {
    await addChatMember(input?.value || "");
    if (input) {
      input.value = "";
    }
    setStatus("Участник добавлен.");
  } catch (error) {
    console.error(error);
    setStatus(getFriendlyError(error, "Не удалось добавить участника."), true);
  }
});

elements.messageList.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-message-id]");
  if (editButton) {
    startEditingMessage(editButton.dataset.editMessageId);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-message-id]");
  if (!deleteButton) {
    return;
  }

  try {
    await deleteMessage(deleteButton.dataset.deleteMessageId);
    setStatus("Сообщение удалено.");
  } catch (error) {
    console.error(error);
    setStatus(getFriendlyError(error, "Не удалось удалить сообщение."), true);
  }
});

elements.cancelEditButton.addEventListener("click", () => {
  stopEditingMessage();
});

elements.composerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await sendMessage();
  } catch (error) {
    console.error(error);
    setStatus(getFriendlyError(error, "Не удалось отправить сообщение."), true);
  }
});

elements.refreshChats.addEventListener("click", async () => {
  try {
    await loadChats();
    setStatus("Диалоги обновлены.");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Не удалось обновить диалоги.", true);
  }
});

elements.refreshMessages.addEventListener("click", async () => {
  try {
    await loadMessages(state.activeChatId);
    renderChats();
    setStatus("Сообщения обновлены.");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Не удалось обновить сообщения.", true);
  }
});

elements.callButton.addEventListener("click", async () => {
  try {
    await startCall();
  } catch (error) {
    console.error(error);
    setStatus(getFriendlyError(error, "Не удалось начать звонок."), true);
    finishCallLocally();
  }
});

elements.toggleMic.addEventListener("click", () => {
  toggleMicrophone();
});

elements.acceptCall.addEventListener("click", async () => {
  try {
    await acceptIncomingCall();
  } catch (error) {
    console.error(error);
    setStatus(getFriendlyError(error, "Не удалось принять звонок."), true);
    finishCallLocally();
  }
});

elements.declineCall.addEventListener("click", async () => {
  try {
    await declineCurrentCall();
  } catch (error) {
    console.error(error);
    finishCallLocally();
  }
});

elements.hangupCall.addEventListener("click", async () => {
  try {
    await hangupCurrentCall();
  } catch (error) {
    console.error(error);
    finishCallLocally();
  }
});

elements.logoutButton.addEventListener("click", async () => {
  try {
    await state.supabase.auth.signOut();
    setStatus("Вы вышли из аккаунта.");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Не удалось выйти.", true);
  }
});

elements.enableNotifications.addEventListener("click", async () => {
  try {
    await requestNotificationPermission();
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Не удалось включить уведомления.", true);
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    updatePresence(true).catch((error) => {
      console.error(error);
    });
  }

  if (document.hidden || !state.activeChatId) {
    return;
  }

  markChatAsRead(state.activeChatId).then(() => {
    renderChats();
    renderMessages();
  }).catch((error) => {
    console.error(error);
  });
});

window.addEventListener("focus", () => {
  updatePresence(true).catch((error) => {
    console.error(error);
  });

  if (!state.activeChatId) {
    return;
  }

  markChatAsRead(state.activeChatId).then(() => {
    renderChats();
    renderMessages();
  }).catch((error) => {
    console.error(error);
  });
});

init().catch((error) => {
  console.error(error);
  setStatus(error.message || "Ошибка инициализации приложения.", true);
});
