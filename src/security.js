const { shell } = require("electron");
const {
  ABOUT_BLANK_URL,
  ALLOWED_IN_APP_HOSTS,
  TRUSTED_PERMISSION_HOST_SUFFIXES,
  MEDIA_PERMISSIONS,
  IS_MAC,
  NOTIFICATION_PERMISSION,
  MEDIA_PERMISSION,
  AUDIO_CAPTURE_PERMISSION,
  VIDEO_CAPTURE_PERMISSION,
  MICROPHONE_MEDIA_TYPE,
  CAMERA_MEDIA_TYPE,
} = require("./config");

const MEDIA_PERMISSION_SET = new Set(MEDIA_PERMISSIONS);

function parseHttpUrl(urlString) {
  if (!urlString) {
    return null;
  }

  try {
    const parsedUrl = new URL(urlString);
    const isHttp =
      parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";

    if (!isHttp) {
      return null;
    }

    return parsedUrl;
  } catch {
    return null;
  }
}

function isHostMatch(hostname, hostPattern) {
  if (hostPattern.startsWith(".")) {
    return hostname.endsWith(hostPattern);
  }

  return hostname === hostPattern;
}

function isAllowedInAppUrl(urlString) {
  const parsedUrl = parseHttpUrl(urlString);
  if (!parsedUrl) {
    return false;
  }

  return ALLOWED_IN_APP_HOSTS.some((host) => parsedUrl.hostname === host);
}

function isTrustedPermissionOrigin(urlString) {
  const parsedUrl = parseHttpUrl(urlString);
  if (!parsedUrl) {
    return false;
  }

  return TRUSTED_PERMISSION_HOST_SUFFIXES.some((hostPattern) =>
    isHostMatch(parsedUrl.hostname, hostPattern),
  );
}

function openInDefaultBrowserIfSupported(urlString) {
  const parsedUrl = parseHttpUrl(urlString);
  if (!parsedUrl) {
    return;
  }

  shell.openExternal(parsedUrl.toString());
}

function enforceUrlPolicy(webContents) {
  webContents.on("will-navigate", (event, url) => {
    if (isAllowedInAppUrl(url)) {
      return;
    }

    event.preventDefault();
    openInDefaultBrowserIfSupported(url);
  });

  webContents.on("will-redirect", (event, url) => {
    if (isAllowedInAppUrl(url)) {
      return;
    }

    event.preventDefault();
    openInDefaultBrowserIfSupported(url);
  });

  webContents.setWindowOpenHandler(({ url }) => {
    if (url === ABOUT_BLANK_URL) {
      return { action: "allow" };
    }

    if (isAllowedInAppUrl(url)) {
      return { action: "allow" };
    }

    openInDefaultBrowserIfSupported(url);
    return { action: "deny" };
  });
}

function configureSessionSecurity({ session, systemPreferences }) {
  session.setPermissionCheckHandler(
    (_webContents, permission, requestingOrigin) => {
      if (permission === NOTIFICATION_PERMISSION) {
        return isTrustedPermissionOrigin(requestingOrigin);
      }

      if (MEDIA_PERMISSION_SET.has(permission)) {
        return isTrustedPermissionOrigin(requestingOrigin);
      }

      return false;
    },
  );

  session.setPermissionRequestHandler(
    async (webContents, permission, callback, details) => {
      const requestingOrigin =
        details?.requestingOrigin || webContents?.getURL() || "";
      const isTrustedOrigin = isTrustedPermissionOrigin(requestingOrigin);

      if (permission === NOTIFICATION_PERMISSION) {
        callback(isTrustedOrigin);
        return;
      }

      if (MEDIA_PERMISSION_SET.has(permission)) {
        if (!isTrustedOrigin) {
          callback(false);
          return;
        }

        if (IS_MAC) {
          const mediaTypes = [];
          if (
            permission === MEDIA_PERMISSION ||
            permission === AUDIO_CAPTURE_PERMISSION
          ) {
            mediaTypes.push(MICROPHONE_MEDIA_TYPE);
          }
          if (
            permission === MEDIA_PERMISSION ||
            permission === VIDEO_CAPTURE_PERMISSION
          ) {
            mediaTypes.push(CAMERA_MEDIA_TYPE);
          }

          for (const mediaType of mediaTypes) {
            const status = systemPreferences.getMediaAccessStatus(mediaType);
            if (status !== "granted") {
              const granted =
                await systemPreferences.askForMediaAccess(mediaType);
              if (!granted) {
                callback(false);
                return;
              }
            }
          }
        }

        callback(true);
        return;
      }

      callback(false);
    },
  );
}

module.exports = {
  enforceUrlPolicy,
  configureSessionSecurity,
};
