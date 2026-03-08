const {
  app,
  BrowserWindow,
  Notification,
  ipcMain,
  systemPreferences,
  nativeImage,
  session,
} = require("electron");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const { createWindowStateStore } = require("./state");
const { configureSessionSecurity, enforceUrlPolicy } = require("./security");
const { setupMenus } = require("./menus");
const { isNavigationAbortError, safeLoadUrl } = require("./navigation");

let mainWindow;
const lastNotifiedPreviewByConversation = new Map();
const avatarIconCache = new Map();
let isNormalizingMainWindowUrl = false;
let isAwaitingLogoutLanding = false;
let logoutLandingTimeoutId = null;

function isFacebookLoggedOutLandingUrl(urlString) {
  if (typeof urlString !== "string" || !urlString) {
    return false;
  }

  try {
    const parsedUrl = new URL(urlString);
    const isFacebookHost =
      parsedUrl.hostname === "facebook.com" ||
      parsedUrl.hostname === "www.facebook.com";

    if (!isFacebookHost) {
      return false;
    }

    const pathname = (parsedUrl.pathname || "").toLowerCase();
    const stype = (parsedUrl.searchParams.get("stype") || "").toLowerCase();
    return pathname === "/" && stype === "lo";
  } catch {
    return false;
  }
}

function markLogoutInitiated() {
  isAwaitingLogoutLanding = true;

  if (logoutLandingTimeoutId !== null) {
    clearTimeout(logoutLandingTimeoutId);
  }

  // Clear stale pending state if logout does not navigate as expected.
  logoutLandingTimeoutId = setTimeout(() => {
    logoutLandingTimeoutId = null;
    isAwaitingLogoutLanding = false;
  }, 30000);
}

function clearLogoutInitiated() {
  isAwaitingLogoutLanding = false;

  if (logoutLandingTimeoutId !== null) {
    clearTimeout(logoutLandingTimeoutId);
    logoutLandingTimeoutId = null;
  }
}

async function handlePostLogoutLanding(urlString) {
  if (!isAwaitingLogoutLanding) {
    return;
  }

  if (!isFacebookLoggedOutLandingUrl(urlString)) {
    return;
  }

  clearLogoutInitiated();

  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  await safeLoadUrl(mainWindow, config.MESSAGES_URL);
}

function shouldNormalizeMessagesUrl(urlString) {
  if (typeof urlString !== "string" || !urlString) {
    return false;
  }

  try {
    const parsedUrl = new URL(urlString);
    const isFacebookHost =
      parsedUrl.hostname === "facebook.com" ||
      parsedUrl.hostname === "www.facebook.com";

    if (!isFacebookHost) {
      return false;
    }

    return /^\/messages\/(?:e2ee\/)?t\/[^/]+\/?$/.test(parsedUrl.pathname);
  } catch {
    return false;
  }
}

async function normalizeMainWindowMessagesUrl(urlString) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (isNormalizingMainWindowUrl) {
    return;
  }

  if (!shouldNormalizeMessagesUrl(urlString)) {
    return;
  }

  if (mainWindow.webContents.getURL() === config.MESSAGES_INBOX_URL) {
    return;
  }

  isNormalizingMainWindowUrl = true;

  try {
    await safeLoadUrl(mainWindow, config.MESSAGES_INBOX_URL);
  } finally {
    isNormalizingMainWindowUrl = false;
  }
}

const windowStateStore = createWindowStateStore({
  app,
  defaults: {
    width: config.WINDOW_DEFAULT_WIDTH,
    height: config.WINDOW_DEFAULT_HEIGHT,
  },
});

function createMainWindowOptions() {
  const savedState = windowStateStore.loadState();
  const iconPath = path.join(__dirname, "..", config.WINDOW_ICON_RELATIVE_PATH);

  const options = {
    width: savedState.width,
    height: savedState.height,
    minWidth: config.WINDOW_MIN_WIDTH,
    minHeight: config.WINDOW_MIN_HEIGHT,
    x: savedState.x,
    y: savedState.y,
    title: config.WINDOW_APP_NAME,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    backgroundColor: config.WINDOW_BACKGROUND_COLOR,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: config.WEB_PREF_CONTEXT_ISOLATION,
      nodeIntegration: config.WEB_PREF_NODE_INTEGRATION,
      sandbox: config.WEB_PREF_SANDBOX,
      spellcheck: config.WEB_PREF_SPELLCHECK,
      backgroundThrottling: config.WEB_PREF_BACKGROUND_THROTTLING,
    },
  };

  if (!Number.isFinite(savedState.x) || !Number.isFinite(savedState.y)) {
    delete options.x;
    delete options.y;
  }

  return {
    options,
    isMaximized: savedState.isMaximized,
  };
}

function updateDockAndTaskbarBadge(count) {
  app.setBadgeCount(count);

  if (config.IS_MAC && app.dock) {
    app.dock.setBadge(count > 0 ? String(count) : "");
  }
}

function buildPreviewKey(preview) {
  if (!preview) {
    return "";
  }

  const sender = typeof preview.sender === "string" ? preview.sender : "";
  const text = typeof preview.text === "string" ? preview.text : "";
  const conversationId =
    typeof preview.conversationId === "string" ? preview.conversationId : "";

  return `${conversationId}|${sender}|${text}`;
}

function buildConversationKey(preview) {
  if (!preview) {
    return "";
  }

  const conversationPath =
    typeof preview.conversationPath === "string"
      ? preview.conversationPath.trim()
      : "";
  if (conversationPath) {
    return conversationPath;
  }

  const conversationId =
    typeof preview.conversationId === "string"
      ? preview.conversationId.trim()
      : "";
  if (conversationId) {
    return `${config.CONVERSATION_KEY_ID_PREFIX}${conversationId}`;
  }

  const sender =
    typeof preview.sender === "string" ? preview.sender.trim() : "";
  return sender ? `${config.CONVERSATION_KEY_SENDER_PREFIX}${sender}` : "";
}

async function getAvatarIcon(avatarUrl) {
  if (!avatarUrl || !nativeImage) {
    return null;
  }

  if (avatarIconCache.has(avatarUrl)) {
    return avatarIconCache.get(avatarUrl);
  }

  try {
    const response = await fetch(avatarUrl);
    if (!response.ok) {
      avatarIconCache.set(avatarUrl, null);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const icon = nativeImage.createFromBuffer(buffer);
    if (!icon || icon.isEmpty()) {
      avatarIconCache.set(avatarUrl, null);
      return null;
    }

    const resizedIcon = icon.resize({
      width: config.AVATAR_ICON_SIZE,
      height: config.AVATAR_ICON_SIZE,
    });
    avatarIconCache.set(avatarUrl, resizedIcon);
    return resizedIcon;
  } catch {
    avatarIconCache.set(avatarUrl, null);
    return null;
  }
}

async function notifyNewMessage(preview) {
  if (!preview || !Notification.isSupported()) {
    return;
  }

  const previewKey = buildPreviewKey(preview);
  const conversationKey = buildConversationKey(preview);
  const lastNotifiedForConversation =
    conversationKey && lastNotifiedPreviewByConversation.has(conversationKey)
      ? lastNotifiedPreviewByConversation.get(conversationKey)
      : "";

  if (previewKey && previewKey === lastNotifiedForConversation) {
    return;
  }

  if (conversationKey && previewKey) {
    lastNotifiedPreviewByConversation.set(conversationKey, previewKey);
    if (
      lastNotifiedPreviewByConversation.size > config.MAX_NOTIFIED_CONVERSATIONS
    ) {
      const firstKey = lastNotifiedPreviewByConversation.keys().next().value;
      if (firstKey) {
        lastNotifiedPreviewByConversation.delete(firstKey);
      }
    }
  }

  if (mainWindow && mainWindow.isFocused()) {
    return;
  }

  const sender =
    typeof preview.sender === "string"
      ? preview.sender.trim()
      : config.DEFAULT_NOTIFICATION_TITLE;
  const text =
    typeof preview.text === "string"
      ? preview.text.trim()
      : config.DEFAULT_NOTIFICATION_BODY;

  const options = {
    title: sender,
    body: text,
  };

  const avatarUrl =
    typeof preview.avatarUrl === "string" ? preview.avatarUrl.trim() : "";
  if (avatarUrl) {
    const icon = await getAvatarIcon(avatarUrl);
    if (icon) {
      if (config.IS_MAC) {
        options.contentImage = icon;
      } else {
        options.icon = icon;
      }
    }
  }

  const notification = new Notification(options);
  notification.on("click", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.show();
    mainWindow.focus();

    const conversationId =
      preview && preview.conversationId ? preview.conversationId : null;
    const conversationPath =
      preview && preview.conversationPath ? preview.conversationPath : null;

    if (conversationPath) {
      mainWindow.webContents.send("host:navigate-to-conversation", {
        conversationPath,
        conversationId,
      });
      return;
    }

    if (conversationId) {
      mainWindow.webContents.send("host:navigate-to-conversation", {
        conversationPath: `${config.E2EE_THREAD_PATH_PREFIX}${conversationId}`,
        conversationId,
      });
    }
  });

  notification.show();
}

function triggerNotificationPermission() {
  if (!Notification.isSupported()) {
    return;
  }

  if (Notification.permission !== "granted") {
    try {
      Notification.requestPermission();
    } catch {}
  }
}

function createMainWindow() {
  const { options, isMaximized } = createMainWindowOptions();
  mainWindow = new BrowserWindow(options);
  windowStateStore.attach(mainWindow);

  mainWindow.loadURL(config.MESSAGES_URL).catch((error) => {
    if (!isNavigationAbortError(error)) {
      console.error("Failed to load messages URL:", error);
    }
  });

  enforceUrlPolicy(mainWindow.webContents);

  mainWindow.webContents.on("did-create-window", (childWindow) => {
    enforceUrlPolicy(childWindow.webContents);

    childWindow.on("page-title-updated", (event, title) => {
      if (typeof title === "string") {
        event.preventDefault();
        if (title.includes("Facebook")) {
          title = config.WINDOW_APP_NAME;
        } else if (title.includes("Messenger")) {
          title = title.replace("Messenger", config.WINDOW_APP_NAME);
        }
        childWindow.setTitle(title);
      }
    });
  });

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.send("host:started");
  });

  mainWindow.webContents.on("did-navigate", (_event, url) => {
    normalizeMainWindowMessagesUrl(url).catch((error) => {
      console.error("Failed to normalize messages URL:", error);
    });

    handlePostLogoutLanding(url).catch((error) => {
      console.error("Failed to load messages URL after logout:", error);
    });
  });

  if (isMaximized) {
    mainWindow.maximize();
  }

  setupMenus();

  mainWindow.on("page-title-updated", (event, title) => {
    event.preventDefault();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  configureSessionSecurity({
    session: session.defaultSession,
    systemPreferences,
  });

  createMainWindow();

  triggerNotificationPermission();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (!config.IS_MAC) {
    app.quit();
  }
});

app.on("before-quit", () => {
  updateDockAndTaskbarBadge(0);
});

ipcMain.on("host:message-preview", (_event, preview, unreadRowCount) => {
  if (!preview || typeof preview !== "object") {
    return;
  }

  notifyNewMessage(preview);
  updateDockAndTaskbarBadge(unreadRowCount || 0);
});

ipcMain.on("host:unread-count", (_event, unreadRowCount) => {
  updateDockAndTaskbarBadge(unreadRowCount || 0);
});

ipcMain.on("host:reload-messages-url", async (event) => {
  try {
    const sourceWindow = BrowserWindow.fromWebContents(event.sender);
    const targetWindow =
      sourceWindow && !sourceWindow.isDestroyed()
        ? sourceWindow
        : BrowserWindow.getFocusedWindow();

    if (!targetWindow) {
      return;
    }

    await safeLoadUrl(targetWindow, config.MESSAGES_URL);
  } catch (error) {
    console.error("Failed to reload messages URL:", error);
  }
});

ipcMain.on("host:logout-initiated", () => {
  markLogoutInitiated();
});
