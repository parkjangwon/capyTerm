"use strict";
const electron = require("electron");
const validChannels = ["ssh:data", "ssh:status", "ssh:error"];
electron.contextBridge.exposeInMainWorld("ssh", {
  connect: (tabId, options) => electron.ipcRenderer.send("ssh:connect", { tabId, options }),
  sendData: (tabId, data) => electron.ipcRenderer.send("ssh:data", { tabId, data }),
  resize: (tabId, size) => electron.ipcRenderer.send("ssh:resize", { tabId, ...size }),
  disconnect: (tabId) => electron.ipcRenderer.send("ssh:disconnect", { tabId }),
  duplicateSession: (originalTabId, newTabId) => electron.ipcRenderer.send("ssh:duplicate-session", { originalTabId, newTabId }),
  on: (channel, func) => {
    if (validChannels.includes(channel)) {
      const subscription = (event, ...args) => func(...args);
      electron.ipcRenderer.on(channel, subscription);
      return () => {
        electron.ipcRenderer.removeListener(channel, subscription);
      };
    }
  },
  removeAllListeners: (channel) => {
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.removeAllListeners(channel);
    }
  }
});
