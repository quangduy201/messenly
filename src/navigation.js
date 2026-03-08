function isNavigationAbortError(error) {
  if (!error) {
    return false;
  }

  const message =
    typeof error.message === "string" ? error.message : String(error);
  return message.includes("ERR_ABORTED") || message.includes("(-3)");
}

async function safeLoadUrl(window, url) {
  if (!window || window.isDestroyed()) {
    return;
  }

  try {
    await window.loadURL(url);
  } catch (error) {
    if (!isNavigationAbortError(error)) {
      throw error;
    }
  }
}

module.exports = {
  isNavigationAbortError,
  safeLoadUrl,
};
