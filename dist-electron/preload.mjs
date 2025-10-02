"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ssh", {
  connect: (tabId, options) => electron.ipcRenderer.send("ssh:connect", { tabId, options }),
  sendData: (tabId, data) => electron.ipcRenderer.send("ssh:data", { tabId, data }),
  resize: (tabId, size) => electron.ipcRenderer.send("ssh:resize", { tabId, size }),
  disconnect: (tabId) => electron.ipcRenderer.send("ssh:disconnect", { tabId }),
  onData: (func) => {
    const subscription = (_, args) => func(args);
    electron.ipcRenderer.on("ssh:data", subscription);
    return () => electron.ipcRenderer.removeListener("ssh:data", subscription);
  },
  onConnected: (func) => {
    const subscription = (_, args) => func(args);
    electron.ipcRenderer.on("ssh:connected", subscription);
    return () => electron.ipcRenderer.removeListener("ssh:connected", subscription);
  },
  onDisconnected: (func) => {
    const subscription = (_, args) => func(args);
    electron.ipcRenderer.on("ssh:disconnected", subscription);
    return () => electron.ipcRenderer.removeListener("ssh:disconnected", subscription);
  },
  onError: (func) => {
    const subscription = (_, args) => func(args);
    electron.ipcRenderer.on("ssh:error", subscription);
    return () => electron.ipcRenderer.removeListener("ssh:error", subscription);
  },
  removeAllListeners: () => {
    electron.ipcRenderer.removeAllListeners("ssh:data");
    electron.ipcRenderer.removeAllListeners("ssh:connected");
    electron.ipcRenderer.removeAllListeners("ssh:disconnected");
    electron.ipcRenderer.removeAllListeners("ssh:error");
  }
});
electron.contextBridge.exposeInMainWorld("localTerminal", {
  spawn: (tabId) => electron.ipcRenderer.send("local-terminal:spawn", { tabId }),
  sendData: (tabId, data) => electron.ipcRenderer.send("local-terminal:data", { tabId, data }),
  resize: (tabId, size) => electron.ipcRenderer.send("local-terminal:resize", { tabId, size }),
  disconnect: (tabId) => electron.ipcRenderer.send("local-terminal:disconnect", { tabId }),
  onData: (func) => {
    const subscription = (_, args) => func(args);
    electron.ipcRenderer.on("local-terminal:data", subscription);
    return () => electron.ipcRenderer.removeListener("local-terminal:data", subscription);
  }
});
