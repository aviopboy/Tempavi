const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("avistream", {
  isOnline: () => ipcRenderer.invoke("is-online"),
  platform: process.platform,
});
