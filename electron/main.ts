import { app, BrowserWindow, ipcMain } from 'electron';
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
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
});
