const { contextBridge, ipcRenderer } = require("electron");

function getRenderedText(node) {
  if (!node) {
    return "";
  }

  const parts = [];

  const walk = (currentNode) => {
    if (!currentNode) {
      return;
    }

    if (currentNode.nodeType === Node.TEXT_NODE) {
      const value = (currentNode.nodeValue || "").replace(/\s+/g, " ");
      if (value.trim()) {
        parts.push(value);
      }
      return;
    }

    if (currentNode.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = currentNode;

    if (element.tagName === "IMG") {
      const alt = (element.getAttribute("alt") || "").trim();
      if (alt) {
        parts.push(alt);
      }
      return;
    }

    const children = Array.from(element.childNodes);
    for (const child of children) {
      walk(child);
    }
  };

  walk(node);

  return parts
    .join(" ")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function getConversationIdFromElement(element) {
  if (!element) {
    return "";
  }

  const threadLink = element.querySelector(
    'a[href*="/messages/e2ee/t/"], a[href*="/messages/t/"]',
  );
  if (!threadLink || typeof threadLink.getAttribute !== "function") {
    return "";
  }

  const href = threadLink.getAttribute("href") || "";
  const match = href.match(/\/messages\/(?:e2ee\/)?t\/([^/?#]+)/);
  return match ? match[1] : "";
}

function getConversationPathFromElement(element) {
  if (!element) {
    return "";
  }

  const threadLink = element.querySelector(
    'a[href*="/messages/e2ee/t/"], a[href*="/messages/t/"]',
  );
  if (!threadLink || typeof threadLink.getAttribute !== "function") {
    return "";
  }

  const href = threadLink.getAttribute("href") || "";
  const match = href.match(/(\/messages\/(?:e2ee\/)?t\/[^/?#]+)\/?/);
  return match ? match[1] : "";
}

function getAvatarUrlFromElement(element) {
  if (!element) {
    return "";
  }

  const avatarCandidates = Array.from(
    element.querySelectorAll(
      'a[href*="/messages/"] img[src], img[src*="fbcdn.net"]',
    ),
  );

  for (const image of avatarCandidates) {
    const src = (image.getAttribute("src") || "").trim();
    if (!src) {
      continue;
    }

    if (src.includes("emoji.php")) {
      continue;
    }

    const width = Number.parseInt(image.getAttribute("width") || "0", 10);
    const height = Number.parseInt(image.getAttribute("height") || "0", 10);
    if ((width > 0 && width < 24) || (height > 0 && height < 24)) {
      continue;
    }

    return src;
  }

  return "";
}

function isUnreadRow(row) {
  if (!row) {
    return false;
  }

  const unreadSummary = findUnreadSummaryNode(row);
  if (unreadSummary) {
    return true;
  }

  const unreadMarker = Array.from(row.querySelectorAll("div, span")).find(
    (node) => getRenderedText(node).trim() === "Unread message:",
  );

  return Boolean(unreadMarker);
}

function findUnreadSummaryNode(row) {
  if (!row) {
    return null;
  }

  const candidateSpans = Array.from(row.querySelectorAll("span"));
  for (const span of candidateSpans) {
    const children = Array.from(span.children);
    if (children.length < 2) {
      continue;
    }

    const hasLeadingLabel = children.some(
      (child) =>
        child.tagName === "DIV" && getRenderedText(child).trim().length > 0,
    );
    if (!hasLeadingLabel) {
      continue;
    }

    const messageChild = children.find(
      (child) =>
        child.matches?.('span[dir="auto"]') &&
        getRenderedText(child).trim().length > 0,
    );

    if (messageChild) {
      return {
        container: span,
        messageNode: messageChild,
      };
    }
  }

  return null;
}

function isMutedRow(row) {
  if (!row) {
    return false;
  }

  if (row.querySelector('svg[style*="--x-color: var(--disabled-icon)"]')) {
    return true;
  }

  if (row.querySelector('path[d^="M2.5 6c0-.322"]')) {
    return true;
  }

  return false;
}

function getThreadRows() {
  const rows = Array.from(document.querySelectorAll('div[role="row"]'));
  return rows.filter((row) => {
    const link = row.querySelector(
      'a[href*="/messages/e2ee/t/"], a[href*="/messages/t/"]',
    );
    return Boolean(link);
  });
}

function getUnreadRows() {
  return getThreadRows().filter((row) => isUnreadRow(row));
}

function extractPreviewFromThreadRow(row) {
  if (!row) {
    return null;
  }

  const unreadSummary = findUnreadSummaryNode(row);
  const unreadMarker = unreadSummary?.container;

  let messageText = "";
  if (unreadSummary?.messageNode) {
    messageText = getRenderedText(unreadSummary.messageNode).trim();
  } else if (unreadMarker) {
    const messageNode =
      unreadMarker.parentElement?.querySelector('span[dir="auto"]');
    if (messageNode) {
      messageText = getRenderedText(messageNode).trim();
    }
  }

  const senderNodes = Array.from(row.querySelectorAll('span[dir="auto"]'))
    .map((node) => getRenderedText(node).trim())
    .filter(Boolean)
    .filter((text) => text !== "Unread message:")
    .filter((text) => !text.includes(" · "))
    .filter((text) => text.length <= 120);

  const sender = senderNodes[0] || "";

  const textNodes = Array.from(
    row.querySelectorAll("span[dir='auto'], div[dir='auto']"),
  )
    .map((node) => getRenderedText(node))
    .filter(Boolean)
    .filter((text) => text.length <= 240);

  if (textNodes.length === 0) {
    if (!sender || !messageText) {
      return null;
    }
  }

  const text = messageText || textNodes[1] || textNodes[0] || "";

  if (!sender && !text) {
    return null;
  }

  return {
    sender,
    text,
    conversationId: getConversationIdFromElement(row),
    conversationPath: getConversationPathFromElement(row),
    avatarUrl: getAvatarUrlFromElement(row),
  };
}

function countUnreadConversationRows() {
  const threadRows = getThreadRows();
  if (threadRows.length === 0) {
    return null;
  }

  return threadRows.filter((row) => isUnreadRow(row)).length;
}

function findBestThreadRow() {
  const unreadRows = getUnreadRows();
  for (const row of unreadRows) {
    if (isMutedRow(row)) {
      continue;
    }

    const preview = extractPreviewFromThreadRow(row);
    if (preview) {
      return preview;
    }
  }

  return null;
}

function trackLatestMessagePreview() {
  let lastSentKey = "";
  let lastUnreadRowCount = -1;

  const pushPreview = () => {
    const unreadRowCount = countUnreadConversationRows();
    if (unreadRowCount !== null && unreadRowCount !== lastUnreadRowCount) {
      lastUnreadRowCount = unreadRowCount;
      ipcRenderer.send("host:unread-count", unreadRowCount);
    }

    const preview = findBestThreadRow();
    if (!preview) {
      return;
    }

    const key = `${preview.conversationId}|${preview.sender}|${preview.text}`;
    if (key === lastSentKey) {
      return;
    }

    lastSentKey = key;
    ipcRenderer.send("host:message-preview", preview, unreadRowCount);
  };

  const observer = new MutationObserver(() => {
    pushPreview();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  pushPreview();
}

function navigateToConversationInPage(payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  const conversationPath =
    typeof payload.conversationPath === "string"
      ? payload.conversationPath.trim()
      : "";
  const conversationId =
    typeof payload.conversationId === "string"
      ? payload.conversationId.trim()
      : "";

  const candidatePaths = [];
  if (conversationPath) {
    candidatePaths.push(conversationPath);
  }
  if (conversationId) {
    candidatePaths.push(`/messages/e2ee/t/${conversationId}`);
    candidatePaths.push(`/messages/t/${conversationId}`);
  }

  for (const path of candidatePaths) {
    const link = document.querySelector(`a[href*="${path}"]`);
    if (!link) {
      continue;
    }

    link.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    return;
  }

  if (conversationPath) {
    history.pushState({}, "", conversationPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

function clickElement(node) {
  if (!node || typeof node.dispatchEvent !== "function") {
    return;
  }

  node.focus?.();
  node.dispatchEvent(
    new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );
  node.dispatchEvent(
    new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );
  node.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );
}

function waitForElement(getElement, timeoutMs = 1200, intervalMs = 50) {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    const poll = () => {
      const element = getElement();
      if (element) {
        resolve(element);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        resolve(null);
        return;
      }

      setTimeout(poll, intervalMs);
    };

    poll();
  });
}

function findSettingsButton() {
  const selectors = [
    'div[role="button"][aria-controls="mw-inbox-settings-menu"]',
    'div[role="button"][aria-controls*="settings-menu"]',
    'div[role="button"][aria-haspopup="menu"][aria-controls]',
  ];

  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll(selector));
    const visible = elements.find((element) => element.offsetParent !== null);
    if (visible) {
      return visible;
    }
    if (elements[0]) {
      return elements[0];
    }
  }

  return null;
}

function getSettingsMenuRoot() {
  return (
    document.querySelector("#mw-inbox-settings-menu") ||
    document.querySelector('[role="menu"][id*="settings-menu"]')
  );
}

function findPreferencesMenuItem() {
  const menuRoot = getSettingsMenuRoot();
  if (!menuRoot) {
    return null;
  }

  const menuItems = Array.from(menuRoot.querySelectorAll('[role="menuitem"]'));
  if (menuItems.length === 0) {
    return null;
  }

  const firstSeparator = menuRoot.querySelector('[role="separator"]');
  if (!firstSeparator) {
    return menuItems[0] || null;
  }

  return (
    menuItems.find((item) =>
      Boolean(
        firstSeparator.compareDocumentPosition(item) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ) ||
    menuItems[0] ||
    null
  );
}

function findHelpMenuItem() {
  const menuRoot = getSettingsMenuRoot();
  if (!menuRoot) {
    return null;
  }

  return (
    menuRoot.querySelector('a[role="menuitem"][href="/help/messenger-app/"]') ||
    null
  );
}

function findProfileMenuButton() {
  const navigation = document.querySelector('div[role="navigation"].x6s0dn4');
  if (!navigation) {
    return null;
  }

  const buttons = Array.from(
    navigation.querySelectorAll('div[role="button"]'),
  ).filter((button) => button.offsetParent !== null);

  return buttons[buttons.length - 1] || null;
}

function findLogoutMenuButton() {
  const dialogs = Array.from(
    document.querySelectorAll('div[role="dialog"][aria-label]'),
  ).filter((dialog) => dialog.offsetParent !== null);

  const profileDialog = dialogs[dialogs.length - 1];
  if (!profileDialog) {
    return null;
  }

  const lists = Array.from(profileDialog.querySelectorAll('[role="list"]'));
  let bestItems = [];

  for (const list of lists) {
    const items = Array.from(list.querySelectorAll('[role="listitem"]')).filter(
      (item) =>
        item.querySelector('div[role="button"]') && item.offsetParent !== null,
    );
    if (items.length > bestItems.length) {
      bestItems = items;
    }
  }

  if (bestItems.length > 0) {
    const lastItem = bestItems[bestItems.length - 1];
    const button = lastItem.querySelector('div[role="button"]');
    if (button) {
      return button;
    }
  }

  const allVisibleButtons = Array.from(
    profileDialog.querySelectorAll('div[role="button"]'),
  ).filter((button) => button.offsetParent !== null);

  return allVisibleButtons[allVisibleButtons.length - 1] || null;
}

let logoutReloadTimeoutId = null;

function scheduleMessagesReloadAfterLogout(delayMs = 700) {
  if (logoutReloadTimeoutId !== null) {
    clearTimeout(logoutReloadTimeoutId);
  }

  logoutReloadTimeoutId = setTimeout(() => {
    logoutReloadTimeoutId = null;
    ipcRenderer.send("host:logout-initiated");
  }, delayMs);
}

function isLogoutButtonInteraction(node) {
  if (!(node instanceof Element)) {
    return false;
  }

  const button = node.closest('div[role="button"]');
  if (!button) {
    return false;
  }

  const logoutButton = findLogoutMenuButton();
  if (!logoutButton) {
    return false;
  }

  return (
    button === logoutButton ||
    logoutButton.contains(button) ||
    button.contains(logoutButton)
  );
}

function handleDocumentClickForLogout(event) {
  if (!isLogoutButtonInteraction(event?.target)) {
    return;
  }

  scheduleMessagesReloadAfterLogout();
}

function handleDocumentKeydownForLogout(event) {
  if (!event) {
    return;
  }

  const isActivationKey = event.key === "Enter" || event.key === " ";
  if (!isActivationKey) {
    return;
  }

  if (!isLogoutButtonInteraction(event.target)) {
    return;
  }

  scheduleMessagesReloadAfterLogout();
}

async function logoutInPage() {
  const profileButton = await waitForElement(findProfileMenuButton);
  if (!profileButton) {
    return;
  }

  clickElement(profileButton);

  const logoutButton = await waitForElement(findLogoutMenuButton, 1800);
  if (!logoutButton) {
    return;
  }

  clickElement(logoutButton); // This will trigger the click handler which schedules the reload after logout
}

async function openPreferencesInPage() {
  const settingsButton = await waitForElement(findSettingsButton);
  if (!settingsButton) {
    return;
  }

  clickElement(settingsButton);

  const preferencesItem = await waitForElement(findPreferencesMenuItem);
  if (!preferencesItem) {
    return;
  }

  clickElement(preferencesItem);
}

async function openHelpCenterInPage() {
  const settingsButton = await waitForElement(findSettingsButton);
  if (!settingsButton) {
    return;
  }

  clickElement(settingsButton);

  const helpItem = await waitForElement(findHelpMenuItem);
  if (!helpItem) {
    return;
  }

  clickElement(helpItem);
}

function handleGlobalF1Shortcut(event) {
  if (!event || event.key !== "F1") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  openHelpCenterInPage().catch(() => {});
}

window.addEventListener("DOMContentLoaded", () => {
  trackLatestMessagePreview();

  window.addEventListener("keydown", handleGlobalF1Shortcut, true);
  document.addEventListener("keydown", handleDocumentKeydownForLogout, true);
  document.addEventListener("click", handleDocumentClickForLogout, true);

  ipcRenderer.on("host:navigate-to-conversation", (_event, payload) => {
    navigateToConversationInPage(payload);
  });

  ipcRenderer.on("host:open-preferences", () => {
    openPreferencesInPage().catch(() => {});
  });

  ipcRenderer.on("host:open-help-center", () => {
    openHelpCenterInPage().catch(() => {});
  });

  ipcRenderer.on("host:log-out", () => {
    logoutInPage().catch(() => {});
  });
});

contextBridge.exposeInMainWorld("messenlyHost", {
  ping: () => {
    const unreadRowCount = countUnreadConversationRows();
    if (unreadRowCount !== null) {
      ipcRenderer.send("host:unread-count", unreadRowCount);
    }
  },
});
