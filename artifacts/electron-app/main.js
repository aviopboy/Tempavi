const { app, BrowserWindow, Menu, shell, ipcMain, nativeTheme } = require("electron");
const path = require("path");
const { net } = require("electron");

const AVISTREAM_URL = process.env.AVISTREAM_URL || "https://avistream.netlify.app";

nativeTheme.themeSource = "dark";

let mainWindow = null;

function isOnline() {
  return net.isOnline();
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#060608",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    icon: path.join(__dirname, "icons", "icon-512.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    show: false,
  });

  // Show when ready to avoid white flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Navigate to offline page or the app
  await navigateToApp();

  // Watch connectivity changes
  setInterval(async () => {
    if (!mainWindow) return;
    const currentUrl = mainWindow.webContents.getURL();
    const isOfflinePageShown = currentUrl.startsWith("file://");
    if (isOnline() && isOfflinePageShown) {
      await navigateToApp();
    } else if (!isOnline() && !isOfflinePageShown) {
      mainWindow.loadFile(path.join(__dirname, "offline.html"));
    }
  }, 3000);

  buildMenu();
}

async function navigateToApp() {
  if (!mainWindow) return;
  if (isOnline()) {
    mainWindow.loadURL(AVISTREAM_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "offline.html"));
  }
}

function buildMenu() {
  const template = [
    {
      label: "AviStream",
      submenu: [
        {
          label: "Go to Home",
          accelerator: "CmdOrCtrl+H",
          click: () => mainWindow?.loadURL(AVISTREAM_URL),
        },
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow?.reload(),
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "togglefullscreen" },
        { type: "separator" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "resetZoom" },
        { type: "separator" },
        { role: "toggleDevTools" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// IPC: renderer can ask for connectivity
ipcMain.handle("is-online", () => isOnline());

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
