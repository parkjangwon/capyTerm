import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('ssh', {
  connect: (tabId: number, options: any) => ipcRenderer.send('ssh:connect', { tabId, options }),
  sendData: (tabId: number, data: string) => ipcRenderer.send('ssh:data', { tabId, data }),
  resize: (tabId: number, size: { rows: number, cols: number }) => ipcRenderer.send('ssh:resize', { tabId, size }),
  disconnect: (tabId: number) => ipcRenderer.send('ssh:disconnect', { tabId }),
  
  onData: (func: (args: {tabId: number, data: string}) => void) => {
    const subscription = (_: any, args: {tabId: number, data: string}) => func(args);
    ipcRenderer.on('ssh:data', subscription);
    return () => ipcRenderer.removeListener('ssh:data', subscription);
  },

  onConnected: (func: (args: {tabId: number}) => void) => {
    const subscription = (_: any, args: {tabId: number}) => func(args);
    ipcRenderer.on('ssh:connected', subscription);
    return () => ipcRenderer.removeListener('ssh:connected', subscription);
  },

  onDisconnected: (func: (args: {tabId: number}) => void) => {
    const subscription = (_: any, args: {tabId: number}) => func(args);
    ipcRenderer.on('ssh:disconnected', subscription);
    return () => ipcRenderer.removeListener('ssh:disconnected', subscription);
  },

  onError: (func: (args: {tabId: number, error: string}) => void) => {
    const subscription = (_: any, args: {tabId: number, error: string}) => func(args);
    ipcRenderer.on('ssh:error', subscription);
    return () => ipcRenderer.removeListener('ssh:error', subscription);
  },

  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('ssh:data');
    ipcRenderer.removeAllListeners('ssh:connected');
    ipcRenderer.removeAllListeners('ssh:disconnected');
    ipcRenderer.removeAllListeners('ssh:error');
  },
});

contextBridge.exposeInMainWorld('localTerminal', {
  spawn: (tabId: number) => ipcRenderer.send('local-terminal:spawn', { tabId }),
  sendData: (tabId: number, data: string) => ipcRenderer.send('local-terminal:data', { tabId, data }),
  resize: (tabId: number, size: { rows: number, cols: number }) => ipcRenderer.send('local-terminal:resize', { tabId, size }),
  disconnect: (tabId: number) => ipcRenderer.send('local-terminal:disconnect', { tabId }),

  onData: (func: (args: { tabId: number, data: string }) => void) => {
    const subscription = (_: any, args: { tabId: number, data: string }) => func(args);
    ipcRenderer.on('local-terminal:data', subscription);
    return () => ipcRenderer.removeListener('local-terminal:data', subscription);
  },
});
