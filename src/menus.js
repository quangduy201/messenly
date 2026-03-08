const { Menu, BrowserWindow, shell } = require("electron");
const {
  MESSAGES_URL,
  PROFILE_URL,
  GITHUB_URL,
  REPORT_ISSUE_URL,
  IS_MAC,
  IS_DEVELOPMENT,
} = require("./config");
const { safeLoadUrl } = require("./navigation");

const NEW_MESSAGE_PATH = "/messages/new";

function getFocusedWindow() {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow || focusedWindow.isDestroyed()) {
    return null;
  }

  return focusedWindow;
}

async function navigateFocusedWindow(url) {
  const focusedWindow = getFocusedWindow();
  if (!focusedWindow) {
    return;
  }

  await safeLoadUrl(focusedWindow, url);
}

function requestLogoutFocusedWindow() {
  const focusedWindow = getFocusedWindow();
  if (!focusedWindow) {
    return;
  }

  focusedWindow.webContents.send("host:log-out");
}

function openPreferencesFocusedWindow() {
  const focusedWindow = getFocusedWindow();
  if (!focusedWindow) {
    return;
  }

  focusedWindow.webContents.send("host:open-preferences");
}

function openHelpCenterFocusedWindow() {
  const focusedWindow = getFocusedWindow();
  if (!focusedWindow) {
    return;
  }

  focusedWindow.webContents.send("host:open-help-center");
}

function navigateFocusedWindowInPage(payload) {
  const focusedWindow = getFocusedWindow();
  if (!focusedWindow) {
    return;
  }

  focusedWindow.webContents.send("host:navigate-to-conversation", payload);
}

function buildMenuTemplate() {
  const appMenu = IS_MAC
    ? [
        {
          label: "Messenly",
          submenu: [
            { role: "about" },
            { type: "separator" },
            {
              label: "Settings...",
              accelerator: "Cmd+,",
              click: () => {
                openPreferencesFocusedWindow();
              },
            },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ]
    : [];

  const fileMenu = {
    label: "File",
    submenu: [
      {
        label: "New Message",
        accelerator: IS_MAC ? "Cmd+N" : "Ctrl+N",
        click: () => {
          navigateFocusedWindowInPage({
            conversationPath: NEW_MESSAGE_PATH,
          });
        },
      },
      ...(!IS_MAC
        ? [
            {
              label: "Preferences",
              accelerator: "Ctrl+,",
              click: () => {
                openPreferencesFocusedWindow();
              },
            },
          ]
        : []),
      {
        label: "Log Out",
        accelerator: IS_MAC ? "Cmd+Shift+W" : "Ctrl+Shift+W",
        click: () => {
          requestLogoutFocusedWindow();
        },
      },
      { type: "separator" },
      { role: IS_MAC ? "close" : "quit" },
    ],
  };

  const editMenu = { role: "editMenu" };

  const viewMenu = {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
      ...(IS_DEVELOPMENT
        ? [{ type: "separator" }, { role: "toggleDevTools" }]
        : []),
    ],
  };

  const goMenu = {
    label: "Go",
    submenu: [
      {
        label: "Home",
        accelerator: IS_MAC ? "Cmd+Shift+H" : "Ctrl+Shift+H",
        click: async () => {
          await navigateFocusedWindow(MESSAGES_URL);
        },
      },
      {
        label: "Profile",
        accelerator: IS_MAC ? "Cmd+Shift+P" : "Ctrl+Shift+P",
        click: async () => {
          await navigateFocusedWindow(PROFILE_URL);
        },
      },
      { type: "separator" },
      {
        label: "Back",
        accelerator: IS_MAC ? "Cmd+[" : "Alt+Left",
        click: async () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (
            focusedWindow &&
            focusedWindow.webContents.navigationHistory.canGoBack()
          ) {
            focusedWindow.webContents.navigationHistory.goBack();
          }
        },
      },
      {
        label: "Forward",
        accelerator: IS_MAC ? "Cmd+]" : "Alt+Right",
        click: async () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (
            focusedWindow &&
            focusedWindow.webContents.navigationHistory.canGoForward()
          ) {
            focusedWindow.webContents.navigationHistory.goForward();
          }
        },
      },
    ],
  };

  const windowMenu = { role: "windowMenu" };

  const helpMenu = {
    role: "help",
    submenu: [
      {
        label: "Messenger Help Center",
        accelerator: "F1",
        click: () => {
          openHelpCenterFocusedWindow();
        },
      },
      {
        label: "Open Messenger in Browser",
        click: async () => {
          await shell.openExternal(MESSAGES_URL);
        },
      },
      { type: "separator" },
      {
        label: "GitHub Repository",
        click: async () => {
          await shell.openExternal(GITHUB_URL);
        },
      },
      {
        label: "Report an Issue",
        click: async () => {
          await shell.openExternal(REPORT_ISSUE_URL);
        },
      },
    ],
  };

  return [
    ...appMenu,
    fileMenu,
    editMenu,
    viewMenu,
    goMenu,
    windowMenu,
    helpMenu,
  ];
}

function setupMenus() {
  const menu = Menu.buildFromTemplate(buildMenuTemplate());
  Menu.setApplicationMenu(menu);
}

module.exports = {
  setupMenus,
};
