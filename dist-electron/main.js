var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, BrowserWindow, shell, Menu, ipcMain, safeStorage } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { Client } from "ssh2";
app.setName("capyTerm");
createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
class SshSession {
  constructor(initialTabId, options) {
    __publicField(this, "client");
    __publicField(this, "stream", null);
    __publicField(this, "tabs");
    this.tabs = /* @__PURE__ */ new Set([initialTabId]);
    this.client = new Client();
    this.client.on("ready", () => {
      this.sendStatusToAll("connected");
      this.client.shell((err, stream) => {
        if (err) {
          this.sendErrorToAll(err.message);
          return;
        }
        this.stream = stream;
        this.stream.on("data", (data) => this.sendDataToAll(data.toString()));
        this.stream.on("close", () => this.closeSession());
        this.stream.stderr.on("data", (data) => this.sendErrorToAll(data.toString()));
      });
    }).on("error", (err) => {
      this.sendErrorToAll(err.message);
      this.closeSession();
    }).on("close", () => {
      this.closeSession();
    }).connect(options);
  }
  addTab(tabId) {
    this.tabs.add(tabId);
  }
  removeTab(tabId) {
    this.tabs.delete(tabId);
    if (this.tabs.size === 0) {
      this.client.end();
    }
  }
  closeSession() {
    this.sendStatusToAll("closed");
    this.tabs.forEach((tabId) => sessions.delete(tabId));
  }
  sendDataToAll(data) {
    this.tabs.forEach((tabId) => {
      win == null ? void 0 : win.webContents.send("ssh:data", { tabId, data });
    });
  }
  sendStatusToAll(status) {
    this.tabs.forEach((tabId) => {
      win == null ? void 0 : win.webContents.send("ssh:status", { tabId, status });
    });
  }
  sendErrorToAll(message) {
    this.tabs.forEach((tabId) => {
      win == null ? void 0 : win.webContents.send("ssh:error", { tabId, message });
    });
  }
}
const sessions = /* @__PURE__ */ new Map();
app.whenReady().then(() => {
  if (process.platform === "darwin") {
    app.dock.setIcon(path.join(process.env.VITE_PUBLIC, "icon.png"));
  }
  createWindow();
  const isMac = process.platform === "darwin";
  const template = [
    ...isMac ? [{
      label: app.getName(),
      submenu: [
        {
          label: "Preferences…",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            win == null ? void 0 : win.webContents.send("settings:open");
          }
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    }] : [],
    {
      label: "File",
      submenu: [
        ...isMac ? [] : [{
          label: "Preferences…",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            win == null ? void 0 : win.webContents.send("settings:open");
          }
        }],
        isMac ? { role: "close" } : { role: "quit" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...isMac ? [
          { role: "pasteAndMatchStyle" },
          { role: "delete" },
          { role: "selectAll" },
          { type: "separator" },
          { label: "Speech", submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }] }
        ] : [
          { role: "delete" },
          { type: "separator" },
          { role: "selectAll" }
        ]
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      role: "help",
      submenu: [
        {
          label: "Learn More",
          click: async () => {
            await shell.openExternal("https://www.electronjs.org");
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  ipcMain.on("ssh:connect", (_, { tabId, options }) => {
    var _a;
    if (sessions.has(tabId)) {
      (_a = sessions.get(tabId)) == null ? void 0 : _a.removeTab(tabId);
    }
    const session = new SshSession(tabId, options);
    sessions.set(tabId, session);
  });
  ipcMain.on("ssh:duplicate-session", (_, { originalTabId, newTabId }) => {
    const session = sessions.get(originalTabId);
    if (session) {
      session.addTab(newTabId);
      sessions.set(newTabId, session);
      session.sendStatusToAll("connected");
    }
  });
  ipcMain.on("ssh:data", (_, { tabId, data }) => {
    var _a, _b;
    (_b = (_a = sessions.get(tabId)) == null ? void 0 : _a.stream) == null ? void 0 : _b.write(data);
  });
  ipcMain.on("ssh:resize", (_, { tabId, rows, cols }) => {
    var _a, _b;
    (_b = (_a = sessions.get(tabId)) == null ? void 0 : _a.stream) == null ? void 0 : _b.setWindow(rows, cols, 90, 90);
  });
  ipcMain.on("ssh:disconnect", (_, { tabId }) => {
    const session = sessions.get(tabId);
    if (session) {
      session.removeTab(tabId);
    }
  });
  const homeSettingsPath = path.join(app.getPath("home"), "capyTermSetting.json");
  const legacySettingsPath = path.join(app.getPath("userData"), "capyTermSetting.json");
  try {
    if (fs.existsSync(legacySettingsPath) && !fs.existsSync(homeSettingsPath)) {
      fs.copyFileSync(legacySettingsPath, homeSettingsPath);
    }
  } catch {
  }
  const settingsFilePath = homeSettingsPath;
  function readSettings() {
    try {
      if (!fs.existsSync(settingsFilePath)) {
        const defaults = {
          theme: "dark",
          sshSessionFolders: [],
          sshSessions: []
        };
        fs.writeFileSync(settingsFilePath, JSON.stringify(defaults, null, 2), "utf-8");
        return defaults;
      }
      const raw = fs.readFileSync(settingsFilePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.sshSessions)) {
        parsed.sshSessions = parsed.sshSessions.map((s) => {
          if (s.auth && s.auth.method === "password" && s.auth.password && s.auth.password.__encrypted) {
            try {
              const decrypted = safeStorage.decryptString(Buffer.from(s.auth.password.data, "base64"));
              return { ...s, auth: { ...s.auth, password: decrypted, __encrypted: false } };
            } catch {
              return { ...s, auth: { ...s.auth, password: "", __encrypted: false } };
            }
          }
          return s;
        });
      }
      return parsed;
    } catch (e) {
      return { theme: "dark", sshSessionFolders: [], sshSessions: [] };
    }
  }
  function writeSettings(settings) {
    const toPersist = JSON.parse(JSON.stringify(settings));
    if (Array.isArray(toPersist.sshSessions)) {
      toPersist.sshSessions = toPersist.sshSessions.map((s) => {
        if (s.auth && s.auth.method === "password" && typeof s.auth.password === "string" && s.auth.password.length > 0) {
          try {
            const encrypted = safeStorage.encryptString(s.auth.password);
            return { ...s, auth: { ...s.auth, password: { __encrypted: true, data: Buffer.from(encrypted).toString("base64") } } };
          } catch {
            return { ...s, auth: { ...s.auth, password: "" } };
          }
        }
        return s;
      });
    }
    fs.writeFileSync(settingsFilePath, JSON.stringify(toPersist, null, 2), "utf-8");
  }
  ipcMain.handle("settings:read", () => {
    return readSettings();
  });
  ipcMain.handle("settings:write", (_, settings) => {
    try {
      writeSettings(settings);
      return { ok: true, path: settingsFilePath };
    } catch (e) {
      return { ok: false, error: (e == null ? void 0 : e.message) || String(e), path: settingsFilePath };
    }
  });
  ipcMain.handle("settings:path", () => settingsFilePath);
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
