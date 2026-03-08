const { app, os } = require("electron");

const MESSAGES_URL = "https://www.facebook.com/messages";
const MESSAGES_INBOX_URL = "https://www.facebook.com/messages/e2ee/t/";
const PROFILE_URL = "https://www.facebook.com/me";
const GITHUB_URL = "https://github.com/quangduy201/messenly";
const REPORT_ISSUE_URL = "https://github.com/quangduy201/messenly/issues";

const CURRENT_PLATFORM = process.platform || os.platform();
const IS_PACKAGED_APP = Boolean(app && app.isPackaged);
const CURRENT_ENVIRONMENT =
  process.env.NODE_ENV === "production" || IS_PACKAGED_APP
    ? "production"
    : "development";
const IS_DEVELOPMENT = CURRENT_ENVIRONMENT === "development";
const IS_MAC = CURRENT_PLATFORM === "darwin";
const ABOUT_BLANK_URL = "about:blank";

const WINDOW_APP_NAME = "Messenly";
const WINDOW_DEFAULT_WIDTH = 1280;
const WINDOW_DEFAULT_HEIGHT = 820;
const WINDOW_MIN_WIDTH = 980;
const WINDOW_MIN_HEIGHT = 640;
const WINDOW_BACKGROUND_COLOR = "#ffffff";
const WINDOW_ICON_RELATIVE_PATH = "assets/icons/icon.png";

const WEB_PREF_CONTEXT_ISOLATION = true;
const WEB_PREF_NODE_INTEGRATION = false;
const WEB_PREF_SANDBOX = true;
const WEB_PREF_SPELLCHECK = true;
const WEB_PREF_BACKGROUND_THROTTLING = false;

const ALLOWED_IN_APP_HOSTS = ["facebook.com", "www.facebook.com"];
const TRUSTED_PERMISSION_HOST_SUFFIXES = [
  "facebook.com",
  ".facebook.com",
  "messenger.com",
  ".messenger.com",
];
const MEDIA_PERMISSIONS = ["media", "audioCapture", "videoCapture"];
const NOTIFICATION_PERMISSION = "notifications";
const MEDIA_PERMISSION = "media";
const AUDIO_CAPTURE_PERMISSION = "audioCapture";
const VIDEO_CAPTURE_PERMISSION = "videoCapture";
const MICROPHONE_MEDIA_TYPE = "microphone";
const CAMERA_MEDIA_TYPE = "camera";

const MAX_NOTIFIED_CONVERSATIONS = 500;
const AVATAR_ICON_SIZE = 64;
const DEFAULT_NOTIFICATION_TITLE = "New message";
const DEFAULT_NOTIFICATION_BODY = "You have a new message.";
const E2EE_THREAD_PATH_PREFIX = "/messages/e2ee/t/";
const CONVERSATION_KEY_ID_PREFIX = "id:";
const CONVERSATION_KEY_SENDER_PREFIX = "sender:";

module.exports = {
  MESSAGES_URL,
  MESSAGES_INBOX_URL,
  PROFILE_URL,
  GITHUB_URL,
  REPORT_ISSUE_URL,
  CURRENT_PLATFORM,
  CURRENT_ENVIRONMENT,
  IS_DEVELOPMENT,
  IS_MAC,
  ABOUT_BLANK_URL,
  WINDOW_APP_NAME,
  WINDOW_DEFAULT_WIDTH,
  WINDOW_DEFAULT_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_MIN_HEIGHT,
  WINDOW_BACKGROUND_COLOR,
  WINDOW_ICON_RELATIVE_PATH,
  WEB_PREF_CONTEXT_ISOLATION,
  WEB_PREF_NODE_INTEGRATION,
  WEB_PREF_SANDBOX,
  WEB_PREF_SPELLCHECK,
  WEB_PREF_BACKGROUND_THROTTLING,
  ALLOWED_IN_APP_HOSTS,
  TRUSTED_PERMISSION_HOST_SUFFIXES,
  MEDIA_PERMISSIONS,
  NOTIFICATION_PERMISSION,
  MEDIA_PERMISSION,
  AUDIO_CAPTURE_PERMISSION,
  VIDEO_CAPTURE_PERMISSION,
  MICROPHONE_MEDIA_TYPE,
  CAMERA_MEDIA_TYPE,
  MAX_NOTIFIED_CONVERSATIONS,
  AVATAR_ICON_SIZE,
  DEFAULT_NOTIFICATION_TITLE,
  DEFAULT_NOTIFICATION_BODY,
  E2EE_THREAD_PATH_PREFIX,
  CONVERSATION_KEY_ID_PREFIX,
  CONVERSATION_KEY_SENDER_PREFIX,
};
