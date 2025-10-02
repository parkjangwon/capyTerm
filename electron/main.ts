import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { Client as SshClient } from 'ssh2'
import type { Client, ClientChannel } from 'ssh2'

app.setName('capyTerm')
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const windows = new Set<BrowserWindow>()
const sshConnections = new Map<string, { client: Client, stream: ClientChannel | null }>();

function createWindow() {
  const win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  windows.add(win);

  win.on('closed', () => {
    const winId = win.id;
    // Close all SSH connections associated with this window
    for (const key of sshConnections.keys()) {
      if (key.startsWith(`${winId}-`)) {
        const conn = sshConnections.get(key);
        conn?.client.end();
        sshConnections.delete(key);
      }
    }
    windows.delete(win);
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (windows.size === 0) {
    createWindow()
  }
})

function closeSshSession(winId: number, tabId: number) {
  const sessionKey = `${winId}-${tabId}`;
  const conn = sshConnections.get(sessionKey);
  if (conn) {
    if (conn.stream) {
      conn.stream.close();
    }
    conn.client.end();
    sshConnections.delete(sessionKey);
    const win = BrowserWindow.fromId(winId);
    win?.webContents.send('ssh:disconnected', { tabId });
  }
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(process.env.VITE_PUBLIC, 'icon.png'));
  }
  createWindow()

  const isMac = process.platform === 'darwin'
  const template: any[] = [
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' },
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
        { 
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow()
        },
        { type: 'separator' },
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
            await shell.openExternal('https://github.com/pjwooo/capyTerm')
          }
        }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  ipcMain.on('ssh:connect', (event, { tabId, options }) => {
    const win = event.sender.getOwnerBrowserWindow();
    if (!win) return;
    const winId = win.id;
    const sessionKey = `${winId}-${tabId}`;

    if (sshConnections.has(sessionKey)) {
      closeSshSession(winId, tabId);
    }
    
    const client = new SshClient();
    const connectionOptions = { ...options };

    if (connectionOptions.privateKeyPath) {
      try {
        let keyPath = connectionOptions.privateKeyPath;
        if (keyPath.startsWith('~/')) {
          keyPath = path.join(app.getPath('home'), keyPath.slice(2));
        }
        connectionOptions.privateKey = fs.readFileSync(keyPath, 'utf8');
      } catch (err: any) {
        win.webContents.send('ssh:error', { tabId, error: `Failed to read private key: ${err.message}` });
        return;
      }
    }

    client.on('ready', () => {
      win.webContents.send('ssh:connected', { tabId });
      client.shell((err, stream) => {
        if (err) {
          win.webContents.send('ssh:error', { tabId, error: err.message });
          return;
        }
        sshConnections.set(sessionKey, { client, stream });
        stream.on('data', (data: Buffer) => win.webContents.send('ssh:data', { tabId, data: data.toString() }));
        stream.on('close', () => closeSshSession(winId, tabId));
        stream.stderr.on('data', (data: Buffer) => win.webContents.send('ssh:error', { tabId, error: data.toString() }));
      });
    }).on('error', (err) => {
      win.webContents.send('ssh:error', { tabId, error: err.message });
      closeSshSession(winId, tabId);
    }).on('close', () => {
      closeSshSession(winId, tabId);
    }).connect(connectionOptions);
  });

  ipcMain.on('ssh:data', (event, { tabId, data }) => {
    const winId = event.sender.getOwnerBrowserWindow()?.id;
    if (winId) {
      const sessionKey = `${winId}-${tabId}`;
      sshConnections.get(sessionKey)?.stream?.write(data);
    }
  });

  ipcMain.on('ssh:resize', (event, { tabId, size }) => {
    const winId = event.sender.getOwnerBrowserWindow()?.id;
    if (winId) {
      const sessionKey = `${winId}-${tabId}`;
      sshConnections.get(sessionKey)?.stream?.setWindow(size.rows, size.cols, 90, 90);
    }
  });

  ipcMain.on('ssh:disconnect', (event, { tabId }) => {
    const winId = event.sender.getOwnerBrowserWindow()?.id;
    if (winId) {
      closeSshSession(winId, tabId);
    }
  });
});