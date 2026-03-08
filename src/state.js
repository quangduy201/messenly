const fs = require("fs");
const path = require("path");

function createWindowStateStore({ app, defaults }) {
  const filePath = path.join(app.getPath("userData"), "window-state.json");

  function loadState() {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);

      return {
        width: Number.isFinite(parsed.width) ? parsed.width : defaults.width,
        height: Number.isFinite(parsed.height)
          ? parsed.height
          : defaults.height,
        x: Number.isFinite(parsed.x) ? parsed.x : undefined,
        y: Number.isFinite(parsed.y) ? parsed.y : undefined,
        isMaximized: parsed.isMaximized === true,
      };
    } catch {
      return { ...defaults, isMaximized: false };
    }
  }

  function saveState(window) {
    if (!window || window.isDestroyed()) {
      return;
    }

    const bounds = window.getBounds();
    const nextState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: window.isMaximized(),
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(nextState, null, 2), "utf-8");
    } catch {
      // ignore state persistence errors
    }
  }

  function attach(window) {
    window.on("resize", () => saveState(window));
    window.on("move", () => saveState(window));
    window.on("maximize", () => saveState(window));
    window.on("unmaximize", () => saveState(window));
    window.on("close", () => saveState(window));
  }

  return {
    loadState,
    attach,
  };
}

module.exports = {
  createWindowStateStore,
};
