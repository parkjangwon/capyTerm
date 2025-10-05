import { app as u, shell as I, Menu as $, ipcMain as h, BrowserWindow as d } from "electron";
import { fileURLToPath as W } from "node:url";
import p from "node:path";
import O from "node:fs";
import { Client as j } from "ssh2";
import * as k from "node-pty";
import K from "os";
const L = K.platform() === "win32" ? "powershell.exe" : process.env.SHELL || "bash";
u.setName("capyTerm");
const _ = p.dirname(W(import.meta.url));
process.env.APP_ROOT = p.join(_, "..");
const v = process.env.VITE_DEV_SERVER_URL, A = p.join(process.env.APP_ROOT, "dist-electron"), R = p.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = v ? p.join(process.env.APP_ROOT, "public") : R;
const E = /* @__PURE__ */ new Set(), w = /* @__PURE__ */ new Map(), y = /* @__PURE__ */ new Map();
function P() {
  const i = new d({
    icon: p.join(process.env.VITE_PUBLIC, "icon.png"),
    webPreferences: {
      preload: p.join(_, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1
    }
  });
  E.add(i), i.on("closed", () => {
    const m = i.id;
    for (const r of w.keys())
      if (r.startsWith(`${m}-`)) {
        const e = w.get(r);
        e == null || e.client.end(), w.delete(r);
      }
    for (const r of y.keys())
      if (r.startsWith(`${m}-`)) {
        const e = y.get(r);
        e == null || e.kill(), y.delete(r);
      }
    E.delete(i);
  }), v ? i.loadURL(v) : i.loadFile(p.join(R, "index.html"));
}
u.on("window-all-closed", () => {
  process.platform !== "darwin" && u.quit();
});
u.on("activate", () => {
  E.size === 0 && P();
});
function g(i, m) {
  const r = `${i}-${m}`, e = w.get(r);
  if (e) {
    e.stream && e.stream.close(), e.client.end(), w.delete(r);
    const o = d.fromId(i);
    o == null || o.webContents.send("ssh:disconnected", { tabId: m });
  }
}
function T(i, m) {
  const r = `${i}-${m}`, e = y.get(r);
  e && (e.kill(), y.delete(r));
}
u.whenReady().then(() => {
  process.platform === "darwin" && u.dock.setIcon(p.join(process.env.VITE_PUBLIC, "icon.png")), P();
  const i = process.platform === "darwin", m = [
    ...i ? [{
      label: u.getName(),
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
          click: () => P()
        },
        { type: "separator" },
        i ? { role: "close" } : { role: "quit" }
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
            await I.openExternal("https://github.com/pjwooo/capyTerm");
          }
        }
      ]
    }
  ], r = $.buildFromTemplate(m);
  $.setApplicationMenu(r), h.on("ssh:connect", (e, { tabId: o, options: s }) => {
    const n = d.fromWebContents(e.sender);
    if (!n) return;
    const t = n.id, c = `${t}-${o}`;
    w.has(c) && g(t, o);
    const l = new j(), f = { ...s };
    if (f.privateKeyPath)
      try {
        let a = f.privateKeyPath;
        a.startsWith("~/") && (a = p.join(u.getPath("home"), a.slice(2))), f.privateKey = O.readFileSync(a, "utf8");
      } catch (a) {
        n.webContents.send("ssh:error", { tabId: o, error: `Failed to read private key: ${a.message}` });
        return;
      }
    l.on("ready", () => {
      n.webContents.send("ssh:connected", { tabId: o }), l.shell((a, C) => {
        if (a) {
          n.webContents.send("ssh:error", { tabId: o, error: a.message });
          return;
        }
        w.set(c, { client: l, stream: C }), C.on("data", (b) => n.webContents.send("ssh:data", { tabId: o, data: b.toString() })), C.on("close", () => g(t, o)), C.stderr.on("data", (b) => n.webContents.send("ssh:error", { tabId: o, error: b.toString() }));
      });
    }).on("error", (a) => {
      n.webContents.send("ssh:error", { tabId: o, error: a.message }), g(t, o);
    }).on("close", () => {
      g(t, o);
    }).connect(f);
  }), h.on("ssh:data", (e, { tabId: o, data: s }) => {
    var t, c;
    const n = d.fromWebContents(e.sender);
    if (n) {
      const f = `${n.id}-${o}`;
      (c = (t = w.get(f)) == null ? void 0 : t.stream) == null || c.write(s);
    }
  }), h.on("ssh:resize", (e, { tabId: o, size: s }) => {
    var t, c;
    const n = d.fromWebContents(e.sender);
    if (n) {
      const f = `${n.id}-${o}`;
      (c = (t = w.get(f)) == null ? void 0 : t.stream) == null || c.setWindow(s.rows, s.cols, 90, 90);
    }
  }), h.on("ssh:disconnect", (e, { tabId: o }) => {
    const s = d.fromWebContents(e.sender);
    if (s) {
      const n = s.id;
      g(n, o);
    }
  }), h.on("local-terminal:spawn", (e, { tabId: o }) => {
    const s = d.fromWebContents(e.sender);
    if (!s) return;
    const n = s.id, t = `${n}-${o}`, c = k.spawn(L, [], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env
    });
    c.onData((l) => {
      s.webContents.send("local-terminal:data", { tabId: o, data: l });
    }), c.onExit(() => {
      T(n, o);
    }), y.set(t, c);
  }), h.on("local-terminal:data", (e, { tabId: o, data: s }) => {
    var t;
    const n = d.fromWebContents(e.sender);
    if (n) {
      const l = `${n.id}-${o}`;
      (t = y.get(l)) == null || t.write(s);
    }
  }), h.on("local-terminal:resize", (e, { tabId: o, size: s }) => {
    var t;
    const n = d.fromWebContents(e.sender);
    if (n) {
      const l = `${n.id}-${o}`;
      (t = y.get(l)) == null || t.resize(s.cols, s.rows);
    }
  }), h.on("local-terminal:disconnect", (e, { tabId: o }) => {
    const s = d.fromWebContents(e.sender);
    if (s) {
      const n = s.id;
      T(n, o);
    }
  });
});
export {
  A as MAIN_DIST,
  R as RENDERER_DIST,
  v as VITE_DEV_SERVER_URL
};
