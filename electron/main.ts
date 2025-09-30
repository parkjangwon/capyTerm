import { app, BrowserWindow, ipcMain, Menu, shell, safeStorage } from 'electron';
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { Client } from 'ssh2'

app.setName('capyTerm')

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

class SshSession {
  client: Client;
  stream: Client.Shell | null = null;
  tabs: Set<number>;

  constructor(initialTabId: number, options: any) {
    this.tabs = new Set([initialTabId]);
    this.client = new Client();

    this.client.on('ready', () => {
      this.sendStatusToAll('connected');

      this.client.shell((err, stream) => {
        if (err) {
          this.sendErrorToAll(err.message);
          return;
        }
        this.stream = stream;
        this.stream.on('data', (data) => this.sendDataToAll(data.toString()));
        this.stream.on('close', () => this.closeSession());
        this.stream.stderr.on('data', (data) => this.sendErrorToAll(data.toString()));
      });
    }).on('error', (err) => {
      this.sendErrorToAll(err.message);
      this.closeSession();
    }).on('close', () => {
      this.closeSession();
    }).connect(options);
  }

  addTab(tabId: number) {
    this.tabs.add(tabId);
  }

  removeTab(tabId: number) {
    this.tabs.delete(tabId);
    if (this.tabs.size === 0) {
      this.client.end();
    }
  }

  closeSession() {
    this.sendStatusToAll('closed');
    this.tabs.forEach(tabId => sessions.delete(tabId));
  }

  sendDataToAll(data: string) {
    this.tabs.forEach(tabId => {
      win?.webContents.send('ssh:data', { tabId, data });
    });
  }

  sendStatusToAll(status: string) {
    this.tabs.forEach(tabId => {
      win?.webContents.send('ssh:status', { tabId, status });
    });
  }

  sendErrorToAll(message: string) {
    this.tabs.forEach(tabId => {
      win?.webContents.send('ssh:error', { tabId, message });
    });
  }
}

const sessions = new Map<number, SshSession>();

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(process.env.VITE_PUBLIC, 'icon.png'));
  }
  createWindow()

  // ---- Application Menu with Preferences (CmdOrCtrl+,) ----
  const isMac = process.platform === 'darwin'
  const template: any[] = [
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        {
          label: 'Preferences…',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            win?.webContents.send('settings:open')
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        ...(isMac ? [] : [{
          label: 'Preferences…',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            win?.webContents.send('settings:open')
          }
        }]),
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          { label: 'Speech', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://www.electronjs.org')
          }
        }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  ipcMain.on('ssh:connect', (_, { tabId, options }) => {
    if (sessions.has(tabId)) {
      sessions.get(tabId)?.removeTab(tabId);
    }
    const session = new SshSession(tabId, options);
    sessions.set(tabId, session);
  });

  ipcMain.on('ssh:duplicate-session', (_, { originalTabId, newTabId }) => {
    const session = sessions.get(originalTabId);
    if (session) {
      session.addTab(newTabId);
      sessions.set(newTabId, session);
      session.sendStatusToAll('connected');
    }
  });

  ipcMain.on('ssh:data', (_, { tabId, data }) => {
    sessions.get(tabId)?.stream?.write(data);
  });

  ipcMain.on('ssh:resize', (_, { tabId, rows, cols }) => {
    sessions.get(tabId)?.stream?.setWindow(rows, cols, 90, 90);
  });

  ipcMain.on('ssh:disconnect', (_, { tabId }) => {
    const session = sessions.get(tabId);
    if (session) {
      session.removeTab(tabId);
    }
  });

  // ---- Settings file read/write handlers ----
  // Store settings in user's home directory
  const homeSettingsPath = path.join(app.getPath('home'), 'capyTermSetting.json')
  const legacySettingsPath = path.join(app.getPath('userData'), 'capyTermSetting.json')
  // One-time migration from legacy location to home directory
  try {
    if (fs.existsSync(legacySettingsPath) && !fs.existsSync(homeSettingsPath)) {
      fs.copyFileSync(legacySettingsPath, homeSettingsPath)
    }
  } catch {}
  const settingsFilePath = homeSettingsPath

  function readSettings(): any {
    try {
      if (!fs.existsSync(settingsFilePath)) {
        const defaults = {
          theme: 'dark',
          sshSessionFolders: [],
          sshSessions: []
        }
        fs.writeFileSync(settingsFilePath, JSON.stringify(defaults, null, 2), 'utf-8')
        return defaults
      }
      const raw = fs.readFileSync(settingsFilePath, 'utf-8')
      const parsed = JSON.parse(raw)
      // Decrypt any safeStorage fields for in-memory use
      if (Array.isArray(parsed.sshSessions)) {
        parsed.sshSessions = parsed.sshSessions.map((s: any) => {
          if (s.auth && s.auth.method === 'password' && s.auth.password && s.auth.password.__encrypted) {
            try {
              const decrypted = safeStorage.decryptString(Buffer.from(s.auth.password.data, 'base64'))
              return { ...s, auth: { ...s.auth, password: decrypted, __encrypted: false } }
            } catch {
              return { ...s, auth: { ...s.auth, password: '', __encrypted: false } }
            }
          }
          return s
        })
      }
      return parsed
    } catch (e) {
      return { theme: 'dark', sshSessionFolders: [], sshSessions: [] }
    }
  }

  function writeSettings(settings: any) {
    const toPersist = JSON.parse(JSON.stringify(settings))
    // Encrypt password fields before persisting
    if (Array.isArray(toPersist.sshSessions)) {
      toPersist.sshSessions = toPersist.sshSessions.map((s: any) => {
        if (s.auth && s.auth.method === 'password' && typeof s.auth.password === 'string' && s.auth.password.length > 0) {
          try {
            const encrypted = safeStorage.encryptString(s.auth.password)
            return { ...s, auth: { ...s.auth, password: { __encrypted: true, data: Buffer.from(encrypted).toString('base64') } } }
          } catch {
            return { ...s, auth: { ...s.auth, password: '' } }
          }
        }
        return s
      })
    }
    fs.writeFileSync(settingsFilePath, JSON.stringify(toPersist, null, 2), 'utf-8')
  }

  ipcMain.handle('settings:read', () => {
    return readSettings()
  })

  ipcMain.handle('settings:write', (_, settings: any) => {
    try {
      writeSettings(settings)
      return { ok: true, path: settingsFilePath }
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e), path: settingsFilePath }
    }
  })

  ipcMain.handle('settings:path', () => settingsFilePath)
});
