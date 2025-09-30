import { ipcRenderer, contextBridge } from 'electron';

const validChannels = ['ssh:data', 'ssh:status', 'ssh:error', 'settings:open'];

contextBridge.exposeInMainWorld('ssh', {
  connect: (tabId: number, options: any) => ipcRenderer.send('ssh:connect', { tabId, options }),
  sendData: (tabId: number, data: string) => ipcRenderer.send('ssh:data', { tabId, data }),
  resize: (tabId: number, size: { rows: number, cols: number }) => ipcRenderer.send('ssh:resize', { tabId, ...size }),
  disconnect: (tabId: number) => ipcRenderer.send('ssh:disconnect', { tabId }),
  duplicateSession: (originalTabId: number, newTabId: number) => ipcRenderer.send('ssh:duplicate-session', { originalTabId, newTabId }),
  on: (channel: string, func: (...args: any[]) => void) => {
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      const subscription = (event: any, ...args: any[]) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  },
    removeAllListeners: (channel: string) => {
      if (validChannels.includes(channel)) {
        ipcRenderer.removeAllListeners(channel);
      }
    },
  });

contextBridge.exposeInMainWorld('settings', {
  read: () => ipcRenderer.invoke('settings:read'),
  write: (settings: any) => ipcRenderer.invoke('settings:write', settings),
  path: () => ipcRenderer.invoke('settings:path'),
  onOpen: (handler: () => void) => {
    const subscription = () => handler()
    ipcRenderer.on('settings:open', subscription)
    return () => ipcRenderer.removeListener('settings:open', subscription)
  }
});