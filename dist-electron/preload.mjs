"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  },
  // You can expose other APTs you need here.
  // ...
  addGame: () => electron.ipcRenderer.invoke("add-game"),
  deleteGame: (path) => electron.ipcRenderer.invoke("delete-game", path),
  loadLibrary: () => electron.ipcRenderer.invoke("load-library"),
  launchGame: (path) => electron.ipcRenderer.invoke("launch-game", path),
  // Settings API
  loadSettings: () => electron.ipcRenderer.invoke("load-settings"),
  saveSettingValue: (code, value) => electron.ipcRenderer.invoke("save-setting-value", code, value),
  addSearchLocation: () => electron.ipcRenderer.invoke("add-search-location")
});
