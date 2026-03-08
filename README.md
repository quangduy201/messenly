<p align="center">
  <img src="assets/icons/icon.png" alt="Messenly icon" width="100">
</p>
<h1 align="center">Messenly</h1>

Messenly is a lightweight, cross-platform desktop wrapper for Facebook Messenger Web with more native features.

This project was created due to the discontinuation of both the official Messenger desktop app and the web app ([messenger.com](https://www.messenger.com)), leaving users with only the [Facebook](https://www.facebook.com) website to access their messages on desktop.

Installing Facebook as a Progressive Web App (PWA) just to use Messenger can be overwhelming and distracting, as it always opens the Facebook feed every time it's launched.

Messenly solves this by opening Messenger directly, providing a focused desktop chat experience similar to the old Messenger desktop app, while adding extra features.

> Unofficial app. Not affiliated with, endorsed by, or sponsored by Meta.

## Features

- **Messenger first**: Loads Facebook Messages directly in a desktop window on start.
- **Native notifications**: Receive desktop notifications when new messages arrive. Clicking a notification opens the corresponding conversation. (Notifications work while the app is running)
- **Unread message counter**: Display the number of unread messages on the dock icon (macOS & Linux).
- **Native menu integration**: Access common actions from the app menu.
- **Keyboard shortcuts**: Do common actions quickly with keyboard shortcuts.

## Installation

Make sure you download the latest version from the [Releases](https://github.com/quangduy201/messenly/releases) page.

### macOS

- Download the `.dmg` file from Releases page with the correct architecture (Intel or Apple Silicon).
- Open the downloaded file and drag `Messenly.app` into Applications folder.

#### Unsigned / not notarized note

This app is currently **not code signed or notarized**.
macOS may show warnings like "Apple could not verify ... is free of malware".

To open it anyway:

1. Try opening the app once from Finder.
2. Open **System Settings → Privacy & Security**.
3. In the **Security** section, find the blocked app message and click **Open Anyway**.
4. Confirm by clicking **Open**.

### Windows

- Download the `.exe` installer from Releases page with the correct architecture (x64 or arm64).
- Run the installer and follow the prompts to complete installation.

#### Unsigned publisher note

Windows SmartScreen may show "Windows protected your PC" because the app is not code signed yet.

To run it:

1. Click **More info**.
2. Click **Run anyway**.

### Linux

Download either:

- `.AppImage` (portable)
- `.deb` (Debian/Ubuntu-based)

Then follow the standard installation process for your distribution.

## Usage

- Open the app and log in to your Facebook account if prompted.
- The app will load the Messenger web interface directly.
- Use the menu or keyboard shortcuts to do common actions:

| Action      | macOS       | Windows/Linux      | Description                      |
| ----------- | ----------- | ------------------ | -------------------------------- |
| New Message | `⌘`+ `N`    | `Ctrl`+`N`         | Start a new message              |
| Settings    | `⌘`+`,`     | `Ctrl`+`,`         | Open in-app settings             |
| Log Out     | `⇧`+`⌘`+`W` | `Ctrl`+`Shift`+`W` | Log out of Facebook Messenger    |
| Home        | `⇧`+`⌘`+`H` | `Ctrl`+`Shift`+`H` | Go to main messages view         |
| Profile     | `⇧`+`⌘`+`P` | `Ctrl`+`Shift`+`P` | View your Facebook profile       |
| Back        | `⌘`+`[`     | `Alt`+`Left`       | Go back in navigation history    |
| Forward     | `⌘`+`]`     | `Alt`+`Right`      | Go forward in navigation history |
| Reload      | `⌘`+`R`     | `Ctrl`+`R`         | Reload the current page          |
| Zoom In/Out | `⌘`+`+`/`-` | `Ctrl`+`+`/`-`     | Zoom in/out                      |
| Reset Zoom  | `⌘`+`0`     | `Ctrl`+`0`         | Reset zoom level                 |
| Quit        | `⌘`+`Q`     | `Alt`+`F4`         | Quit the app                     |
| Help Center | `F1`        | `F1`               | Open Messenger Help Center       |

## Q&A

### Why am I not getting any notifications?

- Check your OS notification settings to ensure notifications are allowed for Messenly.
- Facebook Messenger Web must be open in the app to receive notifications. If you have navigated away from the Messenger page, try clicking `Go` → `Home` to return to the main messages view.
- Notifications will only work while the app is running. If you quit the app, you will not receive notifications until you open it again.

### I don't like the default app icon. Can I change it?

Yes! As long as you have an image file (PNG, ICO, ICNS) that you want to use as the app icon, you can replace the default icon by following one of these steps:

- macOS: Right-click the Messenly.app in Finder, select "Get Info", then drag and drop your `.icns` file onto the existing icon in the top-left corner of the info window.
- Windows: Right-click the Messenly shortcut, select "Properties", go to the "Shortcut" tab, click "Change Icon", and browse to your `.ico` file.
- Linux: The process varies by desktop environment, but generally involves right-clicking the app launcher and selecting "Properties" or "Edit Launcher" to change the icon path.

### Is Messenly safe to use? What about my privacy?

- Messenly does not collect or transmit your Facebook credentials. All authentication is handled entirely by Facebook within the embedded browser.
- The app does not store any of your messages or personal data on your device or on any servers. All data is managed by Facebook's web interface.
- Always download the app from the official GitHub releases page to avoid tampered versions.
- Please refer to Meta's privacy policies for details about account and message data handling.

### I found a bug or want to request a feature. What should I do?

Please open an issue on GitHub to report bugs or request features: [Report a bug](https://github.com/quangduy201/messenly/issues).

Before creating a new issue, please check if it's already been reported.

Helpful details to include:

- OS and version (macOS/Windows/Linux)
- App version
- Steps to reproduce
- Expected behavior vs actual behavior
- Screenshots or logs (if available)

### I want to contribute to the project. How can I help?

1. Fork the repository.
2. Create a feature/fix branch.
3. Make your changes and test locally.
4. Open a Pull Request with a clear description.

If you are unsure about direction, open an issue first to discuss.

## Disclaimer

**Messenly is an independent, unofficial open-source project and is not affiliated with Meta or Facebook**.

Because the application depends on the Facebook website, future changes to Facebook's interface may break some functionality.

## License

Messenly is licensed under the MIT License. See [LICENSE](LICENSE) for details.
