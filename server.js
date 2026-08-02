const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const UPLOADS_DIR = path.join(__dirname, "public", "uploads");
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const SOCKET_MAX_BUFFER = 15 * 1024 * 1024;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: SOCKET_MAX_BUFFER
});

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_FILE)) {
    const now = new Date().toISOString();
    const initialState = {
      users: [
        {
          id: "user-system",
          username: "system",
          displayName: "СвойСвязь",
          bio: "Системный аккаунт",
          avatarUrl: null,
          avatarColor: "#BB5A2C",
          createdAt: now,
          lastSeenAt: now
        }
      ],
      chats: [
        {
          id: "chat-welcome",
          type: "group",
          title: "Общий чат",
          description: "Главная комната для всех пользователей",
          memberIds: ["user-system"],
          adminIds: ["user-system"],
          pinnedMessageId: null,
          createdAt: now,
          updatedAt: now
        }
      ],
      messages: [
        {
          id: "msg-welcome",
          chatId: "chat-welcome",
          authorId: "user-system",
          text: "Добро пожаловать в СвойСвязь. Здесь уже есть личные диалоги, группы, поиск, редактирование и удаление сообщений.",
          attachments: [],
          replyToMessageId: null,
          forwardedFromMessageId: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        }
      ],
      memberships: [
        {
          chatId: "chat-welcome",
          userId: "user-system",
          joinedAt: now,
          lastReadAt: now
        }
      ]
    };

    fs.writeFileSync(STORE_FILE, JSON.stringify(initialState, null, 2), "utf8");
  }
}

function loadStore() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
}

let store = loadStore();
let saveTimer = null;
const onlineUsers = new Map();
const callSessions = new Map();

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
  }, 100);
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9_]/gi, "")
    .slice(0, 20);
}

function sanitizeText(value, maxLength = 2000) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function sanitizeFileName(value) {
  return String(value || "file")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .slice(0, 80);
}

function saveDataUrlFile(dataUrl, kind = "file") {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length || buffer.length > MAX_FILE_SIZE) {
    return null;
  }

  const extension = mimeType.split("/")[1]?.split("+")[0] || "bin";
  const fileName = `${kind}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}.${extension}`;
  const targetPath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(targetPath, buffer);

  return {
    url: `/uploads/${fileName}`,
    size: buffer.length,
    mimeType
  };
}

function saveAttachments(attachments) {
  return (attachments || [])
    .slice(0, MAX_ATTACHMENTS)
    .map((item) => {
      const saved = saveDataUrlFile(item.dataUrl, "attachment");

      if (!saved) {
        return null;
      }

      return {
        id: createId("att"),
        name: sanitizeFileName(item.name || "file"),
        type: item.type || saved.mimeType,
        size: saved.size,
        url: saved.url,
        isImage: String(saved.mimeType).startsWith("image/")
      };
    })
    .filter(Boolean);
}

function getUserById(userId) {
  return store.users.find((user) => user.id === userId) || null;
}

function getUserByUsername(username) {
  return store.users.find((user) => user.username === username) || null;
}

function getChatById(chatId) {
  return store.chats.find((chat) => chat.id === chatId) || null;
}

function getMembership(chatId, userId) {
  return store.memberships.find((item) => item.chatId === chatId && item.userId === userId) || null;
}

function getChatMessages(chatId) {
  return store.messages
    .filter((message) => message.chatId === chatId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function getChatMembers(chatId) {
  const chat = getChatById(chatId);

  if (!chat) {
    return [];
  }

  return chat.memberIds
    .map((userId) => getUserById(userId))
    .filter(Boolean)
    .map(serializeUser);
}

function getDirectPeerId(chat, userId) {
  if (!chat || chat.type !== "direct") {
    return null;
  }

  return chat.memberIds.find((memberId) => memberId !== userId) || null;
}

function findCallSessionByUser(userId) {
  for (const session of callSessions.values()) {
    if (session.callerId === userId || session.calleeId === userId) {
      return session;
    }
  }

  return null;
}

function isChatMember(chat, userId) {
  return Boolean(chat && chat.memberIds.includes(userId));
}

function touchChat(chatId) {
  const chat = getChatById(chatId);

  if (chat) {
    chat.updatedAt = new Date().toISOString();
  }
}

function markChatRead(chatId, userId) {
  const membership = getMembership(chatId, userId);

  if (membership) {
    membership.lastReadAt = new Date().toISOString();
  }
}

function upsertUserProfile({ username, displayName }) {
  const safeUsername = normalizeUsername(username);
  const safeDisplayName = sanitizeText(displayName, 40) || safeUsername;

  if (!safeUsername) {
    return { error: "Укажите логин: латиница, кириллица, цифры или _." };
  }

  let user = getUserByUsername(safeUsername);
  const now = new Date().toISOString();

  if (!user) {
      user = {
      id: createId("user"),
      username: safeUsername,
      displayName: safeDisplayName,
      bio: "Новый пользователь СвойСвязь",
      avatarUrl: null,
      avatarColor: ["#BB5A2C", "#3674B5", "#0E9F6E", "#8B5CF6", "#E67E22"][store.users.length % 5],
      createdAt: now,
      lastSeenAt: now
    };
    store.users.push(user);
  } else {
    user.displayName = safeDisplayName;
    user.lastSeenAt = now;
  }

  const welcomeChat = getChatById("chat-welcome");

  if (welcomeChat && !welcomeChat.memberIds.includes(user.id)) {
    welcomeChat.memberIds.push(user.id);
    store.memberships.push({
      chatId: welcomeChat.id,
      userId: user.id,
      joinedAt: now,
      lastReadAt: now
    });
  }

  scheduleSave();
  return { user };
}

function serializeUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl || null,
    avatarColor: user.avatarColor,
    lastSeenAt: user.lastSeenAt,
    isOnline: onlineUsers.has(user.id)
  };
}

function serializeMessage(message, currentUserId) {
  const author = getUserById(message.authorId);
  const replyTo = message.replyToMessageId
    ? store.messages.find((item) => item.id === message.replyToMessageId) || null
    : null;
  const forwardedFrom = message.forwardedFromMessageId
    ? store.messages.find((item) => item.id === message.forwardedFromMessageId) || null
    : null;
  return {
    id: message.id,
    chatId: message.chatId,
    text: message.deletedAt ? "Сообщение удалено" : message.text,
    attachments: message.deletedAt ? [] : (message.attachments || []),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    deletedAt: message.deletedAt,
    isEdited: Boolean(message.updatedAt && message.updatedAt !== message.createdAt && !message.deletedAt),
    canEdit: message.authorId === currentUserId && !message.deletedAt,
    canDelete: message.authorId === currentUserId && !message.deletedAt,
    canPin: !message.deletedAt,
    replyTo: replyTo
      ? {
          id: replyTo.id,
          text: replyTo.deletedAt ? "Сообщение удалено" : replyTo.text,
          authorName: getUserById(replyTo.authorId)?.displayName || "Пользователь"
        }
      : null,
    forwardedFrom: forwardedFrom
      ? {
          messageId: forwardedFrom.id,
          authorName: getUserById(forwardedFrom.authorId)?.displayName || "Пользователь"
        }
      : null,
    author: author ? serializeUser(author) : null
  };
}

function getUnreadCount(chatId, userId) {
  const membership = getMembership(chatId, userId);

  if (!membership) {
    return 0;
  }

  const lastReadAt = new Date(membership.lastReadAt || 0).getTime();

  return getChatMessages(chatId).filter((message) => {
    if (message.deletedAt || message.authorId === userId) {
      return false;
    }

    return new Date(message.createdAt).getTime() > lastReadAt;
  }).length;
}

function chatTitleForUser(chat, currentUserId) {
  if (chat.type === "direct") {
    const peerId = chat.memberIds.find((id) => id !== currentUserId) || currentUserId;
    const peer = getUserById(peerId);
    return peer ? peer.displayName : "Личный чат";
  }

  return chat.title;
}

function serializeChat(chat, currentUserId) {
  const messages = getChatMessages(chat.id);
  const lastMessage = messages[messages.length - 1] || null;
  const members = getChatMembers(chat.id);
  const pinnedMessage = chat.pinnedMessageId
    ? store.messages.find((item) => item.id === chat.pinnedMessageId) || null
    : null;

  return {
    id: chat.id,
    type: chat.type,
    title: chatTitleForUser(chat, currentUserId),
    rawTitle: chat.title,
    description: chat.description,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    unreadCount: getUnreadCount(chat.id, currentUserId),
    members,
    memberCount: members.length,
    canManage: chat.adminIds.includes(currentUserId),
    canPost: chat.type !== "channel" || chat.adminIds.includes(currentUserId),
    adminIds: [...chat.adminIds],
    pinnedMessage: pinnedMessage ? serializeMessage(pinnedMessage, currentUserId) : null,
    lastMessage: lastMessage ? serializeMessage(lastMessage, currentUserId) : null
  };
}

function getUserChats(userId) {
  return store.chats
    .filter((chat) => chat.memberIds.includes(userId))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((chat) => serializeChat(chat, userId));
}

function getDirectory(forUserId) {
  return store.users
    .filter((user) => user.id !== "user-system" && user.id !== forUserId)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ru"))
    .map((user) => serializeUser(user));
}

function getChatPayload(chatId, userId) {
  const chat = getChatById(chatId);

  if (!chat || !isChatMember(chat, userId)) {
    return null;
  }

  markChatRead(chatId, userId);
  scheduleSave();

  return {
    chat: serializeChat(chat, userId),
    messages: getChatMessages(chatId).map((message) => serializeMessage(message, userId)),
    members: getChatMembers(chatId)
  };
}

function updateUserProfile(userId, payload) {
  const user = getUserById(userId);

  if (!user) {
    return { error: "Пользователь не найден." };
  }

  const displayName = sanitizeText(payload.displayName, 40);
  const bio = sanitizeText(payload.bio, 160);

  if (!displayName) {
    return { error: "Введите отображаемое имя." };
  }

  user.displayName = displayName;
  user.bio = bio || "Без описания";

  if (payload.avatarDataUrl) {
    const avatar = saveDataUrlFile(payload.avatarDataUrl, "avatar");

    if (!avatar) {
      return { error: "Не удалось сохранить аватар. Проверьте размер файла до 5 МБ." };
    }

    user.avatarUrl = avatar.url;
  }

  user.lastSeenAt = new Date().toISOString();
  scheduleSave();
  return { user };
}

function emitSidebar(userId) {
  io.to(`user:${userId}`).emit("sidebar:update", {
    chats: getUserChats(userId),
    directory: getDirectory(userId)
  });
}

function emitChatUpdate(chatId) {
  const chat = getChatById(chatId);

  if (!chat) {
    return;
  }

  for (const memberId of chat.memberIds) {
    io.to(`user:${memberId}`).emit("chat:summary", serializeChat(chat, memberId));
  }
}

function emitPresence() {
  for (const user of store.users) {
    if (user.id === "user-system") {
      continue;
    }

    io.to(`user:${user.id}`).emit("directory:update", getDirectory(user.id));
    emitSidebar(user.id);
  }
}

function createDirectChat(userAId, userBId) {
  const existing = store.chats.find((chat) => {
    if (chat.type !== "direct") {
      return false;
    }

    return [...chat.memberIds].sort().join(":") === [userAId, userBId].sort().join(":");
  });

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const chat = {
    id: createId("chat"),
    type: "direct",
    title: "Личный чат",
    description: "Личный диалог",
    memberIds: [userAId, userBId],
    adminIds: [userAId],
    pinnedMessageId: null,
    createdAt: now,
    updatedAt: now
  };

  store.chats.push(chat);
  store.memberships.push(
    {
      chatId: chat.id,
      userId: userAId,
      joinedAt: now,
      lastReadAt: now
    },
    {
      chatId: chat.id,
      userId: userBId,
      joinedAt: now,
      lastReadAt: now
    }
  );

  scheduleSave();
  return chat;
}

function createGroupChat(ownerId, title, memberIds) {
  const safeTitle = sanitizeText(title, 40);

  if (!safeTitle) {
    return { error: "Введите название группы." };
  }

  const members = [...new Set([ownerId, ...memberIds])].filter((userId) => getUserById(userId));
  const now = new Date().toISOString();
  const chat = {
    id: createId("chat"),
    type: "group",
    title: safeTitle,
    description: "Групповой чат",
    memberIds: members,
    adminIds: [ownerId],
    pinnedMessageId: null,
    createdAt: now,
    updatedAt: now
  };

  store.chats.push(chat);
  store.memberships.push(
    ...members.map((userId) => ({
      chatId: chat.id,
      userId,
      joinedAt: now,
      lastReadAt: userId === ownerId ? now : 0
    }))
  );

  scheduleSave();
  return { chat };
}

function createChannel(ownerId, title, description, memberIds) {
  const safeTitle = sanitizeText(title, 40);
  const safeDescription = sanitizeText(description, 120) || "Канал";

  if (!safeTitle) {
    return { error: "Введите название канала." };
  }

  const members = [...new Set([ownerId, ...memberIds])].filter((userId) => getUserById(userId));
  const now = new Date().toISOString();
  const chat = {
    id: createId("chat"),
    type: "channel",
    title: safeTitle,
    description: safeDescription,
    memberIds: members,
    adminIds: [ownerId],
    pinnedMessageId: null,
    createdAt: now,
    updatedAt: now
  };

  store.chats.push(chat);
  store.memberships.push(
    ...members.map((userId) => ({
      chatId: chat.id,
      userId,
      joinedAt: now,
      lastReadAt: userId === ownerId ? now : 0
    }))
  );

  scheduleSave();
  return { chat };
}

function broadcastChatState(chatId) {
  const chat = getChatById(chatId);

  if (!chat) {
    return;
  }

  for (const memberId of chat.memberIds) {
    emitSidebar(memberId);
    io.to(`user:${memberId}`).emit("chat:summary", serializeChat(chat, memberId));
  }
}

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  socket.on("session:start", ({ username, displayName }) => {
    const result = upsertUserProfile({ username, displayName });

    if (result.error) {
      socket.emit("app:error", result.error);
      return;
    }

    const user = result.user;
    onlineUsers.set(user.id, socket.id);
    socket.data.userId = user.id;
    socket.join(`user:${user.id}`);

    socket.emit("session:ready", {
      currentUser: serializeUser(user),
      chats: getUserChats(user.id),
      directory: getDirectory(user.id)
    });

    emitPresence();
  });

  socket.on("profile:update", (payload) => {
    const userId = socket.data.userId;
    const result = updateUserProfile(userId, payload);

    if (result.error) {
      socket.emit("app:error", result.error);
      return;
    }

    socket.emit("profile:updated", {
      currentUser: serializeUser(result.user)
    });
    emitPresence();
  });

  socket.on("chat:open", ({ chatId }) => {
    const userId = socket.data.userId;
    const payload = getChatPayload(chatId, userId);

    if (!payload) {
      socket.emit("app:error", "Чат не найден или недоступен.");
      return;
    }

    socket.emit("chat:opened", payload);
    emitSidebar(userId);
  });

  socket.on("chat:create-direct", ({ targetUsername }) => {
    const userId = socket.data.userId;
    const target = getUserByUsername(normalizeUsername(targetUsername));

    if (!userId || !target) {
      socket.emit("app:error", "Пользователь не найден.");
      return;
    }

    const chat = createDirectChat(userId, target.id);
    emitSidebar(userId);
    emitSidebar(target.id);
    socket.emit("chat:direct-ready", { chatId: chat.id });
  });

  socket.on("chat:create-group", ({ title, memberUsernames }) => {
    const userId = socket.data.userId;
    const memberIds = (memberUsernames || [])
      .map((username) => getUserByUsername(normalizeUsername(username)))
      .filter(Boolean)
      .map((user) => user.id);

    const result = createGroupChat(userId, title, memberIds);

    if (result.error) {
      socket.emit("app:error", result.error);
      return;
    }

    for (const memberId of result.chat.memberIds) {
      emitSidebar(memberId);
    }

    socket.emit("chat:group-ready", { chatId: result.chat.id });
  });

  socket.on("chat:create-channel", ({ title, description, memberUsernames }) => {
    const userId = socket.data.userId;
    const memberIds = (memberUsernames || [])
      .map((username) => getUserByUsername(normalizeUsername(username)))
      .filter(Boolean)
      .map((user) => user.id);

    const result = createChannel(userId, title, description, memberIds);

    if (result.error) {
      socket.emit("app:error", result.error);
      return;
    }

    for (const memberId of result.chat.memberIds) {
      emitSidebar(memberId);
    }

    socket.emit("chat:channel-ready", { chatId: result.chat.id });
  });

  socket.on("chat:promote-admin", ({ chatId, targetUserId }) => {
    const userId = socket.data.userId;
    const chat = getChatById(chatId);

    if (!chat || !chat.adminIds.includes(userId) || !chat.memberIds.includes(targetUserId)) {
      socket.emit("app:error", "Нельзя назначить администратора.");
      return;
    }

    if (!chat.adminIds.includes(targetUserId)) {
      chat.adminIds.push(targetUserId);
      touchChat(chatId);
      scheduleSave();
    }

    for (const memberId of chat.memberIds) {
      io.to(`user:${memberId}`).emit("chat:summary", serializeChat(chat, memberId));
      emitSidebar(memberId);
    }
  });

  socket.on("message:send", ({ chatId, text, attachments, replyToMessageId }) => {
    const userId = socket.data.userId;
    const chat = getChatById(chatId);
    const safeText = sanitizeText(text);
    const savedAttachments = saveAttachments(attachments);
    const replyToMessage = replyToMessageId
      ? store.messages.find((item) => item.id === replyToMessageId && item.chatId === chatId) || null
      : null;

    if (!userId || !chat || !isChatMember(chat, userId)) {
      return;
    }

    if (chat.type === "channel" && !chat.adminIds.includes(userId)) {
      socket.emit("app:error", "В канале публиковать сообщения могут только администраторы.");
      return;
    }

    if (!safeText && !savedAttachments.length) {
      return;
    }

    const now = new Date().toISOString();
    const message = {
      id: createId("msg"),
      chatId,
      authorId: userId,
      text: safeText,
      attachments: savedAttachments,
      replyToMessageId: replyToMessage ? replyToMessage.id : null,
      forwardedFromMessageId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    store.messages.push(message);
    touchChat(chatId);
    markChatRead(chatId, userId);
    scheduleSave();

    for (const memberId of chat.memberIds) {
      io.to(`user:${memberId}`).emit("message:new", serializeMessage(message, memberId));
    }

    emitChatUpdate(chatId);
    for (const memberId of chat.memberIds) {
      emitSidebar(memberId);
    }
  });

  socket.on("message:edit", ({ chatId, messageId, text }) => {
    const userId = socket.data.userId;
    const message = store.messages.find((item) => item.id === messageId && item.chatId === chatId);
    const chat = getChatById(chatId);
    const safeText = sanitizeText(text);

    if (!userId || !chat || !message || message.authorId !== userId || !safeText || message.deletedAt) {
      return;
    }

    message.text = safeText;
    message.updatedAt = new Date().toISOString();
    touchChat(chatId);
    scheduleSave();

    for (const memberId of chat.memberIds) {
      io.to(`user:${memberId}`).emit("message:updated", serializeMessage(message, memberId));
    }

    emitChatUpdate(chatId);
    for (const memberId of chat.memberIds) {
      emitSidebar(memberId);
    }
  });

  socket.on("message:delete", ({ chatId, messageId }) => {
    const userId = socket.data.userId;
    const message = store.messages.find((item) => item.id === messageId && item.chatId === chatId);
    const chat = getChatById(chatId);

    if (!userId || !chat || !message || message.authorId !== userId || message.deletedAt) {
      return;
    }

    message.deletedAt = new Date().toISOString();
    message.updatedAt = message.deletedAt;
    touchChat(chatId);
    scheduleSave();

    for (const memberId of chat.memberIds) {
      io.to(`user:${memberId}`).emit("message:updated", serializeMessage(message, memberId));
    }

    emitChatUpdate(chatId);
    for (const memberId of chat.memberIds) {
      emitSidebar(memberId);
    }
  });

  socket.on("message:forward", ({ sourceChatId, messageId, targetChatId }) => {
    const userId = socket.data.userId;
    const sourceChat = getChatById(sourceChatId);
    const targetChat = getChatById(targetChatId);
    const originalMessage = store.messages.find((item) => item.id === messageId && item.chatId === sourceChatId);

    if (!userId || !sourceChat || !targetChat || !originalMessage) {
      socket.emit("app:error", "Не удалось переслать сообщение.");
      return;
    }

    if (!isChatMember(sourceChat, userId) || !isChatMember(targetChat, userId)) {
      socket.emit("app:error", "Нет доступа к одному из чатов.");
      return;
    }

    if (targetChat.type === "channel" && !targetChat.adminIds.includes(userId)) {
      socket.emit("app:error", "В этот канал пересылать сообщения могут только администраторы.");
      return;
    }

    const now = new Date().toISOString();
    const message = {
      id: createId("msg"),
      chatId: targetChatId,
      authorId: userId,
      text: originalMessage.deletedAt ? "Пересланное сообщение было удалено." : originalMessage.text,
      attachments: originalMessage.attachments || [],
      replyToMessageId: null,
      forwardedFromMessageId: originalMessage.id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    store.messages.push(message);
    touchChat(targetChatId);
    markChatRead(targetChatId, userId);
    scheduleSave();

    for (const memberId of targetChat.memberIds) {
      io.to(`user:${memberId}`).emit("message:new", serializeMessage(message, memberId));
    }

    broadcastChatState(targetChatId);
  });

  socket.on("message:pin", ({ chatId, messageId }) => {
    const userId = socket.data.userId;
    const chat = getChatById(chatId);
    const message = store.messages.find((item) => item.id === messageId && item.chatId === chatId);

    if (!chat || !message || !chat.adminIds.includes(userId)) {
      socket.emit("app:error", "Закрепить сообщение может только администратор.");
      return;
    }

    chat.pinnedMessageId = message.id;
    touchChat(chatId);
    scheduleSave();
    broadcastChatState(chatId);
  });

  socket.on("message:unpin", ({ chatId }) => {
    const userId = socket.data.userId;
    const chat = getChatById(chatId);

    if (!chat || !chat.adminIds.includes(userId)) {
      socket.emit("app:error", "Открепить сообщение может только администратор.");
      return;
    }

    chat.pinnedMessageId = null;
    touchChat(chatId);
    scheduleSave();
    broadcastChatState(chatId);
  });

  socket.on("call:start", ({ chatId, mode }) => {
    const userId = socket.data.userId;
    const chat = getChatById(chatId);
    const peerId = getDirectPeerId(chat, userId);
    const peer = getUserById(peerId);
    const peerSocketId = onlineUsers.get(peerId);

    if (!userId || !chat || !peerId || !peer || !isChatMember(chat, userId)) {
      socket.emit("app:error", "Позвонить можно только в личном чате.");
      return;
    }

    if (!peerSocketId) {
      socket.emit("app:error", "Собеседник сейчас не в сети.");
      return;
    }

    if (findCallSessionByUser(userId) || findCallSessionByUser(peerId)) {
      socket.emit("app:error", "Один из участников уже в звонке.");
      return;
    }

    const sessionId = createId("call");
    const session = {
      id: sessionId,
      chatId,
      callerId: userId,
      calleeId: peerId,
      mode: mode === "video" ? "video" : "audio"
    };

    callSessions.set(sessionId, session);

    socket.emit("call:outgoing", {
      sessionId,
      chatId,
      mode: session.mode,
      targetUser: serializeUser(peer)
    });

    io.to(`user:${peerId}`).emit("call:incoming", {
      sessionId,
      chatId,
      mode: session.mode,
      fromUser: serializeUser(getUserById(userId))
    });
  });

  socket.on("call:accept", ({ sessionId, chatId }) => {
    const userId = socket.data.userId;
    const session = callSessions.get(sessionId);

    if (!session || session.chatId !== chatId || session.calleeId !== userId) {
      socket.emit("app:error", "Звонок уже недоступен.");
      return;
    }

    io.to(`user:${session.callerId}`).emit("call:accepted", { sessionId, chatId });
  });

  socket.on("call:decline", ({ sessionId, chatId }) => {
    const userId = socket.data.userId;
    const session = callSessions.get(sessionId);

    if (!session || session.chatId !== chatId || ![session.callerId, session.calleeId].includes(userId)) {
      return;
    }

    const targetUserId = session.callerId === userId ? session.calleeId : session.callerId;
    io.to(`user:${targetUserId}`).emit("call:declined", {
      sessionId,
      reason: "Собеседник отклонил звонок."
    });
    callSessions.delete(sessionId);
  });

  socket.on("call:end", ({ sessionId, chatId }) => {
    const userId = socket.data.userId;
    const session = callSessions.get(sessionId);

    if (!session || session.chatId !== chatId || ![session.callerId, session.calleeId].includes(userId)) {
      return;
    }

    const targetUserId = session.callerId === userId ? session.calleeId : session.callerId;
    io.to(`user:${targetUserId}`).emit("call:ended", {
      sessionId,
      reason: "Собеседник завершил звонок."
    });
    callSessions.delete(sessionId);
  });

  socket.on("webrtc:signal", ({ sessionId, chatId, targetUserId, payload }) => {
    const userId = socket.data.userId;
    const session = callSessions.get(sessionId);

    if (!session || session.chatId !== chatId) {
      return;
    }

    const participants = [session.callerId, session.calleeId];

    if (!participants.includes(userId) || !participants.includes(targetUserId) || userId === targetUserId) {
      return;
    }

    io.to(`user:${targetUserId}`).emit("webrtc:signal", {
      sessionId,
      chatId,
      fromUserId: userId,
      payload
    });
  });

  socket.on("chat:typing", ({ chatId, isTyping }) => {
    const userId = socket.data.userId;
    const user = getUserById(userId);
    const chat = getChatById(chatId);

    if (!user || !chat || !isChatMember(chat, userId) || chat.type === "channel") {
      return;
    }

    socket.to(chatId).emit("chat:typing", {
      chatId,
      user: serializeUser(user),
      isTyping: Boolean(isTyping)
    });
  });

  socket.on("chat:join-room", ({ chatId }) => {
    const userId = socket.data.userId;
    const chat = getChatById(chatId);

    if (chat && isChatMember(chat, userId)) {
      socket.join(chatId);
    }
  });

  socket.on("chat:leave-room", ({ chatId }) => {
    socket.leave(chatId);
  });

  socket.on("disconnect", () => {
    const userId = socket.data.userId;
    const user = getUserById(userId);
    const activeCall = findCallSessionByUser(userId);

    if (!user) {
      return;
    }

    if (activeCall) {
      const targetUserId = activeCall.callerId === userId ? activeCall.calleeId : activeCall.callerId;
      io.to(`user:${targetUserId}`).emit("call:ended", {
        sessionId: activeCall.id,
        reason: "Звонок завершён из-за потери соединения."
      });
      callSessions.delete(activeCall.id);
    }

    user.lastSeenAt = new Date().toISOString();
    onlineUsers.delete(userId);
    scheduleSave();
    emitPresence();
  });
});

server.listen(PORT, () => {
  console.log(`SvoySvyaz server started on http://localhost:${PORT}`);
});
