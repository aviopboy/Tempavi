# AviStream — Desktop App (Electron)

Wraps the AviStream web app in a native desktop shell.

## Features
- Auto-detects connectivity; shows **No Internet** page when offline
- Reconnects automatically when network is restored
- Native menus, fullscreen, zoom controls
- Dark background (#060608) matches the web theme

## Development

```bash
cd artifacts/electron-app
npm install
npm start
```

## Building

| Platform | Command | Output |
|----------|---------|--------|
| Linux    | `npm run dist:linux` | `.deb` + `AppImage` in `dist-electron/` |
| Windows  | `npm run dist:win`   | `.exe` installer in `dist-electron/`    |

> **Note:** Cross-compilation is limited — build Linux on Linux, Windows on Windows.  
> Use GitHub Actions (`.github/workflows/build-electron.yml`) for automated cross-platform builds.

## Production URL

Set the `AVISTREAM_URL` env var to your deployed domain before building, or edit `main.js`:

```js
const AVISTREAM_URL = "https://your-domain.com";
```

## APK (Android)

Built separately via Capacitor — see `.github/workflows/build-apk.yml`.
