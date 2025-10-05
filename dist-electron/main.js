import { app as y, shell as S, Menu as T, ipcMain as f, BrowserWindow as p } from "electron";
import { fileURLToPath as W } from "node:url";
import w from "node:path";
import k from "node:fs";
import { Client as L } from "ssh2";
import * as j from "node-pty";
import E from "os";
const K = E.platform() === "win32" ? "cmd.exe" : process.env.SHELL || "bash";
y.setName("capyTerm");
const I = w.dirname(W(import.meta.url));
process.env.APP_ROOT = w.join(I, "..");
const P = process.env.VITE_DEV_SERVER_URL, F = w.join(process.env.APP_ROOT, "dist-electron"), O = w.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = P ? w.join(process.env.APP_ROOT, "public") : O;
const $ = /* @__PURE__ */ new Set(), h = /* @__PURE__ */ new Map(), C = /* @__PURE__ */ new Map();
function R() {
  const c = new p({
    icon: w.join(process.env.VITE_PUBLIC, "icon.png"),
    webPreferences: {
      preload: w.join(I, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1
    }
  });
  $.add(c), c.on("closed", () => {
    const m = c.id;
    for (const i of h.keys())
      if (i.startsWith(`${m}-`)) {
        const r = h.get(i);
        r == null || r.client.end(), h.delete(i);
      }
    for (const i of C.keys())
      if (i.startsWith(`${m}-`)) {
        const r = C.get(i);
        r == null || r.kill(), C.delete(i);
      }
    $.delete(c);
  }), P ? c.loadURL(P) : c.loadFile(w.join(O, "index.html"));
}
y.on("window-all-closed", () => {
  process.platform !== "darwin" && y.quit();
});
y.on("activate", () => {
  $.size === 0 && R();
});
function b(c, m) {
  const i = `${c}-${m}`, r = h.get(i);
  if (r) {
    r.stream && r.stream.close(), r.client.end(), h.delete(i);
    const n = p.fromId(c);
    n == null || n.webContents.send("ssh:disconnected", { tabId: m });
  }
}
function _(c, m) {
  const i = `${c}-${m}`, r = C.get(i);
  r && (r.kill(), C.delete(i));
}
y.whenReady().then(() => {
  process.platform === "darwin" && y.dock.setIcon(w.join(process.env.VITE_PUBLIC, "icon.png")), R();
  const c = process.platform === "darwin", m = [
    {
      label: "New Window",
      accelerator: "CmdOrCtrl+N",
      click: () => R()
    },
    {
      label: "Close",
      accelerator: "CmdOrCtrl+W",
      click: (n, e) => {
        e == null || e.webContents.send("close-active-tab-or-window");
      }
    }
  ];
  c || m.push(
    { type: "separator" },
    { role: "quit" }
  );
  const i = [
    ...c ? [{
      label: y.getName(),
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
      submenu: m
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
            await S.openExternal("https://github.com/pjwooo/capyTerm");
          }
        }
      ]
    }
  ], r = T.buildFromTemplate(i);
  T.setApplicationMenu(r), f.on("close-window", (n) => {
    const e = p.fromWebContents(n.sender);
    e && e.close();
  }), f.on("ssh:connect", (n, { tabId: e, options: s }) => {
    const o = p.fromWebContents(n.sender);
    if (!o) return;
    const t = o.id, l = `${t}-${e}`;
    h.has(l) && b(t, e);
    const a = new L(), u = { ...s };
    if (u.privateKeyPath)
      try {
        let d = u.privateKeyPath;
        d.startsWith("~/") && (d = w.join(y.getPath("home"), d.slice(2))), u.privateKey = k.readFileSync(d, "utf8");
      } catch (d) {
        o.webContents.send("ssh:error", { tabId: e, error: `Failed to read private key: ${d.message}` });
        return;
      }
    a.on("ready", () => {
      o.webContents.send("ssh:connected", { tabId: e }), a.shell((d, g) => {
        if (d) {
          o.webContents.send("ssh:error", { tabId: e, error: d.message });
          return;
        }
        h.set(l, { client: a, stream: g }), g.on("data", (v) => o.webContents.send("ssh:data", { tabId: e, data: v.toString() })), g.on("close", () => b(t, e)), g.stderr.on("data", (v) => o.webContents.send("ssh:error", { tabId: e, error: v.toString() }));
      });
    }).on("error", (d) => {
      o.webContents.send("ssh:error", { tabId: e, error: d.message }), b(t, e);
    }).on("close", () => {
      b(t, e);
    }).connect(u);
  }), f.on("ssh:data", (n, { tabId: e, data: s }) => {
    var t, l;
    const o = p.fromWebContents(n.sender);
    if (o) {
      const u = `${o.id}-${e}`;
      (l = (t = h.get(u)) == null ? void 0 : t.stream) == null || l.write(s);
    }
  }), f.on("ssh:resize", (n, { tabId: e, size: s }) => {
    var t, l;
    const o = p.fromWebContents(n.sender);
    if (o) {
      const u = `${o.id}-${e}`;
      (l = (t = h.get(u)) == null ? void 0 : t.stream) == null || l.setWindow(s.rows, s.cols, 90, 90);
    }
  }), f.on("ssh:disconnect", (n, { tabId: e }) => {
    const s = p.fromWebContents(n.sender);
    if (s) {
      const o = s.id;
      b(o, e);
    }
  }), f.on("local-terminal:spawn", (n, { tabId: e }) => {
    if (E.platform() === "win32") return;
    const s = p.fromWebContents(n.sender);
    if (!s) return;
    const o = s.id, t = `${o}-${e}`, l = j.spawn(K, [], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: E.platform() === "win32" ? process.env.USERPROFILE : process.env.HOME,
      env: process.env
    });
    l.onData((a) => {
      s.webContents.send("local-terminal:data", { tabId: e, data: a });
    }), l.onExit(() => {
      _(o, e);
    }), C.set(t, l);
  }), f.on("local-terminal:data", (n, { tabId: e, data: s }) => {
    var t;
    const o = p.fromWebContents(n.sender);
    if (o) {
      const a = `${o.id}-${e}`;
      (t = C.get(a)) == null || t.write(s);
    }
  }), f.on("local-terminal:resize", (n, { tabId: e, size: s }) => {
    var t;
    const o = p.fromWebContents(n.sender);
    if (o) {
      const a = `${o.id}-${e}`;
      (t = C.get(a)) == null || t.resize(s.cols, s.rows);
    }
  }), f.on("local-terminal:disconnect", (n, { tabId: e }) => {
    const s = p.fromWebContents(n.sender);
    if (s) {
      const o = s.id;
      _(o, e);
    }
  });
});
export {
  F as MAIN_DIST,
  O as RENDERER_DIST,
  P as VITE_DEV_SERVER_URL
};
