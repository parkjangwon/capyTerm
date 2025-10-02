import { app, shell, Menu, ipcMain, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { Client } from "ssh2";
import * as pty from "node-pty";
import os from "os";
const shellPath = os.platform() === "win32" ? "powershell.exe" : process.env.SHELL || "bash";
app.setName("capyTerm");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
const windows = /* @__PURE__ */ new Set();
const sshConnections = /* @__PURE__ */ new Map();
const localTerminals = /* @__PURE__ */ new Map();
function createWindow() {
  const win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  windows.add(win);
  win.on("closed", () => {
    const winId = win.id;
    for (const key of sshConnections.keys()) {
      if (key.startsWith(`${winId}-`)) {
        const conn = sshConnections.get(key);
        conn == null ? void 0 : conn.client.end();
        sshConnections.delete(key);
      }
    }
    for (const key of localTerminals.keys()) {
      if (key.startsWith(`${winId}-`)) {
        const term = localTerminals.get(key);
        term == null ? void 0 : term.kill();
        localTerminals.delete(key);
      }
    }
    windows.delete(win);
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
  }
});
app.on("activate", () => {
  if (windows.size === 0) {
    createWindow();
  }
});
function closeSshSession(winId, tabId) {
  const sessionKey = `${winId}-${tabId}`;
  const conn = sshConnections.get(sessionKey);
  if (conn) {
    if (conn.stream) {
      conn.stream.close();
    }
    conn.client.end();
    sshConnections.delete(sessionKey);
    const win = BrowserWindow.fromId(winId);
    win == null ? void 0 : win.webContents.send("ssh:disconnected", { tabId });
  }
}
function closeLocalTerminal(winId, tabId) {
  const sessionKey = `${winId}-${tabId}`;
  const term = localTerminals.get(sessionKey);
  if (term) {
    term.kill();
    localTerminals.delete(sessionKey);
  }
}
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
        { role: "about" },
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
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click: () => createWindow()
        },
        { type: "separator" },
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
        { role: "paste" }
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
            await shell.openExternal("https://github.com/pjwooo/capyTerm");
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  ipcMain.on("ssh:connect", (event, { tabId, options }) => {
    const win = event.sender.getOwnerBrowserWindow();
    if (!win) return;
    const winId = win.id;
    const sessionKey = `${winId}-${tabId}`;
    if (sshConnections.has(sessionKey)) {
      closeSshSession(winId, tabId);
    }
    const client = new Client();
    const connectionOptions = { ...options };
    if (connectionOptions.privateKeyPath) {
      try {
        let keyPath = connectionOptions.privateKeyPath;
        if (keyPath.startsWith("~/")) {
          keyPath = path.join(app.getPath("home"), keyPath.slice(2));
        }
        connectionOptions.privateKey = fs.readFileSync(keyPath, "utf8");
      } catch (err) {
        win.webContents.send("ssh:error", { tabId, error: `Failed to read private key: ${err.message}` });
        return;
      }
    }
    client.on("ready", () => {
      win.webContents.send("ssh:connected", { tabId });
      client.shell((err, stream) => {
        if (err) {
          win.webContents.send("ssh:error", { tabId, error: err.message });
          return;
        }
        sshConnections.set(sessionKey, { client, stream });
        stream.on("data", (data) => win.webContents.send("ssh:data", { tabId, data: data.toString() }));
        stream.on("close", () => closeSshSession(winId, tabId));
        stream.stderr.on("data", (data) => win.webContents.send("ssh:error", { tabId, error: data.toString() }));
      });
    }).on("error", (err) => {
      win.webContents.send("ssh:error", { tabId, error: err.message });
      closeSshSession(winId, tabId);
    }).on("close", () => {
      closeSshSession(winId, tabId);
    }).connect(connectionOptions);
  });
  ipcMain.on("ssh:data", (event, { tabId, data }) => {
    var _a, _b, _c;
    const winId = (_a = event.sender.getOwnerBrowserWindow()) == null ? void 0 : _a.id;
    if (winId) {
      const sessionKey = `${winId}-${tabId}`;
      (_c = (_b = sshConnections.get(sessionKey)) == null ? void 0 : _b.stream) == null ? void 0 : _c.write(data);
    }
  });
  ipcMain.on("ssh:resize", (event, { tabId, size }) => {
    var _a, _b, _c;
    const winId = (_a = event.sender.getOwnerBrowserWindow()) == null ? void 0 : _a.id;
    if (winId) {
      const sessionKey = `${winId}-${tabId}`;
      (_c = (_b = sshConnections.get(sessionKey)) == null ? void 0 : _b.stream) == null ? void 0 : _c.setWindow(size.rows, size.cols, 90, 90);
    }
  });
  ipcMain.on("ssh:disconnect", (event, { tabId }) => {
    var _a;
    const winId = (_a = event.sender.getOwnerBrowserWindow()) == null ? void 0 : _a.id;
    if (winId) {
      closeSshSession(winId, tabId);
    }
  });
  ipcMain.on("local-terminal:spawn", (event, { tabId }) => {
    const win = event.sender.getOwnerBrowserWindow();
    if (!win) return;
    const winId = win.id;
    const sessionKey = `${winId}-${tabId}`;
    const ptyProcess = pty.spawn(shellPath, [], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env
    });
    ptyProcess.onData((data) => {
      win.webContents.send("local-terminal:data", { tabId, data });
    });
    ptyProcess.onExit(() => {
      closeLocalTerminal(winId, tabId);
    });
    localTerminals.set(sessionKey, ptyProcess);
  });
  ipcMain.on("local-terminal:data", (event, { tabId, data }) => {
    var _a, _b;
    const winId = (_a = event.sender.getOwnerBrowserWindow()) == null ? void 0 : _a.id;
    if (winId) {
      const sessionKey = `${winId}-${tabId}`;
      (_b = localTerminals.get(sessionKey)) == null ? void 0 : _b.write(data);
    }
  });
  ipcMain.on("local-terminal:resize", (event, { tabId, size }) => {
    var _a, _b;
    const winId = (_a = event.sender.getOwnerBrowserWindow()) == null ? void 0 : _a.id;
    if (winId) {
      const sessionKey = `${winId}-${tabId}`;
      (_b = localTerminals.get(sessionKey)) == null ? void 0 : _b.resize(size.cols, size.rows);
    }
  });
  ipcMain.on("local-terminal:disconnect", (event, { tabId }) => {
    var _a;
    const winId = (_a = event.sender.getOwnerBrowserWindow()) == null ? void 0 : _a.id;
    if (winId) {
      closeLocalTerminal(winId, tabId);
    }
  });
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
